<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\Processo;

final class ProcessoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasPermission($user, 'licita.view');
    }

    public function view(User $user, Processo $processo): bool
    {
        return $this->hasPermission($user, 'licita.view') && $processo->tenant_id === app(TenantContext::class)->id();
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.create');
    }

    public function update(User $user, Processo $processo): bool
    {
        return $this->hasPermission($user, 'licita.update') && $processo->tenant_id === app(TenantContext::class)->id();
    }

    /**
     * Solicitar a aprovação final é uma ação de edição do processo (mesma
     * permissão de editar os documentos) — quem monta o pacote de artefatos
     * é a equipe de planejamento.
     */
    public function solicitarAprovacaoFinal(User $user, Processo $processo): bool
    {
        return $this->update($user, $processo);
    }

    /**
     * Aprovar/rejeitar o pacote final é uma permissão distinta ("licita.aprovar"
     * é usada só pelo DFD) — reservada ao Ordenador de Despesas.
     */
    public function aprovarFinal(User $user, Processo $processo): bool
    {
        return $this->hasPermission($user, 'licita.aprovar_final') && $processo->tenant_id === app(TenantContext::class)->id();
    }

    public function rejeitarFinal(User $user, Processo $processo): bool
    {
        return $this->aprovarFinal($user, $processo);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}
