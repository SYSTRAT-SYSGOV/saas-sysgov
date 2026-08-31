<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Services\ModuleOrgUnitService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Models\Module;

final class ModuleOrgUnitController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ModuleOrgUnitService $service,
    ) {}

    public function index(Request $request, Tenant $tenant, Module $module): JsonResponse
    {
        $this->authorize('viewAny', [Module::class, $tenant]);

        $units = $this->service->unitsWithModuleEnabled($tenant->id, $module->id);

        return response()->json([
            'module' => ['id' => $module->id, 'alias' => $module->alias, 'name' => $module->name],
            'tenant' => ['id' => $tenant->id, 'name' => $tenant->name],
            'units' => $units,
        ]);
    }

    public function effectiveModules(Request $request, Tenant $tenant, \Modules\OrgChart\Models\OrgUnit $orgUnit): JsonResponse
    {
        $this->authorize('viewAny', [Module::class, $tenant]);

        $modules = $this->service->effectiveModulesForUnit($tenant->id, $orgUnit->id);

        return response()->json([
            'org_unit' => ['id' => $orgUnit->id, 'name' => $orgUnit->name, 'path' => $orgUnit->path],
            'modules' => $modules,
        ]);
    }

    public function set(Request $request, Tenant $tenant, Module $module, \Modules\OrgChart\Models\OrgUnit $orgUnit): JsonResponse
    {
        $this->authorize('update', [$module, $tenant]);

        $data = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $user = $request->user();
        $record = $this->service->setModuleForUnit($tenant->id, $module->id, $orgUnit->id, $data['enabled'], $user);

        return response()->json([
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
            'org_unit_id' => $orgUnit->id,
            'enabled' => $record->enabled,
            'inherited' => $record->inherited,
        ]);
    }

    public function clear(Request $request, Tenant $tenant, Module $module, \Modules\OrgChart\Models\OrgUnit $orgUnit): JsonResponse
    {
        $this->authorize('update', [$module, $tenant]);

        $user = $request->user();
        $this->service->clearModuleForUnit($tenant->id, $module->id, $orgUnit->id, $user);

        return response()->json(['cleared' => true]);
    }
}
