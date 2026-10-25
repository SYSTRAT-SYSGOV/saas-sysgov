<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class SchoolCapacityPolicy
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
        return $this->checkPermission($user, 'educa.vagas.view')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.vagas.view')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.view');
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.vagas.manage')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.manage');
    }

    public function create(User $user): bool
    {
        return $this->manage($user);
    }

    public function update(User $user): bool
    {
        return $this->manage($user);
    }

    public function delete(User $user): bool
    {
        return $this->manage($user);
    }

    public function analisar(User $user): bool
    {
        return $this->checkPermission($user, 'educa.vagas.analisar')
            || $this->manage($user);
    }

    public function convocar(User $user): bool
    {
        return $this->checkPermission($user, 'educa.vagas.convocar')
            || $this->manage($user);
    }

    public function converter(User $user): bool
    {
        return $this->checkPermission($user, 'educa.vagas.converter')
            || $this->manage($user);
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
