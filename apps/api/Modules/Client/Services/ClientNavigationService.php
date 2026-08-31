<?php

declare(strict_types=1);

namespace Modules\Client\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;

final class ClientNavigationService
{
    /**
     * Monta a navegação do web-client para o tenant/usuário logado.
     *
     * @param array<int, string> $activeModules
     * @param array<int, string> $permissions
     * @return array<int, array{id: int, name: string, icon: ?string, items: array<int, array<string, mixed>>}>
     */
    public function buildNavigation(int $tenantId, Authenticatable $user, array $activeModules, array $permissions): array
    {
        $groups = ClientMenuGroup::query()
            ->where(function ($q) use ($tenantId): void {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            })
            ->where('is_active', true)
            ->orderBy('order')
            ->with(['items' => fn ($q) => $q->where('is_active', true)->orderBy('order')])
            ->get();

        $moduleIndex = array_flip($activeModules);
        $payload = [];

        foreach ($groups as $group) {
            $items = [];

            foreach ($group->items as $item) {
                if ($item->module_alias && !isset($moduleIndex[$item->module_alias])) {
                    continue;
                }

                if ($item->permission && !in_array('*', $permissions, true) && !in_array($item->permission, $permissions, true)) {
                    continue;
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
}
