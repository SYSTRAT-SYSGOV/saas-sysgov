<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\Reinspecao;

final class ReinspecaoPolicy
{
    public function view(User $user, Reinspecao $reinspecao): bool
    {
        return $this->acessoBasico($user, $reinspecao);
    }

    public function constatar(User $user, Reinspecao $reinspecao): bool
    {
        return $this->acessoBasico($user, $reinspecao);
    }

    private function acessoBasico(User $user, Reinspecao $reinspecao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if ($user->currentTenantId() !== $reinspecao->tenant_id || ! $user->hasPermission('vistoria.view')) {
            return false;
        }

        return $reinspecao->ordemServicoReinspecao?->fiscal_id === $user->id
            || $user->hasPermission('vistoria.ordens.manage')
            || $user->hasPermission('vistoria.chefia');
    }
}
