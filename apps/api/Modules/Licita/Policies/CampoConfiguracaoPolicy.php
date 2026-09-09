<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\CampoConfiguracao;

final class CampoConfiguracaoPolicy
{
    public function view(User $user): bool
    {
        return $this->hasPermission($user, 'licita.view');
    }

    public function manage(User $user, ?CampoConfiguracao $configuracao = null): bool
    {
        if ($configuracao !== null && $configuracao->tenant_id !== app(TenantContext::class)->id()) {
            return false;
        }

        return $this->hasPermission($user, 'licita.campos.manage');
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}
