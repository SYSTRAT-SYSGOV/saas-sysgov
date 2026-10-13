<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\ExecucaoVistoria;
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

    /**
     * Consulta da trilha de auditoria completa — restrita a auditores
     * (`vistoria.auditoria.view`), chefia (`vistoria.chefia`) e administradores da
     * plataforma (`is_platform_admin`). Diferente de `sincronizar()`, nem o fiscal dono da
     * execução nem `vistoria.ordens.manage` dão acesso aqui — é uma consulta de
     * conformidade/compliance, não de operação do dia a dia.
     */
    public function auditoria(User $user, ExecucaoVistoria $execucao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $execucao->tenant_id) {
            return false;
        }

        return $user->hasPermission('vistoria.auditoria.view') || $user->hasPermission('vistoria.chefia');
    }
}
