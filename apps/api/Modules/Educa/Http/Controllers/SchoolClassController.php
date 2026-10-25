<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\SchoolClassCreateRequest;
use Modules\Educa\Http\Requests\SchoolClassUpdateRequest;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Services\SchoolClassService;

final class SchoolClassController extends Controller
{
    public function __construct(
        private readonly SchoolClassService $classService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaSchoolClass::class);

        $turmas = $this->classService->listar([
            'school_id' => $request->input('school_id'),
            'academic_year_id' => $request->input('academic_year_id'),
            'turno' => $request->input('turno'),
        ]);

        return response()->json([
            'data' => $turmas,
        ]);
    }

    public function store(SchoolClassCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaSchoolClass::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $turma = $this->classService->criar($dados);

            return response()->json([
                'data' => $turma,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function show(string $turmaId): JsonResponse
    {
        $this->authorize('view', EducaSchoolClass::class);

        $turma = EducaSchoolClass::with(['escola', 'curso', 'serie', 'matriz'])->findOrFail($turmaId);

        return response()->json([
            'data' => $turma,
        ]);
    }

    public function update(string $turmaId, SchoolClassUpdateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaSchoolClass::class);

        $turma = EducaSchoolClass::findOrFail($turmaId);

        try {
            $atualizada = $this->classService->atualizar($turma, $request->validated());

            return response()->json([
                'data' => $atualizada,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function destroy(string $turmaId): JsonResponse
    {
        $this->authorize('manage', EducaSchoolClass::class);

        $turma = EducaSchoolClass::findOrFail($turmaId);

        try {
            $this->classService->remover($turma);

            return response()->json(null, 204);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }
}
