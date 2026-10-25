<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class ConselhoClassePolicy
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
        return $this->checkPermission($user, 'educa.conselho.view')
            || $this->checkPermission($user, 'educa.pedagogico.view');
    }

    public function view(User $user): bool
    {
        return $this->checkPermission($user, 'educa.conselho.view')
            || $this->checkPermission($user, 'educa.pedagogico.view');
    }

    public function manageCronograma(User $user): bool
    {
        return $this->checkPermission($user, 'educa.conselho.cronograma.manage')
            || $this->checkPermission($user, 'educa.conselho.admin');
    }

    public function managePreConselho(User $user): bool
    {
        return $this->checkPermission($user, 'educa.conselho.pre_conselho.manage')
            || $this->checkPermission($user, 'educa.pedagogico.professor')
            || $this->checkPermission($user, 'educa.conselho.admin');
    }

    public function manageAta(User $user): bool
    {
        return $this->checkPermission($user, 'educa.conselho.ata.manage')
            || $this->checkPermission($user, 'educa.conselho.admin');
    }

    public function homologarAta(User $user): bool
    {
        return $this->checkPermission($user, 'educa.conselho.homologar')
            || $this->checkPermission($user, 'educa.conselho.admin');
    }

    private function checkPermission(User $user, string $permission): bool
    {
        if (method_exists($user, 'hasPermissionTo')) {
            try {
                return (bool) $user->hasPermissionTo($permission);
            } catch (\Throwable) {
                // Ignora exceções de permissão inexistente
            }
        }

        return true;
    }
}
