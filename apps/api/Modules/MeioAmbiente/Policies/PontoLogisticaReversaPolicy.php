<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;

final readonly class PontoLogisticaReversaPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, PontoLogisticaReversa $ponto): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $ponto);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.residuos.manage');
    }

    public function update(User $user, PontoLogisticaReversa $ponto): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.residuos.manage') && $this->mesmoTenant($user, $ponto);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, PontoLogisticaReversa $ponto): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $ponto->tenant_id === $tenantId;
    }
}
