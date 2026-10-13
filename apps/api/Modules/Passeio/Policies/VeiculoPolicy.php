<?php

declare(strict_types=1);

namespace Modules\Passeio\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Passeio\Models\Veiculo;

/** Veículos e mapa de assentos: escrita com passeio.frota.manage. */
final class VeiculoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'passeio.view');
    }

    public function view(User $user, Veiculo $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'passeio.frota.manage');
    }

    public function update(User $user, Veiculo $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.frota.manage');
    }

    public function delete(User $user, Veiculo $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.frota.manage');
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Veiculo $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}
