<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class AeePolicy
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
        return $this->checkPermission($user, 'educa.aee.view')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.view')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.view');
    }

    public function manage(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.manage')
            || $this->checkPermission($user, 'educa.secretaria.matriculas.manage');
    }

    /**
     * Permissão restrita para visualização de CID e laudos médicos (LGPD Art. 11).
     */
    public function viewLaudos(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.laudos.view')
            || $this->checkPermission($user, 'educa.aee.manage');
    }

    public function managePei(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.pei.manage')
            || $this->checkPermission($user, 'educa.aee.manage');
    }

    public function manageSalas(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.salas.manage')
            || $this->checkPermission($user, 'educa.aee.manage');
    }

    public function manageApoio(User $user): bool
    {
        return $this->checkPermission($user, 'educa.aee.apoio.manage')
            || $this->checkPermission($user, 'educa.aee.manage');
    }

    private function checkPermission(User $user, string $permission): bool
    {
        if (method_exists($user, 'hasPermission')) {
            return (bool) $user->hasPermission($permission);
        }

        return false;
    }
}
