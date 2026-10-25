<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class TransportPolicy
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
        return $this->checkPermission($user, 'educa.transporte.view')
            || $this->checkPermission($user, 'educa.transporte.manage')
            || $this->checkPermission($user, 'educa.transporte.rotas.view')
            || $this->checkPermission($user, 'educa.transporte.veiculos.view')
            || $this->checkPermission($user, 'educa.transporte.condutores.view')
            || $this->checkPermission($user, 'educa.transporte.alocacoes.view');
    }

    public function viewRotas(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.rotas.view')
            || $this->checkPermission($user, 'educa.transporte.rotas.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function manageRotas(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.rotas.manage')
            || $this->checkPermission($user, 'educa.transporte.rotas.create')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function viewVeiculos(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.veiculos.view')
            || $this->checkPermission($user, 'educa.transporte.veiculos.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function manageVeiculos(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.veiculos.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function viewCondutores(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.condutores.view')
            || $this->checkPermission($user, 'educa.transporte.condutores.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function manageCondutores(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.condutores.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function viewAlocacoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.alocacoes.view')
            || $this->checkPermission($user, 'educa.transporte.alocacoes.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
    }

    public function manageAlocacoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.transporte.alocacoes.manage')
            || $this->checkPermission($user, 'educa.transporte.manage');
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
