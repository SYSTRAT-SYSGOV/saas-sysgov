<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\CurriculumComponentCreateRequest;
use Modules\Educa\Http\Requests\CurriculumMatrixComponentsRequest;
use Modules\Educa\Http\Requests\CurriculumMatrixCreateRequest;
use Modules\Educa\Http\Requests\KnowledgeAreaCreateRequest;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Services\CurriculumService;

final class CurriculumMatrixController extends Controller
{
    public function __construct(
        private readonly CurriculumService $curriculumService,
    ) {}

    // 1. Áreas de Conhecimento
    public function areasIndex(): JsonResponse
    {
        $this->authorize('viewAny', EducaKnowledgeArea::class);

        return response()->json([
            'data' => $this->curriculumService->listarAreas(),
        ]);
    }

    public function areasStore(KnowledgeAreaCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaKnowledgeArea::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $area = $this->curriculumService->criarArea($dados);

            return response()->json($area, 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    // 2. Componentes Curriculares (Disciplinas)
    public function componentesIndex(): JsonResponse
    {
        $this->authorize('viewAny', EducaCurriculumComponent::class);

        return response()->json([
            'data' => $this->curriculumService->listarComponentes(),
        ]);
    }

    public function componentesStore(CurriculumComponentCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaCurriculumComponent::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $componente = $this->curriculumService->criarComponente($dados);

            return response()->json($componente, 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    // 3. Matrizes Curriculares
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaCurriculumMatrix::class);

        $matrizes = $this->curriculumService->listarMatrizes(
            $request->input('curso_id'),
            $request->input('serie_id'),
        );

        $formatted = $matrizes->map(fn (EducaCurriculumMatrix $m): array => $this->formatarMatriz($m));

        return response()->json([
            'data' => $formatted,
        ]);
    }

    public function store(CurriculumMatrixCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaCurriculumMatrix::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $matriz = $this->curriculumService->criarMatriz($dados);

            return response()->json($this->formatarMatriz($matriz), 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function configurarComponentes(string $matrizId, CurriculumMatrixComponentsRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaCurriculumMatrix::class);

        $matriz = EducaCurriculumMatrix::findOrFail($matrizId);
        $atualizada = $this->curriculumService->configurarComponentes($matriz, $request->validated('componentes'));

        return response()->json($this->formatarMatriz($atualizada));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatarMatriz(EducaCurriculumMatrix $matriz): array
    {
        $matriz->loadMissing('componentes.componente');

        $componentes = $matriz->componentes->map(function ($c): array {
            return [
                'component_id' => $c->component_id,
                'componente_nome' => $c->componente?->nome ?? '',
                'horas_semanais' => (int) $c->horas_semanais,
                'horas_anuais' => (int) $c->horas_anuais,
                'tipo_nota' => $c->tipo_nota,
            ];
        })->values()->all();

        return [
            'id' => $matriz->id,
            'course_id' => $matriz->course_id,
            'grade_id' => $matriz->grade_id,
            'nome' => $matriz->nome,
            'ano_vigencia' => (int) $matriz->ano_vigencia,
            'total_horas_anuais' => (int) $matriz->total_horas_anuais,
            'componentes' => $componentes,
        ];
    }
}
