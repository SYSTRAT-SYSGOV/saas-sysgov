<?php

declare(strict_types=1);

namespace Modules\Formatura\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Formatura\Models\Configuracao;

/** Configuração da formatura: escrita com formatura.config.manage. */
final class ConfiguracaoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'formatura.view');
    }

    public function view(User $user, Configuracao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'formatura.config.manage');
    }

    public function update(User $user, Configuracao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.config.manage');
    }

    public function delete(User $user, Configuracao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.config.manage');
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Configuracao $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}
