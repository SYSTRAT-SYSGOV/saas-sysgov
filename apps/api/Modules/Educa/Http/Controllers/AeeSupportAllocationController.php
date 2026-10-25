<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\AeeSupportAllocationRequest;
use Modules\Educa\Models\EducaAeeSupportAllocation;
use Modules\Educa\Services\AeeSupportAllocationService;

final class AeeSupportAllocationController extends Controller
{
    public function __construct(
        private readonly AeeSupportAllocationService $supportService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAeeSupportAllocation::class);

        $alocacoes = $this->supportService->listar([
            'school_id' => $request->input('school_id'),
            'caregiver_employee_id' => $request->input('caregiver_employee_id'),
            'status' => $request->input('status'),
        ]);

        return response()->json([
            'data' => $alocacoes,
        ]);
    }

    public function store(AeeSupportAllocationRequest $request): JsonResponse
    {
        $this->authorize('manageApoio', EducaAeeSupportAllocation::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $alocacao = $this->supportService->alocar($request->validated(), $userId);

            return response()->json([
                'data' => $alocacao,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'sobrecarga_cuidador',
            ], 422);
        }
    }

    public function destroy(Request $request, string $alocacaoId): JsonResponse
    {
        $this->authorize('manageApoio', EducaAeeSupportAllocation::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $this->supportService->encerrar($alocacaoId, $userId);

        return response()->json(null, 204);
    }
}
