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

        // Fiscal só vê as próprias ordens; chefia (vistoria.ordens.manage ou vistoria.chefia)
        // vê todas do tenant — o escopo por unidade organizacional específica fica pra quando
        // houver necessidade real de um nível de gestão intermediário (hoje só existem os dois
        // papéis: fiscal de campo e chefia com acesso tenant-wide).
        return $ordem->fiscal_id === $user->id || $this->ehChefia($user);
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $this->ehChefia($user);
    }

    public function update(User $user, OrdemServico $ordem): bool
    {
        return $user->is_platform_admin
            || ($this->ehChefia($user) && $user->currentTenantId() === $ordem->tenant_id);
    }

    /** Reatribuir é uma ação de chefia — mesma permissão de `update()`, nome próprio por ser uma ação de negócio distinta. */
    public function reatribuir(User $user, OrdemServico $ordem): bool
    {
        return $this->update($user, $ordem);
    }

    private function ehChefia(User $user): bool
    {
        return $user->hasPermission('vistoria.ordens.manage') || $user->hasPermission('vistoria.chefia');
    }
}
