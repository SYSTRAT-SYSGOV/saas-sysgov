<?php

declare(strict_types=1);

namespace Modules\Client\Policies;

use App\Models\User;

final class ClientMenuGroupPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->can('users.manage');
    }

    public function view(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->can('users.manage');
    }

    public function update(User $user): bool
    {
        return $user->is_platform_admin || $user->can('users.manage');
    }

    public function delete(User $user): bool
    {
        return $user->is_platform_admin || $user->can('users.manage');
    }
}
