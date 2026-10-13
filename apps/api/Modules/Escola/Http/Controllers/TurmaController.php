<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Http\Requests\SalvarTurmaRequest;
use Modules\Escola\Http\Requests\SincronizarMateriasTurmaRequest;
use Modules\Escola\Http\Resources\TurmaResource;
use Modules\Escola\Models\Turma;
use Modules\Escola\Services\TurmaService;

final class TurmaController extends Controller
{
    public function __construct(private readonly TurmaService $turmas) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Turma::class);

        $turmas = Turma::query()
            ->with(['turno', 'pedagoga', 'vinculos.materia', 'vinculos.professor:id,name'])
            ->withCount('alunos')
            ->when($request->query('turno_id'), fn ($q, $v) => $q->where('turno_id', (int) $v))
            ->when($request->query('ano_letivo'), fn ($q, $v) => $q->where('ano_letivo', (int) $v))
            ->orderByDesc('ano_letivo')
            ->orderBy('nome')
            ->get();

        return response()->json(TurmaResource::collection($turmas));
    }

    public function store(SalvarTurmaRequest $request): JsonResponse
    {
        return response()->json(new TurmaResource($this->turmas->criar($request->validated())->load(['turno', 'pedagoga'])), 201);
    }

    public function show(Turma $turma): JsonResponse
    {
        $this->authorize('view', $turma);

        return response()->json(new TurmaResource($turma->load(['turno', 'pedagoga', 'vinculos.materia', 'vinculos.professor:id,name'])->loadCount('alunos')));
    }

    public function update(SalvarTurmaRequest $request, Turma $turma): JsonResponse
    {
        return response()->json(new TurmaResource($this->turmas->atualizar($turma, $request->validated())->load(['turno', 'pedagoga'])));
    }

    public function destroy(Turma $turma): JsonResponse
    {
        $this->authorize('delete', $turma);
        $this->turmas->excluir($turma);

        return response()->json(['deleted' => true]);
    }

    public function duplicar(Turma $turma): JsonResponse
    {
        $this->authorize('create', Turma::class);
        $this->authorize('view', $turma);
        $copia = $this->turmas->duplicar($turma);

        return response()->json(new TurmaResource($copia->load(['turno', 'pedagoga', 'vinculos.materia', 'vinculos.professor:id,name'])), 201);
    }

    public function sincronizarMaterias(SincronizarMateriasTurmaRequest $request, Turma $turma): JsonResponse
    {
        /** @var list<array{materia_id: int, professor_user_id?: int|null}> $vinculos */
        $vinculos = $request->validated('vinculos');

        return response()->json(new TurmaResource($this->turmas->sincronizarMaterias($turma, $vinculos)));
    }
}
