<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\SchoolCreateRequest;
use Modules\Educa\Http\Requests\SchoolUpdateRequest;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Services\SchoolService;

final class SchoolController extends Controller
{
    public function __construct(
        private readonly SchoolService $schoolService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaSchool::class);

        $escolas = $this->schoolService->listar([
            'busca' => $request->input('busca'),
            'zona' => $request->input('zona'),
            'situacao' => $request->input('situacao'),
        ]);

        return response()->json([
            'data' => $escolas,
        ]);
    }

    public function store(SchoolCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaSchool::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        try {
            $school = $this->schoolService->criar($dados);

            return response()->json([
                'data' => $school,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function show(string $escolaId): JsonResponse
    {
        $this->authorize('view', EducaSchool::class);

        $school = EducaSchool::with(['orgUnit', 'cursos', 'series'])->findOrFail($escolaId);

        return response()->json([
            'data' => $school,
        ]);
    }

    public function update(string $escolaId, SchoolUpdateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaSchool::class);

        $school = EducaSchool::findOrFail($escolaId);

        try {
            $updated = $this->schoolService->atualizar($school, $request->validated());

            return response()->json([
                'data' => $updated,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CONFLICT',
            ], 409);
        }
    }

    public function capacidadeTurno(string $escolaId, Request $request): JsonResponse
    {
        $this->authorize('view', EducaSchool::class);

        $request->validate([
            'ano' => ['required', 'integer'],
        ]);

        $school = EducaSchool::findOrFail($escolaId);
        $capacidade = $this->schoolService->obterCapacidadePorTurno($school, (int) $request->input('ano'));

        return response()->json($capacidade);
    }
}
