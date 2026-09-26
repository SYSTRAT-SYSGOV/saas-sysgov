<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\Modalidade;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\TurmaService;

final class TurmaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly TurmaService $turmas,
    ) {}

    public function index(Curso $curso): JsonResponse
    {
        $this->authorize('view', $curso);

        $turmas = $curso->turmas()->with('instrutores:id,name')->orderBy('data_inicio')->get()
            ->map(fn (Turma $t): array => $this->resumo($t));

        return response()->json($turmas);
    }

    /** Turmas em que o usuário logado é instrutor designado. */
    public function minhas(Request $request): JsonResponse
    {
        $turmas = Turma::query()
            ->whereHas('instrutores', fn ($q) => $q->where('users.id', $request->user()->id))
            ->with(['curso:id,titulo,tipo,carga_horaria_minutos', 'instrutores:id,name'])
            ->orderByDesc('data_inicio')
            ->get()
            ->map(fn (Turma $t): array => $this->resumo($t));

        return response()->json($turmas);
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());
        $instrutores = $dados['instrutores'];
        unset($dados['instrutores']);

        return $this->executar(fn () => response()->json($this->turmas->criar($curso, $dados, $instrutores), 201));
    }

    public function show(Turma $turma): JsonResponse
    {
        $this->authorize('view', $turma);
        $turma->load(['curso', 'instrutores:id,name,email', 'agendamentos.aula']);

        return response()->json([...$turma->toArray(), ...$this->contagens($turma)]);
    }

    public function update(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('update', $turma);
        $dados = $request->validate($this->regras(parcial: true));
        $instrutores = $dados['instrutores'] ?? null;
        unset($dados['instrutores']);

        return $this->executar(fn () => response()->json($this->turmas->atualizar($turma, $dados, $instrutores)));
    }

    public function cancelar(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('update', $turma);
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:500']]);

        return $this->executar(fn () => response()->json($this->turmas->cancelar($turma, $request->user(), $dados['motivo'])));
    }

    public function agendar(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);
        $dados = $request->validate([
            'aula_id' => ['required', 'integer'],
            'inicio' => ['required', 'date'],
            'fim' => ['required', 'date'],
        ]);
        $aula = Aula::query()->findOrFail($dados['aula_id']);

        return $this->executar(fn () => response()->json($this->turmas->agendar($turma, $aula, $dados['inicio'], $dados['fim'])->load('aula'), 201));
    }

    public function desagendar(AulaAgendamento $agendamento): JsonResponse
    {
        $this->authorize('operar', $agendamento->turma);

        return $this->executar(function () use ($agendamento): JsonResponse {
            $this->turmas->removerAgendamento($agendamento);

            return response()->json(['deleted' => true]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function resumo(Turma $turma): array
    {
        return [...$turma->toArray(), ...$this->contagens($turma)];
    }

    /**
     * @return array{vagas_ocupadas: int, vagas_restantes: int, lista_espera: int}
     */
    private function contagens(Turma $turma): array
    {
        $porStatus = $turma->inscricoes()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $ocupadas = (int) ($porStatus[StatusInscricao::Confirmada->value] ?? 0) + (int) ($porStatus[StatusInscricao::Pendente->value] ?? 0);

        return [
            'vagas_ocupadas' => $ocupadas,
            'vagas_restantes' => max(0, $turma->vagas - $ocupadas),
            'lista_espera' => (int) ($porStatus[StatusInscricao::ListaEspera->value] ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'nome' => [$obrigatorio, 'string', 'max:150'],
            'data_inicio' => [$obrigatorio, 'date'],
            'data_fim' => [$obrigatorio, 'date'],
            'inscricoes_inicio' => [$obrigatorio, 'date'],
            'inscricoes_fim' => [$obrigatorio, 'date'],
            'vagas' => [$obrigatorio, 'integer', 'min:1', 'max:100000'],
            'modalidade' => [$obrigatorio, Rule::enum(Modalidade::class)],
            'local' => ['sometimes', 'nullable', 'string', 'max:255'],
            'link' => ['sometimes', 'nullable', 'url', 'max:500'],
            'aprovacao_manual' => ['sometimes', 'boolean'],
            'instrutores' => [$obrigatorio, 'array', 'min:1'],
            'instrutores.*' => ['integer'],
        ];
    }
}
