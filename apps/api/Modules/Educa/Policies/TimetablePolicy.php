<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class TimetablePolicy
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
        return $this->checkPermission($user, 'educa.quadro_horario.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.quadro_horario.view');
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.quadro_horario.manage');
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
