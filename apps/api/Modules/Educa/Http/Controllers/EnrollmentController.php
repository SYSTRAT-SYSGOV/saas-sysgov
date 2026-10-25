<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\ClassEnrollmentRequest;
use Modules\Educa\Http\Requests\EnrollmentCancelRequest;
use Modules\Educa\Http\Requests\EnrollmentCreateRequest;
use Modules\Educa\Http\Requests\ReassignRequest;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Services\ClassEnrollmentService;
use Modules\Educa\Services\EnrollmentService;

final class EnrollmentController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
        private readonly ClassEnrollmentService $classEnrollmentService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaEnrollment::class);

        $matriculas = $this->enrollmentService->listar([
            'school_id' => $request->input('school_id'),
            'academic_year_id' => $request->input('academic_year_id'),
            'grade_id' => $request->input('grade_id'),
            'status' => $request->input('status'),
            'busca' => $request->input('busca'),
        ]);

        return response()->json([
            'data' => $matriculas,
        ]);
    }

    public function store(EnrollmentCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEnrollment::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $matricula = $this->enrollmentService->criar($dados);

            return response()->json([
                'data' => $matricula,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function show(string $matriculaId): JsonResponse
    {
        $this->authorize('view', EducaEnrollment::class);

        $matricula = EducaEnrollment::with(['aluno', 'escola', 'serie', 'enturmacaoAtiva.turma'])
            ->where('id', $matriculaId)
            ->firstOrFail();

        return response()->json([
            'data' => $matricula,
        ]);
    }

    public function cancel(string $matriculaId, EnrollmentCancelRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEnrollment::class);

        $matricula = EducaEnrollment::query()->where('id', $matriculaId)->firstOrFail();

        $atualizada = $this->enrollmentService->cancelar(
            $matricula,
            $request->input('data_cancelamento'),
            $request->input('justificativa')
        );

        return response()->json([
            'data' => $atualizada,
        ]);
    }

    public function enturmar(string $matriculaId, ClassEnrollmentRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEnrollment::class);

        $matricula = EducaEnrollment::query()->where('id', $matriculaId)->firstOrFail();

        $enturmacao = $this->classEnrollmentService->enturmar(
            $matricula,
            $request->input('school_class_id'),
            $request->input('data_entrada')
        );

        return response()->json([
            'data' => $enturmacao,
        ]);
    }

    public function remanejar(string $matriculaId, ReassignRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEnrollment::class);

        $matricula = EducaEnrollment::query()->where('id', $matriculaId)->firstOrFail();

        $this->classEnrollmentService->remanejar(
            $matricula,
            $request->input('turma_destino_id'),
            $request->input('data_remanejamento'),
            $request->input('motivo')
        );

        return response()->json([
            'data' => $matricula->fresh(['enturmacaoAtiva.turma']),
        ]);
    }
}
