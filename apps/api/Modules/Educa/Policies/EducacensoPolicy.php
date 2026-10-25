<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class EducacensoPolicy
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
        return $this->checkPermission($user, 'educa.educacenso.view')
            || $this->checkPermission($user, 'educa.educacenso.manage');
    }

    public function view(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.educacenso.manage');
    }

    public function auditar(User $user): bool
    {
        return $this->checkPermission($user, 'educa.educacenso.auditoria.execute')
            || $this->manage($user);
    }

    public function exportar(User $user): bool
    {
        return $this->checkPermission($user, 'educa.educacenso.exportacao.execute')
            || $this->manage($user);
    }

    public function download(User $user): bool
    {
        return $this->checkPermission($user, 'educa.educacenso.exportacao.download')
            || $this->manage($user);
    }

    public function importarRetorno(User $user): bool
    {
        return $this->checkPermission($user, 'educa.educacenso.retorno.execute')
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
