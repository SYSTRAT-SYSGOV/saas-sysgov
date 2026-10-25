<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use LogicException;
use Modules\Educa\Http\Requests\CourseCreateRequest;
use Modules\Educa\Http\Requests\GradeCreateRequest;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Services\CurriculumService;

final class CourseController extends Controller
{
    public function __construct(
        private readonly CurriculumService $curriculumService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', EducaCourse::class);

        return response()->json([
            'data' => $this->curriculumService->listarCursos(),
        ]);
    }

    public function store(CourseCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaCourse::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $curso = $this->curriculumService->criarCurso($dados);

            return response()->json($curso, 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function seriesIndex(string $cursoId): JsonResponse
    {
        $this->authorize('viewAny', EducaGrade::class);

        EducaCourse::findOrFail($cursoId);

        return response()->json([
            'data' => $this->curriculumService->listarSeries($cursoId),
        ]);
    }

    public function seriesStore(string $cursoId, GradeCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaGrade::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $serie = $this->curriculumService->criarSerie($cursoId, $dados);

            return response()->json($serie, 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }
}
