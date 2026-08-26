<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use App\Models\UserInvitation;

final class InvitationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.invite');
    }

    public function view(User $user, UserInvitation $invitation): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }
        return $user->hasPermission('users.invite');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.invite');
    }

    public function resend(User $user, UserInvitation $invitation): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.invite');
    }

    public function cancel(User $user, UserInvitation $invitation): bool
    {
        return $user->is_platform_admin || $user->hasPermission('users.invite');
    }
}