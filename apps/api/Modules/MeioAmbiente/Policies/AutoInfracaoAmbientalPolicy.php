<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;

final readonly class AutoInfracaoAmbientalPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, AutoInfracaoAmbiental $auto): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $auto);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.fiscalizacao.autuar');
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, AutoInfracaoAmbiental $auto): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $auto->tenant_id === $tenantId;
    }
}
