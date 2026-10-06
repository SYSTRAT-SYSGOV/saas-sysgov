<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\OrdemServico;

final class ExecucaoVistoriaPolicy
{
    public function sincronizar(User $user, OrdemServico $ordem): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $ordem->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $ordem->fiscal_id === $user->id;
    }
}
