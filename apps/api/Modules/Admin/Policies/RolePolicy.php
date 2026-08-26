<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use App\Models\Role;

final class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('roles.view') || $user->hasPermission('admin.roles.view');
    }

    public function view(User $user, Role $role): bool
    {
        return $user->is_platform_admin || $user->hasPermission('roles.view') || $user->hasPermission('admin.roles.view');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('roles.create') || $user->hasPermission('admin.roles.manage');
    }

    public function update(User $user, Role $role): bool
    {
        if ($role->is_system && !$user->is_platform_admin) {
            return false;
        }
        return $user->is_platform_admin || $user->hasPermission('roles.update') || $user->hasPermission('admin.roles.manage');
    }

    public function delete(User $user, Role $role): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }
        if ($role->is_system) {
            return false;
        }
        if ($role->users()->exists()) {
            return false;
        }
        return $user->hasPermission('roles.delete') || $user->hasPermission('admin.roles.manage');
    }
}
