<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Acompanhado;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;
use Modules\Multiprofissional\Services\AtendimentoService;
use Modules\Multiprofissional\Support\Formata;
use Modules\Multiprofissional\Support\Vinculos;

/** Atendimentos: lista com filtros, registro, edição pelo autor ou gestão (D9) e relato sigiloso protegido (D6). */
final class AtendimentoController extends Controller
{
    private const RELACOES = ['equipe', 'autor', 'alunos', 'profissionais', 'tipos'];

    public function __construct(
        private readonly AtendimentoService $service,
        private readonly MultiprofissionalPolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->ver($user), 403);
        $filtros = $request->validate([
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
            'escola_id' => ['nullable', 'integer'],
            'equipe_id' => ['nullable', 'integer'],
            'profissional_id' => ['nullable', 'integer'],
            'aluno_id' => ['nullable', 'integer'],
            'tipo_id' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = $this->filtrar(Atendimento::query(), $filtros)->with(self::RELACOES)
            ->orderByDesc('data_hora')->orderByDesc('id')->paginate((int) ($filtros['per_page'] ?? 30));

        return response()->json([
            'data' => collect($pagina->items())->map(fn (Atendimento $a): array => $this->formatar($a, $request))->values(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    /** Números do painel: atendimentos no mês e no ano, estudantes acompanhados e atendidos no mês. */
    public function indicadores(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $inicioMes = now()->startOfMonth();
        $noMes = Atendimento::query()->where('data_hora', '>=', $inicioMes);

        return response()->json([
            'atendimentos_mes' => (clone $noMes)->count(),
            'atendimentos_ano' => Atendimento::query()->where('data_hora', '>=', now()->startOfYear())->count(),
            'estudantes_atendidos_mes' => DB::table('multi_atendimento_alunos')
                ->whereIn('atendimento_id', (clone $noMes)->select('id'))->distinct()->count('aluno_id'),
            'acompanhados_ativos' => Acompanhado::query()->where('ativo', true)->count(),
        ]);
    }

    public function show(Request $request, Atendimento $atendimento): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);

        return response()->json(['data' => $this->formatar($atendimento->load(self::RELACOES), $request)]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->atender($user), 403);
        $atendimento = $this->service->salvar(null, $request->validate($this->regras()), $user);

        return response()->json(['data' => $this->formatar($atendimento->load(self::RELACOES), $request)], 201);
    }

    public function update(Request $request, Atendimento $atendimento): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->editarAtendimento($user, $atendimento), 403);
        $atendimento = $this->service->salvar($atendimento, $request->validate($this->regras()), $user);

        return response()->json(['data' => $this->formatar($atendimento->load(self::RELACOES), $request)]);
    }

    public function destroy(Request $request, Atendimento $atendimento): JsonResponse
    {
        abort_unless($this->policy->editarAtendimento($request->user(), $atendimento), 403);
        $this->service->excluir($atendimento);

        return response()->json(null, 204);
    }

    /**
     * @param Builder<Atendimento> $query
     * @param array<string, mixed> $f
     * @return Builder<Atendimento>
     */
    private function filtrar(Builder $query, array $f): Builder
    {
        return $query
            ->when($f['de'] ?? null, fn ($q, $d) => $q->where('data_hora', '>=', $d . ' 00:00:00'))
            ->when($f['ate'] ?? null, fn ($q, $d) => $q->where('data_hora', '<=', $d . ' 23:59:59'))
            ->when($f['escola_id'] ?? null, fn ($q, $id) => $q->where('escola_id', $id))
            ->when($f['equipe_id'] ?? null, fn ($q, $id) => $q->where('equipe_id', $id))
            ->when($f['profissional_id'] ?? null, fn ($q, $id) => $q->whereHas('profissionais', fn ($p) => $p->whereKey($id)))
            ->when($f['aluno_id'] ?? null, fn ($q, $id) => $q->whereHas('alunos', fn ($a) => $a->whereKey($id)))
            ->when($f['tipo_id'] ?? null, fn ($q, $id) => $q->whereHas('tipos', fn ($t) => $t->whereKey($id)));
    }

    /** @return array<string, mixed> */
    private function formatar(Atendimento $a, Request $request): array
    {
        $user = $request->user();

        return $this->formata->atendimento($a, $this->policy->verRelato($user, $a), $this->policy->editarAtendimento($user, $a));
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'data_hora' => ['required', 'date', 'before_or_equal:' . now()->addDay()->toDateString()],
            'turno' => ['required', 'string', 'in:' . implode(',', array_keys(Atendimento::TURNOS))],
            'escola_id' => ['required', 'integer', Vinculos::existe('escola_escolas')],
            'equipe_id' => ['nullable', 'integer', Vinculos::existe('multi_equipes')],
            'relato' => ['nullable', 'string', 'max:20000'],
            'sigiloso' => ['sometimes', 'boolean'],
            'alunos' => ['required', 'array', 'min:1'],
            'alunos.*' => ['integer', 'distinct', Vinculos::existe('escola_alunos', comExclusaoLogica: true)],
            'profissionais' => ['required', 'array', 'min:1'],
            'profissionais.*' => ['integer', 'distinct', Vinculos::existe('multi_profissionais')],
            'tipos' => ['required', 'array', 'min:1'],
            'tipos.*' => ['integer', 'distinct', Vinculos::existe('multi_tipos_atendimento')],
        ];
    }
}
