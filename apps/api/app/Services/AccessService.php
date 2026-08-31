<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccessGroupAccess;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Serviço ÚNICO de avaliação de acesso a módulos (FASE 1 — RN-AUT-001).
 *
 * Centraliza as 3 vias de acesso que antes divergiam:
 *   1. admin_tenant / platform_admin / support_analyst  → acesso total
 *   2. Gate tenant_module.enabled (módulo ativo no tenant)  → RN-GRA-005
 *   3. user_module_access (direto) OU access_group_access (via grupo), ambos com vigência
 *
 * Hierarquia de autorização:
 *   admin_tenant → tudo
 *   senão → tenant_module.enabled (gate) → user_module_access OU access_group_access (com vigência)
 *
 * NUNCA um módulo desativado no tenant concede acesso, mesmo com user_module_access.
 */
final class AccessService
{
    public function __construct(
        private readonly ModuleOrgUnitService $moduleOrgUnit,
    ) {}

    /**
     * Usuário tem acesso ao módulo? (RN-AUT-001 + RN-GRA-005 + RN-ACC-001)
     */
    public function canAccessModule(User $user, string $moduleAlias, ?int $tenantId = null, ?int $orgUnitId = null): bool
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return false;
        }

        // 1. Admin global → acesso total
        if ($this->isGlobalAdmin($user, $tenantId)) {
            return true;
        }

        // 2. GATE: módulo ativo no tenant (RN-GRA-005)
        if (!$this->isModuleEnabledForTenant($tenantId, $moduleAlias)) {
            return false;
        }

        // 3. Granularidade por unidade (RN-GRA-004) — se a unidade foi explicitada
        if ($orgUnitId !== null) {
            $module = $this->moduleByAlias($moduleAlias);
            if ($module && !$this->moduleOrgUnit->isModuleEnabledForUnit($tenantId, $module->id, $orgUnitId)) {
                return false;
            }
        }

        // 4. Acesso direto (user_module_access) OU grupo (access_group_access), com vigência
        return $this->hasDirectOrGroupAccess($user, $tenantId, $moduleAlias);
    }

    /**
     * Acesso via matriz direta (user_module_access) ou herdado de grupo (access_group_access).
     * Ambos respeitam vigência/status (RN-ACC-001).
     */
    private function hasDirectOrGroupAccess(User $user, int $tenantId, string $moduleAlias): bool
    {
        // Via user_module_access (status active + vigência válida)
        $direct = $this->accessesFor($user, $tenantId)
            ->firstWhere('module_alias', $moduleAlias);

        if ($direct !== null && $direct->isActive()) {
            return true;
        }

        // Via access_group_access (grupos do usuário no tenant, com vigência)
        return AccessGroupAccess::query()
            ->where('module_alias', $moduleAlias)
            ->where('tenant_id', $tenantId)
            ->where(function ($q): void {
                $q->whereNull('valid_to')->orWhere('valid_to', '>', now());
            })
            ->whereHas('group', function ($q) use ($user, $tenantId): void {
                $q->where('tenant_id', $tenantId)
                  ->where('is_active', true)
                  ->whereHas('users', fn ($uq) => $uq->where('users.id', $user->id));
            })
            ->exists();
    }

    /**
     * Módulo está habilitado no tenant? (gate tenant_module.enabled)
     */
    public function isModuleEnabledForTenant(int $tenantId, string $moduleAlias): bool
    {
        return (bool) \Modules\Admin\Models\Module::query()
            ->where('alias', $moduleAlias)
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_module.enabled', true))
            ->exists();
    }

    private function moduleByAlias(string $moduleAlias): ?\Modules\Admin\Models\Module
    {
        return Cache::remember("module:alias:{$moduleAlias}", 300, function () use ($moduleAlias): ?\Modules\Admin\Models\Module {
            return \Modules\Admin\Models\Module::where('alias', $moduleAlias)->first();
        });
    }

    /**
     * @return Collection<int, UserModuleAccess>
     */
    private function accessesFor(User $user, int $tenantId): Collection
    {
        return Cache::remember("user:{$user->id}:module_access:{$tenantId}", 300, function () use ($user, $tenantId): Collection {
            return UserModuleAccess::query()
                ->where('user_id', $user->id)
                ->where('tenant_id', $tenantId)
                ->get();
        });
    }

    public function isGlobalAdmin(User $user, int $tenantId): bool
    {
        return (bool) $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }

    private function resolveTenantId(User $user): ?int
    {
        $context = app(TenantContext::class);
        if ($context->hasTenant()) {
            return $context->id();
        }
        return $user->tenants()->where('tenant_user.status', 'active')->value('tenants.id');
    }
}
