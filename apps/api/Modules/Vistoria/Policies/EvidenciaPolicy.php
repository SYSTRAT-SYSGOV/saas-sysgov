<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class EvidenciaPolicy
{
    /** Anexar um documento complementar a uma execução — sem instância prévia de Evidencia. */
    public function anexar(User $user, ExecucaoVistoria $execucao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $execucao->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $execucao->fiscal_id === $user->id || $user->hasPermission('vistoria.ordens.manage');
    }

    public function view(User $user, Evidencia $evidencia): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $evidencia->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $evidencia->execucao->fiscal_id === $user->id || $user->hasPermission('vistoria.ordens.manage');
    }
}
