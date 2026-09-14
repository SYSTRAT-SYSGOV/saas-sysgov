<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\MapaRisco;

final class MapaRiscoPolicy
{
    public function view(User $user, MapaRisco $mapaRisco): bool
    {
        return $this->hasPermission($user, 'licita.view') && $mapaRisco->tenant_id === app(TenantContext::class)->id();
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.create');
    }

    public function update(User $user, MapaRisco $mapaRisco): bool
    {
        return $this->hasPermission($user, 'licita.update') && $mapaRisco->tenant_id === app(TenantContext::class)->id();
    }

    public function reabrir(User $user, MapaRisco $mapaRisco): bool
    {
        return $this->update($user, $mapaRisco);
    }

    public function aprovar(User $user, MapaRisco $mapaRisco): bool
    {
        return $this->hasPermission($user, 'licita.aprovar') && $mapaRisco->tenant_id === app(TenantContext::class)->id();
    }

    public function rejeitar(User $user, MapaRisco $mapaRisco): bool
    {
        return $this->aprovar($user, $mapaRisco);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}
