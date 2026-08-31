<?php

declare(strict_types=1);

namespace Modules\Client\Http\Controllers;

use App\Services\ModuleOrgUnitService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Models\Module;
use Modules\OrgChart\Models\OrgUnit;
use Throwable;

final class ClientGranularityController
{
    public function __construct(
        private readonly ModuleOrgUnitService $service,
    ) {}

    public function modules(): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        if ($tenantId === null) {
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        $modules = Module::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_module.enabled', true))
            ->orderBy('name')
            ->get(['id', 'alias', 'name'])
            ->map(fn ($m) => ['id' => $m->id, 'alias' => $m->alias, 'name' => $m->name]);

        return response()->json(['data' => $modules]);
    }

    public function units(Request $request, Module $module): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        if ($tenantId === null) {
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        $units = $this->service->allUnitsForGranularity($tenantId, $module->id);

        return response()->json([
            'module' => ['id' => $module->id, 'alias' => $module->alias, 'name' => $module->name],
            'units' => $units,
        ]);
    }

    public function set(Request $request, Module $module, OrgUnit $orgUnit): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        if ($tenantId === null) {
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        $data = $request->validate(['enabled' => 'required|boolean']);

        $record = $this->service->setModuleForUnit($tenantId, $module->id, $orgUnit->id, $data['enabled'], $request->user());

        return response()->json([
            'tenant_id' => $tenantId,
            'module_id' => $module->id,
            'org_unit_id' => $orgUnit->id,
            'enabled' => $record->enabled,
            'inherited' => $record->inherited,
        ]);
    }

    public function clear(Request $request, Module $module, OrgUnit $orgUnit): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        if ($tenantId === null) {
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        $this->service->clearModuleForUnit($tenantId, $module->id, $orgUnit->id, $request->user());

        return response()->json(['cleared' => true]);
    }

    private function resolveTenantId(): ?int
    {
        try {
            return app(TenantContext::class)->id();
        } catch (Throwable) {
            return null;
        }
    }
}
