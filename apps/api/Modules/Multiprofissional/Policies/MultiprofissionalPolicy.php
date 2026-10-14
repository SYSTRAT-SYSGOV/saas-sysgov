<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Models\Profissional;

/**
 * Regras de acesso do módulo (design D6–D9), sempre no servidor:
 * - dados clínicos (condições/CID e laudos) só para quem acompanha ou gerencia;
 * - relato de atendimento sigiloso só para o autor, os profissionais do atendimento e quem gerencia;
 * - atendimento é editado pelo autor (com permissão de atender) ou por quem gerencia.
 */
final class MultiprofissionalPolicy
{
    public function __construct(
        private readonly TenantContext $tenant,
    ) {}

    public function ver(User $user): bool
    {
        return $this->algumaDe($user, ['multiprofissional.view', 'multiprofissional.atender', 'multiprofissional.acompanhar', 'multiprofissional.manage']);
    }

    public function atender(User $user): bool
    {
        return $this->algumaDe($user, ['multiprofissional.atender', 'multiprofissional.manage']);
    }

    /** Acesso aos dados clínicos: condições (CID) e laudos. */
    public function acompanhar(User $user): bool
    {
        return $this->algumaDe($user, ['multiprofissional.acompanhar', 'multiprofissional.manage']);
    }

    public function gerenciar(User $user): bool
    {
        return $this->algumaDe($user, ['multiprofissional.manage']);
    }

    public function auditar(User $user): bool
    {
        return $this->algumaDe($user, ['multiprofissional.audit', 'multiprofissional.manage']);
    }

    public function verRelato(User $user, Atendimento $atendimento): bool
    {
        if (!$this->doTenant($atendimento) || !$this->ver($user)) {
            return false;
        }
        if (!$atendimento->sigiloso || $this->gerenciar($user) || $atendimento->criado_por === $user->id) {
            return true;
        }

        return $atendimento->profissionais()->where('multi_profissionais.user_id', $user->id)->exists();
    }

    public function editarAtendimento(User $user, Atendimento $atendimento): bool
    {
        return $this->doTenant($atendimento)
            && ($this->gerenciar($user) || ($this->atender($user) && $atendimento->criado_por === $user->id));
    }

    /** Profissional do usuário logado no tenant, se houver (usado para sugerir o próprio nome no atendimento). */
    public function profissionalDoUsuario(User $user): ?Profissional
    {
        return Profissional::query()->where('user_id', $user->id)->first();
    }

    /** @param list<string> $permissoes */
    private function algumaDe(User $user, array $permissoes): bool
    {
        if (!$this->tenant->hasTenant()) {
            return false;
        }
        foreach ($permissoes as $permissao) {
            if ($user->hasPermission($permissao, $this->tenant->id())) {
                return true;
            }
        }

        return false;
    }

    private function doTenant(Atendimento $atendimento): bool
    {
        return $this->tenant->hasTenant() && $atendimento->tenant_id === $this->tenant->id();
    }
}
