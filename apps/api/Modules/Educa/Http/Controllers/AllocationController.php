<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\EmployeeAllocationCreateRequest;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Services\AllocationService;

final class AllocationController extends Controller
{
    public function __construct(
        private readonly AllocationService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaEmployeeAllocation::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $alocacoes = $this->service->listar($request->all(), $tenantId);

        return response()->json(['data' => $alocacoes]);
    }

    public function store(EmployeeAllocationCreateRequest $request): JsonResponse
    {
        $this->authorize('create', EducaEmployeeAllocation::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $alocacao = $this->service->alocar($request->validated(), $tenantId);

        return response()->json(['data' => $alocacao], 201);
    }

    public function destroy(string $alocacaoId): JsonResponse
    {
        $this->authorize('delete', EducaEmployeeAllocation::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $this->service->desativar($alocacaoId, $tenantId);

        return response()->json(null, 204);
    }
}
