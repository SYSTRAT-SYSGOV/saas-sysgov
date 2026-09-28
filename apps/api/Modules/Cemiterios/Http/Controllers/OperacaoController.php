<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Exumacao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Trasladacao;
use Modules\Cemiterios\Services\OperacaoService;
use Modules\Cemiterios\Support\Arquivo;

/** Inumação, exumação e trasladação (spec: operacoes; RF-05..RF-10). */
final class OperacaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OperacaoService $operacoes,
        private readonly AuditLogger $audit,
    ) {}

    public function inumacoes(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Inumacao::with([
                'falecido:id,nome,nascimento,falecimento,idade_obito,certidao_numero,certidao_cartorio',
                'jazigo:id,codigo,park_id',
                'ordemServico:id,numero,ano,situacao',
            ])
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->when($request->query('plot_id'), fn ($q, $v) => $q->where('plot_id', $v))
                ->when($request->boolean('revisao_pendente'), fn ($q) => $q->where('revisao_pendente', true))
                ->orderByDesc('sepultado_em')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function inumar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $dados = $request->validate($this->regrasFalecido(true) + [
            'certidao_arquivo' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'plot_id' => ['required', 'integer'],
            'sepultado_em' => ['required', 'date'],
            'tipo' => ['nullable', 'string', 'max:20'],
            'gaveta_numero' => ['nullable', 'integer', 'min:1'],
            'agendada_para' => ['nullable', 'date'],
            'equipe' => ['nullable', 'string', 'max:255'],
            'coveiro_nome' => ['nullable', 'string', 'max:150'],
            'pedreiro_nome' => ['nullable', 'string', 'max:150'],
            'cartorio' => ['nullable', 'string', 'max:200'],
            'medico' => ['nullable', 'string', 'max:200'],
            'autorizado_judicial' => ['sometimes', 'boolean'],
        ]);

        $falecido = $dados['falecido'] + ['certidao_arquivo' => Arquivo::guardar($request->file('certidao_arquivo'), 'certidoes')];
        $inumacao = $this->operacoes->inumar($falecido, $dados);
        $this->audit->record('cemiterios', 'inumacao.created', "Inumacao #{$inumacao->id}", null, $inumacao->toArray());

        return response()->json($inumacao->load(['falecido', 'ordemServico', 'jazigo']), 201);
    }

    public function inumarHistorica(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.historico');

        $dados = $request->validate($this->regrasFalecido(false) + [
            'certidao_arquivo' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'plot_id' => ['required', 'integer'],
            'sepultado_em' => ['required', 'date', 'before:today'],
            'livro_referencia' => ['required', 'string', 'max:255'],
        ]);

        $falecido = $dados['falecido'];
        if ($request->hasFile('certidao_arquivo')) {
            $falecido['certidao_arquivo'] = Arquivo::guardar($request->file('certidao_arquivo'), 'certidoes');
        }

        $inumacao = $this->operacoes->inumarHistorica($falecido, $dados);
        $this->audit->record('cemiterios', 'inumacao.historica', "Inumacao #{$inumacao->id}", null, $inumacao->toArray());

        return response()->json($inumacao->load(['falecido', 'jazigo']), 201);
    }

    public function revisar(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.historico');

        $inumacao = $this->operacoes->revisar(Inumacao::findOrFail($id));
        $this->audit->record('cemiterios', 'inumacao.revisada', "Inumacao #{$id}", ['revisao_pendente' => true], ['revisao_pendente' => false]);

        return response()->json($inumacao);
    }

    public function cancelarInumacao(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $inumacao = Inumacao::findOrFail($id);
        $antes = $inumacao->toArray();
        $inumacao = $this->operacoes->cancelarInumacao($inumacao);
        $this->audit->record('cemiterios', 'inumacao.cancelada', "Inumacao #{$id}", $antes, $inumacao->toArray());

        return response()->json($inumacao->load('jazigo'));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $inumacao = Inumacao::with('falecido')->findOrFail($id);

        $dados = $request->validate([
            'gaveta_numero' => ['nullable', 'integer', 'min:1'],
            'situacao' => ['nullable', 'string', 'max:30'],
            'sepultado_em' => ['sometimes', 'date'],
            'tipo' => ['nullable', 'string', 'max:20'],
            'livro_referencia' => ['nullable', 'string', 'max:255'],
            'coveiro_nome' => ['nullable', 'string', 'max:150'],
            'pedreiro_nome' => ['nullable', 'string', 'max:150'],
            'cartorio' => ['nullable', 'string', 'max:200'],
            'medico' => ['nullable', 'string', 'max:200'],
            'falecido' => ['nullable', 'array'],
            'falecido.nome' => ['sometimes', 'string', 'max:255'],
            'falecido.nascimento' => ['nullable', 'date'],
            'falecido.falecimento' => ['sometimes', 'date', 'before_or_equal:today'],
            'falecido.certidao_numero' => ['nullable', 'string', 'max:60'],
            'falecido.certidao_cartorio' => ['nullable', 'string', 'max:255'],
        ]);

        $antes = $inumacao->toArray();
        $falecidoDados = $dados['falecido'] ?? null;
        unset($dados['falecido']);

        $inumacao->update($dados);

        if ($falecidoDados && $inumacao->falecido) {
            $inumacao->falecido->update(array_filter($falecidoDados, fn ($v) => $v !== null));
        }

        $this->audit->record('cemiterios', 'inumacao.updated', "Inumacao #{$id}", $antes, $inumacao->fresh(['falecido'])->toArray());

        return response()->json($inumacao->fresh(['falecido', 'jazigo', 'ordemServico']));
    }

    public function exumacoes(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Exumacao::with(['inumacao.falecido:id,nome', 'inumacao.jazigo:id,codigo', 'ordemServico:id,numero,ano,situacao'])
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function exumar(Request $request): JsonResponse
    {
        $judicial = $request->input('tipo') === 'judicial';
        $this->autorizar($request, $judicial ? 'cemiterios.exumacao.judicial' : 'cemiterios.operacoes.create');

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(['ordinaria', 'judicial'])],
            'burial_id' => ['required', 'integer'],
            'destino' => ['nullable', 'string', 'max:255'],
            'agendada_para' => ['nullable', 'date'],
            'processo' => [Rule::requiredIf($judicial), 'nullable', 'string', 'max:60'],
            'juizo' => [Rule::requiredIf($judicial), 'nullable', 'string', 'max:255'],
            'data_decisao' => [Rule::requiredIf($judicial), 'nullable', 'date', 'before_or_equal:today'],
            'mandado' => [Rule::requiredIf($judicial), 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $inumacao = Inumacao::findOrFail($dados['burial_id']);
        $exumacao = $judicial
            ? $this->operacoes->exumarJudicial($inumacao, [
                'processo' => $dados['processo'],
                'juizo' => $dados['juizo'],
                'data_decisao' => $dados['data_decisao'],
                'arquivo' => Arquivo::guardar($request->file('mandado'), 'mandados'),
            ], $dados['destino'] ?? null, $dados['agendada_para'] ?? null)
            : $this->operacoes->exumarOrdinaria($inumacao, $dados['destino'] ?? null, $dados['agendada_para'] ?? null);

        $this->audit->record('cemiterios', $judicial ? 'exumacao.judicial' : 'exumacao.created', "Exumacao #{$exumacao->id}", null, $exumacao->toArray());

        return response()->json($exumacao->load('ordemServico'), 201);
    }

    public function trasladacoes(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Trasladacao::with([
                'inumacao.falecido:id,nome',
                'jazigoOrigem:id,codigo,park_id',
                'jazigoDestino:id,codigo,park_id',
            ])
                ->when($request->query('park_id'), function ($q, $v): void {
                    $q->where(function ($sub) use ($v): void {
                        $sub->whereHas('jazigoOrigem', fn ($jq) => $jq->where('park_id', $v))
                            ->orWhereHas('jazigoDestino', fn ($jq) => $jq->where('park_id', $v));
                    });
                })
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function trasladar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $dados = $request->validate([
            'burial_id' => ['required', 'integer'],
            'plot_destino_id' => ['nullable', 'integer', 'required_without:destino_externo'],
            'destino_externo' => ['nullable', 'string', 'max:255', 'required_without:plot_destino_id'],
            'documento_destino' => ['nullable', 'string', 'max:255', 'required_with:destino_externo'],
            'agendada_para' => ['nullable', 'date'],
        ]);

        $trasladacao = $this->operacoes->trasladar(Inumacao::findOrFail($dados['burial_id']), $dados);
        $this->audit->record('cemiterios', 'trasladacao.created', "Trasladacao #{$trasladacao->id}", null, $trasladacao->toArray());

        return response()->json($trasladacao, 201);
    }

    /** @return array<string, list<mixed>> */
    private function regrasFalecido(bool $certidaoObrigatoria): array
    {
        $certidao = $certidaoObrigatoria ? 'required' : 'nullable';

        return [
            'falecido' => ['required', 'array'],
            'falecido.nome' => ['required', 'string', 'max:255'],
            'falecido.nascimento' => ['nullable', 'date', 'before_or_equal:falecido.falecimento'],
            'falecido.falecimento' => ['required', 'date', 'before_or_equal:today'],
            'falecido.certidao_numero' => [$certidao, 'string', 'max:60'],
            'falecido.certidao_cartorio' => [$certidao, 'string', 'max:255'],
            'falecido.causa_morte' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
