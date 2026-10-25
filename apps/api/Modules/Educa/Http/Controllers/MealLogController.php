<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Http\Requests\MealLogCreateRequest;
use Modules\Educa\Models\EducaMealLog;
use Modules\Educa\Services\MealLogService;

final class MealLogController extends Controller
{
    public function __construct(
        private readonly MealLogService $mealLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewRefeicoes', EducaMealLog::class);

        $logs = $this->mealLogService->listar([
            'school_id' => $request->query('school_id'),
            'tipo_refeicao' => $request->query('tipo_refeicao'),
            'data_inicio' => $request->query('data_inicio'),
            'data_fim' => $request->query('data_fim'),
        ]);

        return response()->json([
            'data' => $logs,
        ]);
    }

    public function store(MealLogCreateRequest $request): JsonResponse
    {
        $this->authorize('manageRefeicoes', EducaMealLog::class);

        $tenantId = app(TenantContext::class)->id();
        $userId = (int) $request->user()->id;

        try {
            $log = $this->mealLogService->registrar($request->validated(), $tenantId, $userId);

            return response()->json([
                'data' => $log,
            ], 201);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $id): JsonResponse
    {
        $this->authorize('viewRefeicoes', EducaMealLog::class);

        $log = $this->mealLogService->obter($id);

        return response()->json([
            'data' => $log,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorize('manageRefeicoes', EducaMealLog::class);

        try {
            $log = $this->mealLogService->atualizar($id, $request->all());

            return response()->json([
                'data' => $log,
            ]);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $this->authorize('manageRefeicoes', EducaMealLog::class);

        try {
            $this->mealLogService->excluir($id);

            return response()->json(null, 204);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function relatorioDesperdicio(Request $request): JsonResponse
    {
        $this->authorize('viewRefeicoes', EducaMealLog::class);

        $relatorio = $this->mealLogService->relatorioDesperdicio(
            $request->query('school_id'),
            $request->query('data_inicio'),
            $request->query('data_fim')
        );

        return response()->json([
            'data' => $relatorio,
        ]);
    }
}
