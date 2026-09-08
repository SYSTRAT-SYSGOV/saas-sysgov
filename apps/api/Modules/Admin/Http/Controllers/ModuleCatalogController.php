<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Modules\Admin\Models\Module as PlatformModule;
use App\Models\Permission;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Modules\Admin\Http\Requests\StoreModuleRequest;
use Modules\Admin\Http\Requests\UpdateModuleRequest;
use Modules\Admin\Models\Module;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;

final class ModuleCatalogController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Module::class);
        return response()->json(Module::query()->orderBy('name')->paginate(50));
    }

public function catalog(): JsonResponse
    {
        \Log::info('Catalog endpoint hit via public route', ['url' => request()->fullUrl()]);
        $modules = PlatformModule::query()
            ->where('enabled', true)
            ->orderBy('name')
            ->with(['permissions', 'menuGroup'])
            ->get()
            ->map(function (PlatformModule $module) {
                $menuGroup = $module->menuGroup;
                $permissions = $module->permissions->pluck('slug')->toArray();
                $menuItems = $menuGroup ? $menuGroup->items()->where('is_active', true)->get() : collect();

                return [
                    'id' => $module->id,
                    'name' => $module->name,
                    'alias' => $module->alias,
                    'description' => $module->description,
                    'enabled' => $module->enabled,
                    'monthly_fee_cents' => $module->monthly_fee_cents,
                    'metadata' => $module->metadata ?? [],
                    'icon' => $menuGroup?->icon ?? 'Layers',
                    'menu_label' => $menuGroup?->name ?? $module->name,
                    'menu_order' => $menuGroup?->order ?? 50,
                    'permissions' => $permissions,
                    'menu_items' => $menuItems->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'label' => $item->label,
                            'route' => $item->route,
                            'icon' => $item->icon,
                            'permission' => $item->permission,
                            'order' => $item->order,
                        ];
                    })->toArray(),
                ];
            })->toArray();

        return response()->json(['data' => $modules]);
    }

    public function store(StoreModuleRequest $request): JsonResponse
    {
        $this->authorize('create', Module::class);
        $data = $request->validated();

        return DB::transaction(function () use ($data): JsonResponse {
            $module = Module::create([
                'name' => $data['name'],
                'alias' => $data['alias'],
                'description' => $data['description'] ?? '',
                'metadata' => $data['metadata'] ?? [],
                'enabled' => $data['enabled'] ?? true,
                'monthly_fee_cents' => $data['monthly_fee_cents'] ?? 0,
            ]);

            // Criar permissões padrão
            $this->syncDefaultPermissions($module, $data['default_permissions'] ?? []);

            // Criar menu padrão
            if (isset($data['menu'])) {
                $this->createDefaultMenu($module, $data['menu']);
            }

            return response()->json($module->load('menuGroup', 'permissions'), 201);
        });
    }

    public function show(Module $module): JsonResponse
    {
        $this->authorize('view', $module);
        return response()->json($module->load('menuGroup', 'permissions'));
    }

    public function update(UpdateModuleRequest $request, Module $module): JsonResponse
    {
        $this->authorize('update', $module);
        $data = $request->validated();

        return DB::transaction(function () use ($module, $data): JsonResponse {
            $module->update($data);

            if (isset($data['default_permissions'])) {
                $this->syncDefaultPermissions($module, $data['default_permissions']);
            }

            if (isset($data['menu'])) {
                $this->createDefaultMenu($module, $data['menu']);
            }

            return response()->json($module->load('menuGroup', 'permissions'));
        });
    }

    public function destroy(Module $module): JsonResponse
    {
        $this->authorize('delete', $module);
        $module->delete();
        return response()->json(['deleted' => true]);
    }

    public function toggle(Module $module): JsonResponse
    {
        $this->authorize('update', $module);
        $module->update(['enabled' => !$module->enabled]);
        return response()->json($module);
    }

    private function syncDefaultPermissions(Module $module, array $permissions): void
    {
        $defaultPermissions = [
            "{$module->alias}.view" => "Visualizar {$module->name}",
            "{$module->alias}.create" => "Criar {$module->name}",
            "{$module->alias}.update" => "Atualizar {$module->name}",
            "{$module->alias}.delete" => "Excluir {$module->name}",
        ];

        $allPermissions = array_merge($defaultPermissions, $permissions);
        $permissionIds = [];

        foreach ($allPermissions as $slug => $name) {
            $permission = \App\Models\Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => $module->alias, 'guard_name' => 'web']
            );
            $permissionIds[] = $permission->id;
        }

        $module->permissions()->sync($permissionIds);
    }

    private function createDefaultMenu(Module $module, array $menuData): void
    {
        $groupName = $menuData['label'] ?? $module->name;
        $groupSlug = \Illuminate\Support\Str::slug($groupName);
        $groupIcon = $menuData['icon'] ?? 'Layers';
        $groupOrder = $menuData['order'] ?? 50;

        $group = \Modules\Admin\Models\MenuGroup::updateOrCreate(
            ['slug' => $groupSlug],
            [
                'name' => $groupName,
                'icon' => $groupIcon,
                'order' => $groupOrder,
                'is_active' => true,
            ]
        );

        $module->menuGroup()->associate($group);
        $module->save();

        $alias = $module->alias;
        $defaultItems = [
            [
                'label' => "Visualizar {$module->name}",
                'route' => $alias,
                'icon' => $groupIcon,
                'shortcut' => \Illuminate\Support\Str::upper(\Illuminate\Support\Str::substr($alias, 0, 1)),
                'module_alias' => $alias,
                'permission' => "{$alias}.view",
                'order' => 1,
            ],
        ];

        foreach ($defaultItems as $itemData) {
            \Modules\Admin\Models\MenuItem::updateOrCreate(
                ['menu_group_id' => $group->getKey(), 'route' => $itemData['route']],
                array_merge(['menu_group_id' => $group->getKey(), 'is_active' => true], $itemData),
            );
        }
    }
}