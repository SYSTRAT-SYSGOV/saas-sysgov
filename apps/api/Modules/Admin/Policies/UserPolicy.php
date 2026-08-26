<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;

final class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.systrat.view', 'admin.users.view']);
    }

    public function view(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return true;
        }
        return $user->is_platform_admin || $this->can($user, ['users.systrat.view', 'admin.users.view']);
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.systrat.create', 'admin.users.manage']);
    }

    public function update(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return true;
        }
        return $user->is_platform_admin || $this->can($user, ['users.systrat.update', 'admin.users.manage']);
    }

    public function assignRoles(User $user): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.systrat.update', 'roles.assign', 'admin.users.manage']);
    }

    public function deactivate(User $user, User $target): bool
    {
        if ($user->is($target)) {
            return false;
        }
        return $user->is_platform_admin || $this->can($user, ['users.systrat.delete', 'users.deactivate', 'admin.users.manage']);
    }

    public function reactivate(User $user, User $target): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.systrat.update', 'admin.users.manage']);
    }

    public function resetPassword(User $user, User $target): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.reset_password', 'admin.users.manage']);
    }

    public function suspend(User $user, User $target): bool
    {
        if ($user->is($target)) {
            return false;
        }
        return $user->is_platform_admin || $this->can($user, ['admin.users.manage']);
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->is($target)) {
            return false;
        }
        return $user->is_platform_admin || $this->can($user, ['users.systrat.delete', 'admin.users.manage']);
    }

    // --- Abilities para usuários de tenants (RN-USR-011) ---

    public function createTenantAdmin(User $user): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.tenant.create']);
    }

    public function viewTenantUsers(User $user): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.tenant.view']);
    }

    public function viewTenantUser(User $user, User $target): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.tenant.view']);
    }

    public function deactivateTenantUser(User $user, User $target): bool
    {
        return $user->is_platform_admin || $this->can($user, ['users.deactivate']);
    }

    private function can(User $user, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }
}
