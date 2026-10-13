<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\OutorgaAgua;

final readonly class OutorgaAguaPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, OutorgaAgua $outorga): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $outorga);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.recursos_hidricos.manage');
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, OutorgaAgua $outorga): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $outorga->tenant_id === $tenantId;
    }
}
