<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\PesquisaPreco;

final class PesquisaPrecoPolicy
{
    public function view(User $user, PesquisaPreco $pesquisaPreco): bool
    {
        return $this->hasPermission($user, 'licita.view') && $pesquisaPreco->tenant_id === app(TenantContext::class)->id();
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.create');
    }

    public function update(User $user, PesquisaPreco $pesquisaPreco): bool
    {
        return $this->hasPermission($user, 'licita.update') && $pesquisaPreco->tenant_id === app(TenantContext::class)->id();
    }

    public function reabrir(User $user, PesquisaPreco $pesquisaPreco): bool
    {
        return $this->update($user, $pesquisaPreco);
    }

    public function aprovar(User $user, PesquisaPreco $pesquisaPreco): bool
    {
        return $this->hasPermission($user, 'licita.aprovar') && $pesquisaPreco->tenant_id === app(TenantContext::class)->id();
    }

    public function rejeitar(User $user, PesquisaPreco $pesquisaPreco): bool
    {
        return $this->aprovar($user, $pesquisaPreco);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}
