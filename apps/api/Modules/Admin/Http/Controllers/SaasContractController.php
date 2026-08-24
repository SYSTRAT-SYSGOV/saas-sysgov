<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Modules\Admin\Models\SaasContract;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use App\Support\AuditLogger;
use Illuminate\Http\Request;

final class SaasContractController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', SaasContract::class);
        return response()->json(SaasContract::query()->with('tenant')->latest()->paginate(25));
    }

    public function show(SaasContract $contract): JsonResponse
    {
        $this->authorize('view', $contract);
        return response()->json($contract->load(['tenant', 'renewals', 'adjustments']));
    }

    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', SaasContract::class);
        $data = $request->validate([
            'tenant_id' => ['required', 'exists:tenants,id'],
            'number' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:255'],
            'plan' => ['required', 'string', 'max:60'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'monthly_fee_cents' => ['required', 'integer', 'min:0'],
            'setup_fee_cents' => ['required', 'integer', 'min:0'],
        ]);

        $contract = SaasContract::create($data);
        $audit->record('admin', 'contract_created', 'saas_contract:'.$contract->getKey(), null, $contract->toArray());
        return response()->json($contract, 201);
    }
}
