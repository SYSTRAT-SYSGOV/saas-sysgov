<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;

final class UserPolicy
{
    public function viewAny(User $user): bool { return $user->is_platform_admin; }
    public function create(User $user): bool { return $user->is_platform_admin; }
    public function assignRoles(User $user): bool { return $user->is_platform_admin; }

    public function suspend(User $user, User $target): bool
    {
        return $user->is_platform_admin && !$this->isSelf($user, $target);
    }

    public function delete(User $user, User $target): bool
    {
        return $user->is_platform_admin && !$this->isSelf($user, $target);
    }

    private function isSelf(User $user, User $target): bool { return $user->is($target); }
}
