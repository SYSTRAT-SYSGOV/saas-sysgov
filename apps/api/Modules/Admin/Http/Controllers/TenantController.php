<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Modules\Admin\Http\Requests\StoreTenantRequest;
use Modules\Admin\Http\Requests\UpdateTenantRequest;

final class TenantController
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tenant::class);

        $query = Tenant::query()->latest();

        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('cnpj', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(25));
    }

    public function show(Tenant $tenant): JsonResponse
    {
        $this->authorize('view', $tenant);
        return response()->json($tenant);
    }

    public function store(StoreTenantRequest $request, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $this->authorize('create', Tenant::class);
        $tenant = Tenant::create($request->validated());
        $audit->record('admin', 'created', 'tenant:'.$tenant->getKey(), null, $tenant->toArray());
        $outbox->publish('tenant.created', ['tenant_id' => $tenant->getKey(), 'slug' => $tenant->slug], $tenant->getKey());
        return response()->json($tenant, 201);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $tenant);
        $before = $tenant->toArray();
        $tenant->update($request->validated());
        $audit->record('admin', 'updated', 'tenant:'.$tenant->getKey(), $before, $tenant->toArray());
        return response()->json($tenant->fresh());
    }

    public function toggleStatus(Request $request, Tenant $tenant, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $tenant);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,trial'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $tenant->toArray();
        $tenant->update(['status' => $data['status']]);

        $audit->record('admin', 'status_changed', 'tenant:'.$tenant->getKey(), $before, [
            'status' => $tenant->status,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json($tenant->fresh());
    }

    public function destroy(Tenant $tenant, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $this->authorize('delete', $tenant);

        $snapshot = $tenant->toArray();
        $tenant->delete();

        $audit->record('admin', 'deleted', 'tenant:'.$tenant->getKey(), $snapshot, null);
        $outbox->publish('tenant.deleted', ['tenant_id' => $tenant->getKey()], $tenant->getKey());

        return response()->json(null, 204);
    }
}
