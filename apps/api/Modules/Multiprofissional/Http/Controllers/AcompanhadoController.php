<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Multiprofissional\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Multiprofissional\Models\Acompanhado;
use Modules\Multiprofissional\Models\Laudo;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;
use Modules\Multiprofissional\Services\AcompanhadoService;
use Modules\Multiprofissional\Support\Formata;
use Modules\Multiprofissional\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

/** Estudantes acompanhados, com condições e laudos restritos a quem acompanha (D7). */
final class AcompanhadoController extends Controller
{
    use RespondeErroDeNegocio;

    private const RELACOES = ['aluno.turma', 'profissionais.cargo', 'condicoes'];

    public function __construct(
        private readonly AcompanhadoService $service,
        private readonly MultiprofissionalPolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->ver($user), 403);
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'escola_id' => ['nullable', 'integer'],
            'condicao_id' => ['nullable', 'integer'],
            'ativos' => ['nullable', 'boolean'],
        ]);
        $clinico = $this->policy->acompanhar($user);

        $lista = Acompanhado::query()->with(self::RELACOES)
            ->whereHas('aluno', function ($q) use ($filtros): void {
                $q->withoutGlobalScope('escola')
                    ->when($filtros['q'] ?? null, fn ($w, $t) => $w->where(fn ($x) => $x->where('nome', 'like', '%' . mb_strtoupper($t, 'UTF-8') . '%')->orWhere('cgm', $t)))
                    ->when($filtros['escola_id'] ?? null, fn ($w, $id) => $w->where('escola_id', $id));
            })
            // Filtrar por condição revela dado clínico: só para quem acompanha.
            ->when($clinico && ($filtros['condicao_id'] ?? null), fn ($q) => $q->whereHas('condicoes', fn ($c) => $c->whereKey($filtros['condicao_id'])))
            ->when(($filtros['ativos'] ?? true) == true, fn ($q) => $q->where('ativo', true))
            ->get()
            ->sortBy(fn (Acompanhado $a) => $a->aluno?->nome)
            ->values();

        return response()->json(['data' => $lista->map(fn (Acompanhado $a): array => $this->formata->acompanhado($a, $clinico))->values()]);
    }

    public function show(Request $request, Acompanhado $acompanhado): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->ver($user), 403);
        $acompanhado->load([...self::RELACOES, 'aluno.contatos', 'laudos.condicao']);

        return response()->json(['data' => $this->formata->acompanhado($acompanhado, $this->policy->acompanhar($user), detalhe: true)]);
    }

    public function store(Request $request): Response
    {
        $user = $request->user();
        abort_unless($this->policy->acompanhar($user), 403);
        $dados = $request->validate([
            'aluno_id' => ['required', 'integer', Vinculos::existe('escola_alunos', comExclusaoLogica: true)],
            ...$this->regras(),
        ]);

        return $this->executar(fn () => response()->json(['data' => ['id' => $this->service->salvar(null, $dados, $user)->id]], 201));
    }

    public function update(Request $request, Acompanhado $acompanhado): Response
    {
        $user = $request->user();
        abort_unless($this->policy->acompanhar($user), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => ['id' => $this->service->salvar($acompanhado, $dados, $user)->id]]));
    }

    public function anexarLaudo(Request $request, Acompanhado $acompanhado): Response
    {
        $user = $request->user();
        abort_unless($this->policy->acompanhar($user), 403);
        $dados = $request->validate([
            'arquivo' => AcompanhadoService::REGRA_LAUDO,
            'descricao' => ['required', 'string', 'max:200'],
            'emitente' => ['nullable', 'string', 'max:200'],
            'emitido_em' => ['nullable', 'date', 'before_or_equal:today'],
            'condicao_id' => ['nullable', 'integer', Vinculos::existe('multi_condicoes')],
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->laudo(
            $this->service->anexarLaudo($acompanhado, $request->file('arquivo'), $dados, $user)->load('condicao')
        )], 201));
    }

    public function arquivoLaudo(Request $request, Acompanhado $acompanhado, int $laudo): Response
    {
        abort_unless($this->policy->acompanhar($request->user()), 403);

        return $this->service->arquivoLaudo($this->laudoDe($acompanhado, $laudo)) ?? abort(404);
    }

    public function removerLaudo(Request $request, Acompanhado $acompanhado, int $laudo): JsonResponse
    {
        abort_unless($this->policy->acompanhar($request->user()), 403);
        $this->service->removerLaudo($this->laudoDe($acompanhado, $laudo));

        return response()->json(null, 204);
    }

    private function laudoDe(Acompanhado $acompanhado, int $id): Laudo
    {
        return Laudo::query()->where('acompanhado_id', $acompanhado->id)->findOrFail($id);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'observacoes' => ['nullable', 'string', 'max:5000'],
            'ativo' => ['sometimes', 'boolean'],
            'profissionais' => ['sometimes', 'array'],
            'profissionais.*.id' => ['required', 'integer', 'distinct', Vinculos::existe('multi_profissionais')],
            'profissionais.*.papel' => ['nullable', 'string', 'max:100'],
            'condicoes' => ['sometimes', 'array'],
            'condicoes.*.id' => ['required', 'integer', 'distinct', Vinculos::existe('multi_condicoes')],
            'condicoes.*.diagnosticado_em' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }
}
