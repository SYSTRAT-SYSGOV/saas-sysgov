<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Http\Requests\EmployeeAbsenceCreateRequest;
use Modules\Educa\Http\Requests\EmployeeWithdrawalCreateRequest;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Services\WithdrawalService;

final class WithdrawalController extends Controller
{
    public function __construct(
        private readonly WithdrawalService $service,
    ) {}

    public function storeAfastamento(string $servidorId, EmployeeWithdrawalCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEmployee::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $afastamento = $this->service->registrarAfastamento($servidorId, $request->validated(), $tenantId);

        return response()->json(['data' => $afastamento], 201);
    }

    public function storeFalta(string $servidorId, EmployeeAbsenceCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEmployee::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $falta = $this->service->registrarFalta($servidorId, $request->validated(), $tenantId);

        return response()->json(['data' => $falta], 201);
    }
}
