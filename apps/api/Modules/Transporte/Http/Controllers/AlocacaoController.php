<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Enums\MediacaoDidatica;
use Modules\Transporte\Enums\PoderPublico;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\AlocacaoService;
use Modules\Transporte\Services\OcupacaoService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

/** Alunos de uma rota. Listagens nunca trazem a observação da necessidade especial (design D22); só a ficha, para quem gerencia. */
final class AlocacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AlocacaoService $service,
        private readonly OcupacaoService $ocupacao,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request, Rota $rota): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $todas = $request->boolean('encerradas');

        $alocacoes = Alocacao::query()->with(['aluno.turma.turno', 'parada'])->where('rota_id', $rota->id)
            ->when(!$todas, fn ($q) => $q->whereNull('data_fim'))
            ->orderByRaw('data_fim is not null')->orderBy('id')->get();

        return response()->json([
            'data' => $alocacoes->map(fn (Alocacao $a): array => $this->formata->alocacao($a, $this->escolas($alocacoes)))->values(),
            'ocupacao' => $this->ocupacao->daRota($rota->loadMissing('veiculo')),
        ]);
    }

    /** Busca de alunos ativos do ano letivo da rota, em todas as escolas do tenant (design D24), que ainda não estão nela. */
    public function busca(Request $request, Rota $rota): JsonResponse
    {
        abort_unless($this->policy->gerenciarAlocacoes($request->user()), 403);
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q']);

        $jaNaRota = Alocacao::query()->where('rota_id', $rota->id)->whereNull('data_fim')->select('aluno_id');
        $alunos = Aluno::query()->withoutGlobalScope('escola')->with('turma.turno')
            ->where('situacao', 'ativo')
            ->whereHas('turma', fn ($t) => $t->where('ano_letivo', $rota->ano_letivo))
            ->whereNotIn('id', $jaNaRota)
            ->where(fn ($w) => $w->where('nome', 'like', '%' . mb_strtoupper($q, 'UTF-8') . '%')->orWhere('cgm', $q))
            ->orderBy('nome')->limit(20)->get();
        $escolas = Escola::query()->whereIn('id', $alunos->pluck('escola_id')->unique())->pluck('nome', 'id');

        return response()->json(['data' => $alunos->map(fn (Aluno $a): array => [
            'id' => $a->id,
            'nome' => $a->nome,
            'cgm' => $a->cgm,
            'escola' => $escolas[$a->escola_id] ?? null,
            'turma' => $a->turma?->nome,
            'turno' => $a->turma?->turno?->nome,
        ])->values()]);
    }

    public function show(Request $request, Rota $rota, Alocacao $alocacao): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $this->daRota($rota, $alocacao);
        $alocacao->load(['aluno.turma.turno', 'parada']);
        $verObservacao = $this->policy->gerenciarAlocacoes($request->user());
        $dados = $this->formata->alocacao($alocacao, $this->escolas(collect([$alocacao])));

        if ($verObservacao) {
            $dados['necessidade_observacao'] = $alocacao->makeVisible('necessidade_observacao')->necessidade_observacao;
            if ($dados['necessidade_observacao'] !== null) {
                $this->audit->record('transporte', 'alocacao.observacao_lida', "alocacao:{$alocacao->id}", null, ['aluno_id' => $alocacao->aluno_id]);
            }
        }

        return response()->json(['data' => $dados]);
    }

    public function store(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarAlocacoes($request->user()), 403);
        $dados = $request->validate([
            'aluno_id' => ['required', 'integer'],
            'parada_id' => ['required', 'integer', Vinculos::existe('transporte_paradas')],
            'justificativa_excesso' => ['nullable', 'string', 'max:1000'],
            'data_inicio' => ['nullable', 'date'],
            ...$this->regras(),
        ]);
        $aluno = Aluno::query()->withoutGlobalScope('escola')->with('turma')->findOrFail($dados['aluno_id']);
        $pode = $this->policy->excederCapacidade($request->user());

        return $this->executar(function () use ($rota, $aluno, $dados, $pode): JsonResponse {
            $alocacao = $this->service->alocar($rota, $aluno, $dados, $pode)->load(['aluno.turma.turno', 'parada']);

            return response()->json(['data' => $this->formata->alocacao($alocacao, $this->escolas(collect([$alocacao])))], 201);
        });
    }

    public function update(Request $request, Rota $rota, Alocacao $alocacao): Response
    {
        abort_unless($this->policy->gerenciarAlocacoes($request->user()), 403);
        $this->daRota($rota, $alocacao);
        $dados = $request->validate([
            'parada_id' => ['sometimes', 'integer', Vinculos::existe('transporte_paradas')],
            ...$this->regras(),
        ]);

        return $this->executar(function () use ($alocacao, $dados): JsonResponse {
            $atualizada = $this->service->atualizar($alocacao, $dados)->load(['aluno.turma.turno', 'parada']);

            return response()->json(['data' => $this->formata->alocacao($atualizada, $this->escolas(collect([$atualizada])))]);
        });
    }

    public function encerrar(Request $request, Rota $rota, Alocacao $alocacao): Response
    {
        abort_unless($this->policy->gerenciarAlocacoes($request->user()), 403);
        $this->daRota($rota, $alocacao);
        $dados = $request->validate([
            'data_fim' => ['required', 'date'],
            'motivo' => ['required', 'string', 'max:255'],
        ]);

        return $this->executar(function () use ($alocacao, $dados): JsonResponse {
            $encerrada = $this->service->encerrar($alocacao, (string) $dados['data_fim'], (string) $dados['motivo'])->load(['aluno.turma.turno', 'parada']);

            return response()->json(['data' => $this->formata->alocacao($encerrada, $this->escolas(collect([$encerrada])))]);
        });
    }

    private function daRota(Rota $rota, Alocacao $alocacao): void
    {
        abort_unless($alocacao->rota_id === $rota->id, 404);
    }

    /**
     * @param \Illuminate\Support\Collection<int, Alocacao> $alocacoes
     * @return array<int, string>
     */
    private function escolas(\Illuminate\Support\Collection $alocacoes): array
    {
        $ids = $alocacoes->map(fn (Alocacao $a): ?int => $a->aluno?->escola_id)->filter()->unique()->values();

        return Escola::query()->whereIn('id', $ids)->pluck('nome', 'id')->all();
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'usa_transporte_rural' => ['sometimes', 'boolean'],
            'poder_publico' => ['nullable', Rule::in(array_column(PoderPublico::cases(), 'value'))],
            'necessidade_especial' => ['sometimes', 'boolean'],
            'necessidade_observacao' => ['nullable', 'string', 'max:2000'],
            'atendimento_curricular' => ['sometimes', 'boolean'],
            'mediacao_didatica' => ['sometimes', Rule::in(array_column(MediacaoDidatica::cases(), 'value'))],
            'pais_residencia' => ['sometimes', 'string', 'size:2', 'alpha'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
