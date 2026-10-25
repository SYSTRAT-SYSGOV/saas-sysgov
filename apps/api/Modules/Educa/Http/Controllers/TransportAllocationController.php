<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\TransportAllocationCreateRequest;
use Modules\Educa\Models\EducaTransportStudentAllocation;
use Modules\Educa\Services\TransportAllocationService;

final class TransportAllocationController extends Controller
{
    public function __construct(
        private readonly TransportAllocationService $allocationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAlocacoes', EducaTransportStudentAllocation::class);

        $alocacoes = $this->allocationService->listar([
            'route_id' => $request->query('route_id'),
            'vehicle_id' => $request->query('vehicle_id'),
            'enrollment_id' => $request->query('enrollment_id'),
            'status' => $request->query('status'),
        ]);

        return response()->json([
            'data' => $alocacoes,
        ]);
    }

    public function store(TransportAllocationCreateRequest $request): JsonResponse
    {
        $this->authorize('manageAlocacoes', EducaTransportStudentAllocation::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $alocacao = $this->allocationService->alocar($dados);

            return response()->json([
                'data' => $alocacao,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function encerrar(Request $request, string $alocacaoId): JsonResponse
    {
        $this->authorize('manageAlocacoes', EducaTransportStudentAllocation::class);

        $dataFim = $request->input('data_fim');

        try {
            $alocacao = $this->allocationService->encerrar($alocacaoId, $dataFim);

            return response()->json([
                'data' => $alocacao,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
