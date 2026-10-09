<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;

final readonly class MeioAmbienteIntegracaoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user);
    }

    public function delete(User $user, MeioAmbienteIntegracao $integracao): bool
    {
        return $this->temPermissao($user) && $integracao->tenant_id === app(TenantContext::class)->id();
    }

    private function temPermissao(User $user): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission('meio_ambiente.integracoes.manage');
    }
}
