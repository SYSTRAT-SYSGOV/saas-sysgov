<?php

declare(strict_types=1);

namespace Modules\Formatura\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Formatura\Models\Participacao;

/** Participação dos formandos: escrita com formatura.formandos.manage. */
final class ParticipacaoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'formatura.view');
    }

    public function view(User $user, Participacao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'formatura.formandos.manage');
    }

    public function update(User $user, Participacao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.formandos.manage');
    }

    public function delete(User $user, Participacao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.formandos.manage');
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Participacao $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}
