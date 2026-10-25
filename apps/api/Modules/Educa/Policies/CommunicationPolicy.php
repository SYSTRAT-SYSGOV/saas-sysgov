<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class CommunicationPolicy
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
        return $this->checkPermission($user, 'educa.comunicacao.view')
            || $this->checkPermission($user, 'educa.comunicacao.manage')
            || $this->checkPermission($user, 'educa.comunicacao.avisos.view')
            || $this->checkPermission($user, 'educa.comunicacao.ocorrencias.view');
    }

    public function viewAvisos(User $user): bool
    {
        return $this->checkPermission($user, 'educa.comunicacao.avisos.view')
            || $this->checkPermission($user, 'educa.comunicacao.avisos.manage')
            || $this->checkPermission($user, 'educa.comunicacao.manage');
    }

    public function manageAvisos(User $user): bool
    {
        return $this->checkPermission($user, 'educa.comunicacao.avisos.manage')
            || $this->checkPermission($user, 'educa.comunicacao.manage');
    }

    public function viewOcorrencias(User $user): bool
    {
        return $this->checkPermission($user, 'educa.comunicacao.ocorrencias.view')
            || $this->checkPermission($user, 'educa.comunicacao.ocorrencias.manage')
            || $this->checkPermission($user, 'educa.comunicacao.manage');
    }

    public function manageOcorrencias(User $user): bool
    {
        return $this->checkPermission($user, 'educa.comunicacao.ocorrencias.manage')
            || $this->checkPermission($user, 'educa.comunicacao.manage');
    }

    public function sendNotificacoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.comunicacao.notificacoes.send')
            || $this->checkPermission($user, 'educa.comunicacao.manage');
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
