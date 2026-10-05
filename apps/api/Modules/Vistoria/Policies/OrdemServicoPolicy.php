<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\OrdemServico;

final class OrdemServicoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.view');
    }

    public function view(User $user, OrdemServico $ordem): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $ordem->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        // Fiscal só vê as próprias ordens; chefia (vistoria.ordens.manage) vê todas do tenant
        // (a restrição por unidade organizacional é refinada na tarefa 12.2).
        return $ordem->fiscal_id === $user->id || $user->hasPermission('vistoria.ordens.manage');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.ordens.manage');
    }

    public function update(User $user, OrdemServico $ordem): bool
    {
        return $user->is_platform_admin
            || ($user->hasPermission('vistoria.ordens.manage') && $user->currentTenantId() === $ordem->tenant_id);
    }
}
