<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\Dfd;

final class DfdPolicy
{
    public function view(User $user, Dfd $dfd): bool
    {
        return $this->hasPermission($user, 'licita.view') && $dfd->tenant_id === app(TenantContext::class)->id();
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.create');
    }

    public function update(User $user, Dfd $dfd): bool
    {
        return $this->hasPermission($user, 'licita.update') && $dfd->tenant_id === app(TenantContext::class)->id();
    }

    public function reabrir(User $user, Dfd $dfd): bool
    {
        return $this->update($user, $dfd);
    }

    public function aprovar(User $user, Dfd $dfd): bool
    {
        return $this->hasPermission($user, 'licita.aprovar') && $dfd->tenant_id === app(TenantContext::class)->id();
    }

    public function rejeitar(User $user, Dfd $dfd): bool
    {
        return $this->aprovar($user, $dfd);
    }

    /**
     * Alterar a equipe de planejamento é uma prerrogativa do aprovador
     * (mesma permissão de aprovar/rejeitar), não do `licita.update` —
     * quem só tem permissão de editar o DFD (o elaborador) não deve poder
     * usar essa via paralela para mexer no documento enquanto ele está em
     * revisão.
     */
    public function alterarEquipe(User $user, Dfd $dfd): bool
    {
        return $this->aprovar($user, $dfd);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}
