<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Modules\Admin\Http\Requests\StoreTenantRequest;
use Modules\Admin\Http\Requests\UpdateTenantRequest;

final class TenantController
{
    public function index(): JsonResponse { return response()->json(Tenant::query()->latest()->paginate(25)); }
    public function store(StoreTenantRequest $request, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $tenant = Tenant::create($request->validated());
        $audit->record('admin', 'created', 'tenant:'.$tenant->getKey(), null, $tenant->toArray());
        $outbox->publish('tenant.created', ['tenant_id' => $tenant->getKey(), 'slug' => $tenant->slug], $tenant->getKey());
        return response()->json($tenant, 201);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant, AuditLogger $audit): JsonResponse
    {
        $before = $tenant->toArray();
        $tenant->update($request->validated());
        $audit->record('admin', 'updated', 'tenant:'.$tenant->getKey(), $before, $tenant->toArray());
        return response()->json($tenant->fresh());
    }
}