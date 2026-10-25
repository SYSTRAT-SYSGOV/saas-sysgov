<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class AttendancePolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $this->checkPermission($user, 'educa.pedagogico.frequencia.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.pedagogico.frequencia.view');
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.pedagogico.frequencia.manage');
    }

    public function create(User $user): bool
    {
        return $this->manage($user);
    }

    public function update(User $user): bool
    {
        return $this->manage($user);
    }

    private function checkPermission(User $user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (\Throwable) {
            return false;
        }
    }
}
