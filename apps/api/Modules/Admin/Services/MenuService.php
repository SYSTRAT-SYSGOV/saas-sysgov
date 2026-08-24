<?php

declare(strict_types=1);

namespace Modules\Admin\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;

final class MenuService
{
    /**
     * Build the navigation tree for the given tenant/user.
     *
     * @return array<int, array{id: int, name: string, icon: ?string, items: array<int, array<string, mixed>>}>
     */
    public function buildNavigation(?int $tenantId, ?Authenticatable $user): array
    {
        $groups = MenuGroup::forTenant($tenantId);

        $payload = [];

        foreach ($groups as $group) {
            $items = [];
            foreach ($group->items as $item) {
                if ($item->permission && $user && !Gate::forUser($user)->allows('access', $item)) {
                    continue;
                }
                $items[] = [
                    'id' => $item->getKey(),
                    'label' => $item->label,
                    'icon' => $item->icon,
                    'route' => $item->route,
                    'shortcut' => $item->shortcut,
                    'badge' => $this->resolveBadge($item->module_alias, $tenantId),
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

    private function resolveBadge(?string $moduleAlias, ?int $tenantId): ?array
    {
        if (!$moduleAlias) {
            return null;
        }
        $counters = config("menu.badges.{$moduleAlias}", null);
        if ($counters === null) {
            return null;
        }
        $value = is_callable($counters) ? (int) $counters($tenantId) : (int) $counters;
        return $value > 0 ? ['value' => $value, 'tone' => 'rose'] : null;
    }
}
