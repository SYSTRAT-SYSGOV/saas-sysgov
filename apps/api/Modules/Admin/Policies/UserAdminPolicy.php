<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;

final class UserAdminPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.systrat.view');
    }

    public function view(User $user, User $target): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }
        if ($user->hasPermission('users.systrat.view')) {
            return true;
        }
        // Users can view their own profile
        return $user->id === $target->id;
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.systrat.create');
    }

    public function update(User $user, User $target): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }
        if ($user->hasPermission('users.systrat.update')) {
            return true;
        }
        // Users can update their own profile (limited fields)
        return $user->id === $target->id;
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->is_platform_admin) {
            return !$this->isSelf($user, $target);
        }
        if ($user->hasPermission('users.systrat.delete')) {
            return !$this->isSelf($user, $target);
        }
        return false;
    }

    public function assignRoles(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.systrat.update');
    }

    public function deactivate(User $user, User $target): bool
    {
        if ($user->is_platform_admin || $user->hasPermission('users.systrat.delete')) {
            return !$this->isSelf($user, $target);
        }
        return false;
    }

    public function reactivate(User $user, User $target): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.systrat.update');
    }

    public function resetPassword(User $user, User $target): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.reset_password');
    }

    private function isSelf(User $user, User $target): bool
    {
        return $user->is($target);
    }
}