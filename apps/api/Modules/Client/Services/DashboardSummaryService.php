<?php

declare(strict_types=1);

namespace Modules\Client\Services;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Modules\Admin\Models\Module;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgScopeService;

/**
 * Os quatro cards básicos da home do Cliente. São indicadores de base do tenant, que existem em qualquer prefeitura
 * independentemente dos módulos contratados; por isso não passam pelo Gate `module`.
 * `tone` é só o nome da cor; quem desenha escolhe as classes.
 */
final class DashboardSummaryService
{
    /**
     * @return list<array{key: string, label: string, value: int, caption: string, tone: string}>
     */
    public function para(User $user): array
    {
        $tenant = Tenant::query()->findOrFail(app(TenantContext::class)->id());

        return [
            ['key' => 'unidades', 'label' => 'Unidades', 'value' => $this->contarUnidades($user), 'caption' => 'na estrutura organizacional', 'tone' => 'blue'],
            ['key' => 'usuarios', 'label' => 'Usuários', 'value' => $this->contarUsuarios($tenant), 'caption' => 'ativos no órgão', 'tone' => 'emerald'],
            ['key' => 'perfis', 'label' => 'Perfis de acesso', 'value' => Role::query()->where('tenant_id', $tenant->id)->count(), 'caption' => 'cadastrados', 'tone' => 'amber'],
            ['key' => 'modulos', 'label' => 'Módulos ativos', 'value' => $this->contarModulos($tenant), 'caption' => 'contratados pelo órgão', 'tone' => 'violet'],
        ];
    }

    /**
     * Unidades que o usuário enxerga, com a mesma regra da árvore de unidades da tela: com acesso irrestrito, todas as
     * ativas; senão, a unidade principal mais as que ele gerencia.
     */
    private function contarUnidades(User $user): int
    {
        $escopo = app(OrgScopeService::class)->getUserScopeSummary($user);

        if ($escopo['is_unrestricted']) {
            return OrgUnit::query()->where('is_active', true)->count();
        }

        $ids = array_map(static fn (array $u): int => (int) $u['id'], $escopo['managed_units']);
        if ($escopo['primary_unit'] !== null) {
            $ids[] = (int) $escopo['primary_unit']['id'];
        }

        return count(array_unique($ids));
    }

    private function contarUsuarios(Tenant $tenant): int
    {
        return $tenant->users()
            ->wherePivot('status', 'active')
            ->where('users.is_active', true)
            ->distinct()
            ->count('users.id');
    }

    /** Módulos contratados e ligados no catálogo, sem os de base (painel e usuários), que todo tenant tem. */
    private function contarModulos(Tenant $tenant): int
    {
        return $tenant->modules()
            ->wherePivot('enabled', true)
            ->where('modules.enabled', true)
            ->whereNotIn('modules.alias', Module::BASE)
            ->count();
    }
}
