<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Preco;
use Modules\Cemiterios\Models\Reajuste;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\Arquivo;
use Modules\Cemiterios\Support\Pdf;

/** Preços, reajustes, guias, baixa manual e inadimplência (spec: financeiro; RF-20..RF-23). */
final class FinanceiroController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly PrecoService $precos,
        private readonly GuiaService $guiasService,
        private readonly AuditLogger $audit,
    ) {}

    public function precos(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $data = $request->query('data') ? CarbonImmutable::parse((string) $request->query('data')) : null;

        return response()->json([
            'vigentes' => collect(Preco::SERVICOS)->mapWithKeys(fn (string $s) => [$s => $this->precos->vigente($s, $data)]),
            'historico' => $this->precos->tabela()->sortByDesc('vigencia_inicio')->values(),
        ]);
    }

    public function storePreco(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $dados = $request->validate([
            'servico' => ['required', Rule::in(Preco::SERVICOS)],
            'valor' => ['required', 'string', 'max:20'],
            'vigencia_inicio' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $preco = $this->precos->novaVigencia($dados['servico'], PrecoService::centavos($dados['valor']), CarbonImmutable::parse($dados['vigencia_inicio']));
        $this->audit->record('cemiterios', 'preco.created', "Preco #{$preco->id}", null, $preco->toArray());

        return response()->json($preco, 201);
    }

    public function reajustes(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        return response()->json(Reajuste::query()->orderByDesc('competencia')->get());
    }

    /** Reajuste manual: alternativa quando a API do índice falha (RF-21). */
    public function reajusteManual(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.reajuste');

        $dados = $request->validate([
            'competencia' => ['required', 'integer', 'min:2000', 'max:2100'],
            'percentual' => ['required', 'string', 'regex:/^-?\d{1,3}(\.\d{1,4})?$/'],
        ]);

        $reajuste = $this->precos->reajustar((int) $dados['competencia'], $dados['percentual'], 'manual', $request->user()->id);
        $this->audit->record('cemiterios', 'preco.reajuste_manual', "Reajuste #{$reajuste->id}", null, $reajuste->toArray());

        return response()->json($reajuste, 201);
    }

    public function guias(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('cemiterios.financeiro.manage')) {
            $this->autorizar($request, 'cemiterios.view');
        }

        return response()->json(
            Guia::query()
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->when($request->query('servico'), fn ($q, $v) => $q->where('servico', $v))
                ->when($request->query('exercicio'), fn ($q, $v) => $q->where('exercicio', $v))
                ->when($request->query('concessao_id'), fn ($q, $v) => $q->where('origem_type', 'concessao')->where('origem_id', $v))
                ->when($request->query('plot_id'), fn ($q, $v) => $q->where(function ($w) use ($v) {
                    $w->where(fn ($sub) => $sub->where('origem_type', 'concessao')
                        ->whereIn('origem_id', Concessao::where('plot_id', $v)->select('id')))
                    ->orWhere(fn ($sub) => $sub->where('origem_type', 'jazigo')->where('origem_id', $v));
                }))
                ->when($request->query('q'), fn ($q, $v) => $q->where(fn ($w) => $w->where('numero', 'like', "%{$v}%")->orWhere('contribuinte_nome', 'like', "%{$v}%")))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function loteAnual(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $dados = $request->validate(['exercicio' => ['sometimes', 'integer', 'min:2000', 'max:2100']]);
        $exercicio = (int) ($dados['exercicio'] ?? now()->year);
        $relatorio = $this->guiasService->loteAnual($exercicio);
        $this->audit->record('cemiterios', 'guia.lote_anual', "Exercicio {$exercicio}", null, $relatorio);

        return response()->json($relatorio);
    }

    public function pdf(Request $request, int $id): Response
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $guia = Guia::findOrFail($id);

        return Pdf::download('guia-' . str_replace('/', '-', $guia->numero) . '.pdf', 'GUIA DE RECOLHIMENTO — CEMITÉRIOS MUNICIPAIS', $this->guiasService->linhasPdf($guia));
    }

    public function segundaVia(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $dados = $request->validate(['vencimento' => ['nullable', 'date', 'after_or_equal:today']]);
        $original = Guia::findOrFail($id);
        $nova = $this->guiasService->segundaVia($original, $dados['vencimento'] ?? null);
        $this->audit->record('cemiterios', 'guia.segunda_via', "Guia #{$nova->id}", $original->toArray(), $nova->toArray());

        return response()->json($nova, 201);
    }

    public function baixa(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $dados = $request->validate([
            'pago_em' => ['required', 'date', 'before_or_equal:today'],
            'valor_pago' => ['required', 'string', 'max:20'],
            'comprovante' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $guia = Guia::findOrFail($id);
        $antes = $guia->toArray();
        $guia = $this->guiasService->baixar(
            $guia, $dados['pago_em'], PrecoService::centavos($dados['valor_pago']),
            Arquivo::guardar($request->file('comprovante'), 'comprovantes'), $request->user()->id,
        );
        $this->audit->record('cemiterios', 'guia.baixa_manual', "Guia #{$id}", $antes, $guia->toArray());

        return response()->json($guia);
    }

    /** Guias emitidas e vencidas, filtráveis por serviço, exercício e cemitério. */
    public function inadimplencia(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.financeiro.manage');

        $guias = Guia::query()
            ->where('situacao', 'emitida')
            ->whereDate('vencimento', '<', today()->toDateString())
            ->when($request->query('servico'), fn ($q, $v) => $q->where('servico', $v))
            ->when($request->query('exercicio'), fn ($q, $v) => $q->where('exercicio', $v))
            ->when($request->query('parque'), fn ($q, $v) => $q->where('origem_type', 'concessao')->whereIn(
                'origem_id',
                Concessao::whereHas('jazigo', fn ($j) => $j->where('park_id', $v))->select('id')
            ))
            ->orderBy('vencimento')
            ->get();

        return response()->json(['total_centavos' => (int) $guias->sum('valor_centavos'), 'quantidade' => $guias->count(), 'guias' => $guias]);
    }
}
