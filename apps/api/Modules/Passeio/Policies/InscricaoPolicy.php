<?php

declare(strict_types=1);

namespace Modules\Passeio\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Passeio\Models\Inscricao;

/** Inscrições e autorizações: escrita com passeio.passeios.manage. */
final class InscricaoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'passeio.view');
    }

    public function view(User $user, Inscricao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'passeio.passeios.manage');
    }

    public function update(User $user, Inscricao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.passeios.manage');
    }

    public function delete(User $user, Inscricao $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'passeio.passeios.manage');
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Inscricao $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}
