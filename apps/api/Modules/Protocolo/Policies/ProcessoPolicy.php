<?php

declare(strict_types=1);

namespace Modules\Protocolo\Policies;

use App\Models\User;
use App\Support\OrgScope;
use Modules\Protocolo\Models\Processo;

final class ProcessoPolicy
{
    public function __construct(
        private readonly OrgScope $orgScope
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.processos.view');
    }

    public function view(User $user, Processo $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (!$user->hasPermission('protocolo.processos.view')) {
            return false;
        }

        // Verifica escopo por unidade organizacional (órgão atual ou de origem)
        return $this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
            || $this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id);
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.processos.create');
    }

    public function update(User $user, Processo $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (!$user->hasPermission('protocolo.processos.update')) {
            return false;
        }

        return $this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id);
    }

    public function tramitar(User $user, Processo $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (!$user->hasPermission('protocolo.processos.tramitar')) {
            return false;
        }

        return $this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id);
    }

    public function vincular(User $user, Processo $processo): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (!$user->hasPermission('protocolo.processos.vincular')) {
            return false;
        }

        return $this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id);
    }

    public function promoverRequerimento(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.processos.promover_requerimento');
    }

    public function rastrear(User $user): bool
    {
        return $user->is_platform_admin
            || $user->hasPermission('protocolo.processos.rastrear')
            || $user->hasPermission('protocolo.processos.view');
    }

    public function relatorios(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.processos.relatorios');
    }

    public function delete(User $user, Processo $processo): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.processos.delete');
    }
}
