<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;

final readonly class ProcessoLicenciamentoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, ProcessoLicenciamento $processo): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $processo);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.licenciamento.manage');
    }

    public function update(User $user, ProcessoLicenciamento $processo): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.licenciamento.manage') && $this->mesmoTenant($user, $processo);
    }

    public function vistoriar(User $user, ProcessoLicenciamento $processo): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.licenciamento.vistoriar') && $this->mesmoTenant($user, $processo);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, ProcessoLicenciamento $processo): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $processo->tenant_id === $tenantId;
    }
}
