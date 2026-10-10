<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\Escola\Http\Resources\AlunoResource;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Pedagogico\Services\EscopoProfessor;

/** Turmas e alunos vistos pelo módulo Pedagógico, já com o escopo do professor aplicado. */
final class TurmaController extends Controller
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    /** Vínculos turma × matéria em que o usuário é o professor. */
    public function minhas(Request $request): JsonResponse
    {
        abort_unless($this->escopo->pode($request->user(), 'pedagogico.view'), 403);

        $vinculos = TurmaMateria::query()
            ->with(['turma.turno', 'materia'])
            ->where('professor_user_id', $request->user()->id)
            ->get()
            ->filter(fn (TurmaMateria $v): bool => $v->turma !== null && $v->materia !== null)
            ->map(fn (TurmaMateria $v): array => [
                'turma_id' => $v->turma_id,
                'turma' => $v->turma->nome,
                'turno' => $v->turma->turno?->nome,
                'ano_letivo' => $v->turma->ano_letivo,
                'materia_id' => $v->materia_id,
                'materia' => $v->materia->nome,
            ])
            ->values();

        return response()->json($vinculos);
    }

    /** Turmas visíveis: todas para a gestão, só as vinculadas para o professor. */
    public function index(Request $request): JsonResponse
    {
        abort_unless($this->escopo->pode($request->user(), 'pedagogico.view'), 403);

        $turmas = $this->escopo->aplicar(Turma::query(), $request->user(), 'id')
            ->with('turno')->withCount('alunos')
            ->orderByDesc('ano_letivo')->orderBy('nome')
            ->get()
            ->map(fn (Turma $t): array => ['id' => $t->id, 'nome' => $t->nome, 'ano_letivo' => $t->ano_letivo, 'turno' => $t->turno?->nome, 'total_alunos' => $t->alunos_count]);

        return response()->json($turmas);
    }

    public function alunos(Request $request, Turma $turma): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('pedagogico.ver-turma', [$turma->id]), 403);

        $alunos = Aluno::query()->where('turma_id', $turma->id)->with('turma.turno')
            ->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->get();

        return response()->json(AlunoResource::collection($alunos));
    }
}
