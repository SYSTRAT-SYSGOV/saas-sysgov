<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class DocumentoPolicy
{
    /** Emissão de um novo documento a partir de uma execução — sem instância prévia de Documento. */
    public function emitir(User $user, ExecucaoVistoria $execucao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $execucao->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $execucao->fiscal_id === $user->id || $user->hasPermission('vistoria.ordens.manage');
    }

    public function view(User $user, Documento $documento): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $documento->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $documento->execucao->fiscal_id === $user->id || $user->hasPermission('vistoria.ordens.manage');
    }
}
