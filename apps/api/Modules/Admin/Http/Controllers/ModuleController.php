<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Http\Requests\ToggleModuleRequest;
use Modules\Admin\Models\Module;

final class ModuleController
{
    public function index(): JsonResponse { return response()->json(Module::query()->with('tenants:id,name,slug')->orderBy('name')->paginate(50)); }
    public function toggle(ToggleModuleRequest $request, Tenant $tenant, Module $module, AuditLogger $audit): JsonResponse
    {
        $payload = $request->validated();
        $before = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();
        DB::transaction(fn () => $module->tenants()->syncWithoutDetaching([$tenant->getKey() => ['enabled' => $payload['enabled'], 'settings' => json_encode($payload['settings'] ?? [])]]));
        $after = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();
        $audit->record('admin', 'module.toggled', 'tenant:'.$tenant->getKey().'/module:'.$module->getKey(), $before, $after);
        return response()->json(['tenant_id' => $tenant->getKey(), 'module_id' => $module->getKey(), 'enabled' => (bool) $payload['enabled'], 'settings' => $payload['settings'] ?? []]);
    }
}
