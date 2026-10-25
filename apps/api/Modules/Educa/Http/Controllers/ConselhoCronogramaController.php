<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\ConselhoCronogramaRequest;
use Modules\Educa\Models\EducaConselhoCronograma;
use Modules\Educa\Services\ConselhoCronogramaService;

final class ConselhoCronogramaController extends Controller
{
    public function __construct(
        private readonly ConselhoCronogramaService $cronogramaService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaConselhoCronograma::class);

        $cronogramas = $this->cronogramaService->listar([
            'school_id' => $request->input('school_id'),
            'academic_year_id' => $request->input('academic_year_id'),
            'status' => $request->input('status'),
        ]);

        return response()->json([
            'data' => $cronogramas,
        ]);
    }

    public function show(string $cronogramaId): JsonResponse
    {
        $this->authorize('view', EducaConselhoCronograma::class);

        $cronograma = $this->cronogramaService->obter($cronogramaId);

        return response()->json([
            'data' => $cronograma,
        ]);
    }

    public function store(ConselhoCronogramaRequest $request): JsonResponse
    {
        $this->authorize('manageCronograma', EducaConselhoCronograma::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $cronograma = $this->cronogramaService->criar($request->validated(), $userId);

            return response()->json([
                'data' => $cronograma,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'datas_cronograma_invalidas',
            ], 422);
        }
    }

    public function update(ConselhoCronogramaRequest $request, string $cronogramaId): JsonResponse
    {
        $this->authorize('manageCronograma', EducaConselhoCronograma::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $cronograma = $this->cronogramaService->atualizar($cronogramaId, $request->validated(), $userId);

            return response()->json([
                'data' => $cronograma,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'datas_cronograma_invalidas',
            ], 422);
        }
    }

    public function destroy(Request $request, string $cronogramaId): JsonResponse
    {
        $this->authorize('manageCronograma', EducaConselhoCronograma::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $this->cronogramaService->excluir($cronogramaId, $userId);

            return response()->json(null, 204);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'cronograma_possui_vinculos',
            ], 422);
        }
    }
}
