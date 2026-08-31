<?php

declare(strict_types=1);

namespace Modules\Client\Services;

use App\Models\Tenant;
use App\Services\ModuleOrgUnitService;
use Illuminate\Contracts\Auth\Authenticatable;
use Modules\Admin\Models\Module;
use Modules\Client\Models\ClientMenuGroup;

final class ClientNavigationService
{
    public function __construct(
        private readonly ModuleOrgUnitService $moduleOrgUnit,
    ) {}

    /**
     * Monta a navegação do web-client para o tenant/usuário logado.
     *
     * FASE 0B (anti-spoofing): módulos e permissões são resolvidos AQUI, a partir do banco
     * (tenant_module.enabled + permissions do usuário). Nenhum input do frontend é aceito.
     *
     * @param array<int>|null $orgUnitIds  Unidades do usuário para filtro de granularidade
     * @return array<int, array{id: int, name: string, icon: ?string, items: array<int, array<string, mixed>>}>
     */
    public function buildNavigation(int $tenantId, Authenticatable $user, ?array $orgUnitIds = null): array
    {
        $activeModules = $this->resolveActiveModules($tenantId);
        $permissions = $this->resolvePermissions($user, $tenantId);

        $groups = ClientMenuGroup::query()
            ->where(function ($q) use ($tenantId): void {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            })
            ->where('is_active', true)
            ->orderBy('order')
            ->with(['items' => fn ($q) => $q->where('is_active', true)->whereNull('parent_id')->orderBy('order')->with(['children' => fn ($cq) => $cq->where('is_active', true)->orderBy('order')])])
            ->get();

        $allAliases = collect($groups->pluck('items.*.module_alias'))
            ->flatten()
            ->filter()
            ->unique()
            ->values();
        $modulesByAlias = Module::query()
            ->whereIn('alias', $allAliases)
            ->get()
            ->keyBy('alias');

        $moduleIndex = array_flip($activeModules);
        $hasExplicitModules = !empty($moduleIndex);
        $payload = [];

        foreach ($groups as $group) {
            $items = [];

            foreach ($group->items as $item) {
                if ($hasExplicitModules && $item->module_alias && !isset($moduleIndex[$item->module_alias])) {
                    continue;
                }

                if ($item->permission && !in_array('*', $permissions, true) && !in_array($item->permission, $permissions, true)) {
                    continue;
                }

                if ($orgUnitIds !== null && $item->module_alias) {
                    $module = $modulesByAlias[$item->module_alias] ?? null;
                    if ($module && !array_filter($orgUnitIds, fn ($oid) => $this->moduleOrgUnit->isModuleEnabledForUnit($tenantId, $module->id, $oid))) {
                        continue;
                    }
                }

                $children = [];
                foreach ($item->children as $child) {
                    if ($hasExplicitModules && $child->module_alias && !isset($moduleIndex[$child->module_alias])) {
                        continue;
                    }
                    if ($child->permission && !in_array('*', $permissions, true) && !in_array($child->permission, $permissions, true)) {
                        continue;
                    }
                    if ($orgUnitIds !== null && $child->module_alias) {
                        $module = $modulesByAlias[$child->module_alias] ?? null;
                        if ($module && !array_filter($orgUnitIds, fn ($oid) => $this->moduleOrgUnit->isModuleEnabledForUnit($tenantId, $module->id, $oid))) {
                            continue;
                        }
                    }
                    $children[] = [
                        'id' => $child->getKey(),
                        'label' => $child->label,
                        'icon' => $child->icon,
                        'route' => $child->route,
                        'shortcut' => $child->shortcut,
                        'module' => $child->module_alias,
                        'permission' => $child->permission,
                        'active' => false,
                    ];
                }

                $items[] = [
                    'id' => $item->getKey(),
                    'label' => $item->label,
                    'icon' => $item->icon,
                    'route' => $item->route,
                    'shortcut' => $item->shortcut,
                    'module' => $item->module_alias,
                    'permission' => $item->permission,
                    'active' => false,
                    'children' => $children,
                ];
            }

            if (empty($items)) {
                continue;
            }

            $payload[] = [
                'id' => $group->getKey(),
                'name' => $group->name,
                'icon' => $group->icon,
                'items' => $items,
            ];
        }

        return $payload;
    }

    /**
     * Fonte autoritativa de módulos ativos do tenant (RN-GRA-005 / Fase 0B).
     *
     * @return array<int, string>
     */
    private function resolveActiveModules(int $tenantId): array
    {
        $tenant = Tenant::find($tenantId);

        return $tenant
            ? $tenant->modules()->wherePivot('enabled', true)->pluck('modules.alias')->all()
            : [];
    }

    /**
     * Fonte autoritativa de permissões do usuário no tenant (Fase 0B).
     *
     * @return array<int, string>
     */
    private function resolvePermissions(Authenticatable $user, int $tenantId): array
    {
        $user = method_exists($user, 'rolesForTenant') ? $user : null;
        if ($user === null) {
            return [];
        }

        /** @var \App\Models\User $user */
        $isAdminTenant = $user->rolesForTenant($tenantId)->contains('slug', 'admin_tenant');

        if ($user->is_platform_admin || $isAdminTenant) {
            return ['*'];
        }

        if ($user->isSupportAnalyst()) {
            return $user->permissionsForSystrat()->pluck('slug')->all();
        }

        return $user->permissionsForTenant($tenantId)->pluck('slug')->all();
    }
}
