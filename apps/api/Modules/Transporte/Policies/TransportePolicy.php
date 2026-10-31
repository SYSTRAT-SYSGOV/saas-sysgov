<?php

declare(strict_types=1);

namespace Modules\Transporte\Policies;

use App\Models\User;
use App\Support\TenantContext;

/** Regras de acesso do módulo, sempre no servidor (design D2). As Fases 2 a 4 acrescentam os métodos das demais permissões. */
final class TransportePolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function ver(User $user): bool
    {
        return $this->algumaDe($user, ['transporte.view', 'transporte.frota.manage', 'transporte.rotas.manage', 'transporte.alocacoes.manage', 'transporte.censo.export']);
    }

    public function gerenciarFrota(User $user): bool
    {
        return $this->algumaDe($user, ['transporte.frota.manage']);
    }

    public function auditar(User $user): bool
    {
        return $this->algumaDe($user, ['transporte.audit']);
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
}
