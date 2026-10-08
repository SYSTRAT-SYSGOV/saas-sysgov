<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\AreaProtegida;

final readonly class AreaProtegidaPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, AreaProtegida $area): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $area);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.areas_protegidas.manage');
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, AreaProtegida $area): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $area->tenant_id === $tenantId;
    }
}
