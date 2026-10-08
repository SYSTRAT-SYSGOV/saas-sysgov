<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\Empreendimento;

final readonly class EmpreendimentoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, Empreendimento $empreendimento): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view')
            && $this->mesmoTenant($user, $empreendimento);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.empreendimentos.manage');
    }

    public function update(User $user, Empreendimento $empreendimento): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.empreendimentos.manage')
            && $this->mesmoTenant($user, $empreendimento);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, Empreendimento $empreendimento): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $empreendimento->tenant_id === $tenantId;
    }
}
