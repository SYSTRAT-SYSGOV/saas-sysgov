<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\GeradorResiduo;

final readonly class GeradorResiduoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, GeradorResiduo $gerador): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $gerador);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.residuos.manage');
    }

    public function update(User $user, GeradorResiduo $gerador): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.residuos.manage') && $this->mesmoTenant($user, $gerador);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, GeradorResiduo $gerador): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $gerador->tenant_id === $tenantId;
    }
}
