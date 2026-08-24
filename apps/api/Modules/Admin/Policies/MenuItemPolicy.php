<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use Modules\Admin\Models\MenuItem;

final class MenuItemPolicy
{
    public function access(User $user, MenuItem $item): bool
    {
        if (!$item->permission) {
            return true;
        }
        return $user->can($item->permission);
    }

    public function viewAny(User $user): bool { return $user->is_platform_admin; }
    public function view(User $user, MenuItem $item): bool { return $user->is_platform_admin; }
    public function create(User $user): bool { return $user->is_platform_admin; }
    public function update(User $user, MenuItem $item): bool { return $user->is_platform_admin; }
    public function delete(User $user, MenuItem $item): bool { return $user->is_platform_admin; }
}
