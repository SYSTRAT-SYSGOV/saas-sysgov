<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Pedagogico\Http\Requests\SalvarPreConselhoRequest;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Services\EscopoProfessor;
use Modules\Pedagogico\Services\PreConselhoService;

final class PreConselhoController extends Controller
{
    public function __construct(
        private readonly PreConselhoService $fichas,
        private readonly EscopoProfessor $escopo,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PreConselho::class);

        $fichas = $this->escopo->aplicar(PreConselho::query(), $request->user())
            ->with(['turma:id,nome', 'materia:id,nome'])
            ->withCount('alunos')
            ->when($request->query('turma_id'), fn ($q, $v) => $q->where('turma_id', (int) $v))
            ->when($request->query('materia_id'), fn ($q, $v) => $q->where('materia_id', (int) $v))
            ->when($request->query('ano_letivo'), fn ($q, $v) => $q->where('ano_letivo', (int) $v))
            ->when($request->query('periodo'), fn ($q, $v) => $q->where('periodo', (int) $v))
            ->orderByDesc('ano_letivo')->orderByDesc('periodo')->orderBy('turma_id')
            ->get();

        return response()->json($fichas);
    }

    /** Cria ou atualiza a ficha da turma × matéria × período × ano. */
    public function salvar(SalvarPreConselhoRequest $request): JsonResponse
    {
        $dados = $request->validated();
        /** @var list<array{aluno_id: int, nivel_atencao: string, dificuldade?: string|null, encaminhamentos?: string|null, destaque?: bool}> $alunos */
        $alunos = $dados['alunos'];
        unset($dados['alunos']);

        return response()->json($this->fichas->salvar($dados, $alunos, $request->user()));
    }

    public function show(PreConselho $preConselho): JsonResponse
    {
        $this->authorize('view', $preConselho);

        return response()->json($preConselho->load(['alunos.aluno:id,nome,numero,situacao', 'turma:id,nome', 'materia:id,nome']));
    }

    public function destroy(PreConselho $preConselho): JsonResponse
    {
        $this->authorize('delete', $preConselho);
        $this->fichas->excluir($preConselho);

        return response()->json(['deleted' => true]);
    }

    /** Progresso de entrega por turma no período (matérias com ficha / matérias vinculadas). */
    public function progresso(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PreConselho::class);
        $dados = $request->validate(['ano_letivo' => ['required', 'integer'], 'periodo' => ['required', 'integer', 'in:1,2,3']]);
        $turmas = $this->escopo->restrito($request->user()) ? $this->escopo->turmasDoProfessor($request->user())->all() : null;

        return response()->json($this->fichas->progresso((int) $dados['ano_letivo'], (int) $dados['periodo'], $turmas));
    }
}
