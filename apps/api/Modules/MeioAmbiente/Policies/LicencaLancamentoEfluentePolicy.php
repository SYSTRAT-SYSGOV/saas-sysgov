<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\LicencaLancamentoEfluente;

final readonly class LicencaLancamentoEfluentePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, LicencaLancamentoEfluente $licenca): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $licenca);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.recursos_hidricos.manage');
    }

    public function update(User $user, LicencaLancamentoEfluente $licenca): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.recursos_hidricos.manage') && $this->mesmoTenant($user, $licenca);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, LicencaLancamentoEfluente $licenca): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $licenca->tenant_id === $tenantId;
    }
}
