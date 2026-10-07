<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class ProcessoSancionatorioPolicy
{
    public function view(User $user, ProcessoSancionatorio $processo): bool
    {
        return $this->acessoBasico($user, $processo);
    }

    /** Registrar defesa/recurso é ato cartorário (o autuado não é usuário do sistema) — mesmo acesso básico. */
    public function registrarManifestacao(User $user, ProcessoSancionatorio $processo): bool
    {
        return $this->acessoBasico($user, $processo);
    }

    /** Julgar (processo ou recurso) é ato de decisão — exclusivo da chefia da Secretaria. */
    public function julgar(User $user, ProcessoSancionatorio $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $user->currentTenantId() === $processo->tenant_id && $user->hasPermission('vistoria.chefia');
    }

    private function acessoBasico(User $user, ProcessoSancionatorio $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $processo->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $processo->documento->execucao->fiscal_id === $user->id
            || $user->hasPermission('vistoria.ordens.manage')
            || $user->hasPermission('vistoria.chefia');
    }
}
