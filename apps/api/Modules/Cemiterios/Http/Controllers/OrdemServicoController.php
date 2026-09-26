<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Exumacao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OrdemServico;
use Modules\Cemiterios\Models\Trasladacao;
use Modules\Cemiterios\Services\OperacaoService;
use Modules\Cemiterios\Support\Pdf;

/** Ordens de serviço: consulta, PDF e confirmação de execução em campo (RF-07, RF-10). */
final class OrdemServicoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OperacaoService $operacoes,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $paginador = OrdemServico::with([
            'jazigo:id,codigo,park_id',
            'jazigo.cemiterio:id,nome',
            'inumacao.falecido:id,nome',
            'exumacao.inumacao.falecido:id,nome',
            'trasladacao.inumacao.falecido:id,nome',
        ])
            ->when($request->query('park_id'), fn ($q, $v) => $q->whereHas('jazigo', fn ($jq) => $jq->where('park_id', $v)))
            ->when($request->query('situacao'), fn ($q, $v) => $q->whereIn('situacao', (array) $v))
            ->when($request->query('tipo'), fn ($q, $v) => $q->where('tipo', $v))
            ->when($request->query('equipe'), fn ($q, $v) => $q->where('equipe', 'like', "%{$v}%"))
            ->when($request->query('data_inicio'), fn ($q, $v) => $q->whereDate('agendada_para', '>=', $v))
            ->when($request->query('data_fim'), fn ($q, $v) => $q->whereDate('agendada_para', '<=', $v))
            ->when($request->query('busca'), function ($q, $termo): void {
                $termo = trim((string) $termo);
                $q->where(function ($sub) use ($termo): void {
                    $sub->where('numero', 'like', "%{$termo}%")
                        ->orWhere('observacao', 'like', "%{$termo}%")
                        ->orWhere('equipe', 'like', "%{$termo}%")
                        ->orWhereHas('jazigo', fn ($jq) => $jq->where('codigo', 'like', "%{$termo}%"))
                        ->orWhereHas('inumacao.falecido', fn ($fq) => $fq->where('nome', 'like', "%{$termo}%"))
                        ->orWhereHas('exumacao.inumacao.falecido', fn ($fq) => $fq->where('nome', 'like', "%{$termo}%"))
                        ->orWhereHas('trasladacao.inumacao.falecido', fn ($fq) => $fq->where('nome', 'like', "%{$termo}%"));
                });
            })
            ->orderByDesc('ano')->orderByDesc('numero')
            ->paginate(min((int) $request->query('per_page', 30), 100));

        $paginador->through(function (OrdemServico $ordem): array {
            $dados = $ordem->toArray();
            $dados['falecido'] = $ordem->falecido_nome ?? $this->falecido($ordem);
            return $dados;
        });

        return response()->json($paginador);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $ordem = OrdemServico::with('jazigo.cemiterio:id,nome')->findOrFail($id);

        return response()->json($ordem->toArray() + ['falecido' => $this->falecido($ordem), 'rotulo' => $ordem->rotulo]);
    }

    public function transicao(Request $request, int $id, string $acao): JsonResponse
    {
        $this->autorizar($request, $acao === 'cancelar' ? 'cemiterios.operacoes.create' : 'cemiterios.operacoes.executar');
        $dados = $request->validate(['motivo' => [$acao === 'suspender' ? 'required' : 'nullable', 'string', 'max:500']]);

        $ordem = OrdemServico::findOrFail($id);
        $antes = $ordem->toArray();
        $ordem = $this->operacoes->transicao($ordem, $acao, $dados['motivo'] ?? null);
        $this->audit->record('cemiterios', "ordem_servico.{$acao}", "OrdemServico #{$id}", $antes, $ordem->toArray());

        return response()->json($ordem);
    }

    public function pdf(Request $request, int $id): Response
    {
        $this->autorizar($request, 'cemiterios.view');

        $ordem = OrdemServico::findOrFail($id);
        $jazigo = $ordem->plot_id ? Jazigo::with(['cemiterio:id,nome', 'setor:id,codigo'])->find($ordem->plot_id) : null;
        $destino = $ordem->tipo === 'trasladacao' ? Trasladacao::where('service_order_id', $ordem->id)->first() : null;

        return Pdf::download("os-{$ordem->numero}-{$ordem->ano}.pdf", "ORDEM DE SERVIÇO Nº {$ordem->rotulo}", array_values(array_filter([
            'Tipo: ' . mb_strtoupper($ordem->tipo),
            "Situação: {$ordem->situacao}",
            'Cemitério: ' . ($jazigo->cemiterio->nome ?? '-'),
            'Setor/Quadra: ' . ($jazigo->setor->codigo ?? '-') . '   Jazigo: ' . ($jazigo->codigo ?? '-'),
            'Falecido: ' . ($this->falecido($ordem) ?? '-'),
            $destino ? 'Destino: ' . ($destino->plot_destino_id ? 'jazigo ' . Jazigo::find($destino->plot_destino_id)?->codigo : $destino->destino_externo) : null,
            'Agendada para: ' . ($ordem->agendada_para?->format('d/m/Y H:i') ?? 'a definir'),
            'Equipe: ' . ($ordem->equipe ?? '-'),
            'Observações: ' . ($ordem->observacao ?? '-'),
            '',
            'Execução: ' . ($ordem->executada_em ? $ordem->executada_em->format('d/m/Y H:i') : '____/____/______  ____:____'),
            '',
            'Assinatura do responsável: ________________________________________',
        ], fn ($l) => $l !== null)));
    }

    private function falecido(OrdemServico $ordem): ?string
    {
        $inumacao = match ($ordem->tipo) {
            'inumacao' => Inumacao::where('service_order_id', $ordem->id)->first(),
            'exumacao' => Exumacao::where('service_order_id', $ordem->id)->first()?->inumacao,
            'trasladacao' => Trasladacao::where('service_order_id', $ordem->id)->first()?->inumacao,
            default => null,
        };

        return $inumacao?->falecido?->nome;
    }
}
