<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;

/** Relatórios obrigatórios são atribuição da chefia (spec `relatorios-e-indicadores`). */
final readonly class RelatorioAmbientalPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.chefia');
    }

    public function view(User $user, RelatorioAmbiental $relatorio): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.chefia') && $this->mesmoTenant($relatorio);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.chefia');
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(RelatorioAmbiental $relatorio): bool
    {
        return $relatorio->tenant_id === app(TenantContext::class)->id();
    }
}
