<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;

final readonly class CompensacaoAmbientalPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, CompensacaoAmbiental $compensacao): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $compensacao);
    }

    public function update(User $user, CompensacaoAmbiental $compensacao): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.compensacao.manage') && $this->mesmoTenant($user, $compensacao);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, CompensacaoAmbiental $compensacao): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $compensacao->tenant_id === $tenantId;
    }
}
