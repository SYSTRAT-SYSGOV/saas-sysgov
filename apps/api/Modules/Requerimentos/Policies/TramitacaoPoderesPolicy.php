<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Policies;

use App\Models\User;
use Modules\Requerimentos\Models\TramitacaoPoderes;
use Modules\Requerimentos\Policies\Concerns\PermissoesRequerimentos;

final class TramitacaoPoderesPolicy
{
    use PermissoesRequerimentos;

    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.view');
    }

    public function view(User $user, TramitacaoPoderes $tramitacao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (! $this->doTenant($tramitacao)) {
            return false;
        }

        // Usuários envolvidos na tramitação podem ver
        if ($tramitacao->remetente_id === $user->id || $tramitacao->responsavel_id === $user->id) {
            return true;
        }

        return $user->hasPermission('requerimentos.view');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.tramitar');
    }

    public function encaminhar(User $user, TramitacaoPoderes $tramitacao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        // Apenas usuários do Poder de origem podem encaminhar
        return $this->doTenant($tramitacao)
            && $user->hasPermission('requerimentos.tramitar');
    }

    public function registrarRecebimento(User $user, TramitacaoPoderes $tramitacao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        // Apenas usuários do Poder de destino podem registrar recebimento
        return $this->doTenant($tramitacao)
            && $user->hasPermission('requerimentos.tramitar');
    }
}