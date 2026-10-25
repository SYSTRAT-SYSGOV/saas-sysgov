<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class StudentProfilePolicy
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
        return $this->checkPermission($user, 'educa.secretaria.alunos.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.secretaria.alunos.view');
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.secretaria.alunos.manage');
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
