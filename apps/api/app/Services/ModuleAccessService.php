<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Serviço central de acesso por módulo + secretaria (escopo de dados).
 *
 * Regras:
 * - admin_tenant / super_admin → acesso total (todos os módulos e todas as secretarias).
 * - Demais usuários → a matriz user_module_access define por módulo: quais secretarias
 *   (org_unit_ids, null = todas) e se é administrador do módulo (can_manage_users).
 * - O escopo é expandido hierarquicamente: acessar uma secretaria inclui seus departamentos (path prefix).
 */
final readonly class ModuleAccessService
{
    /**
     * Usuário tem acesso ao módulo (de alguma forma)?
     */
    public function hasModuleAccess(User $user, string $moduleAlias, ?int $tenantId = null): bool
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return false;
        }

        if ($this->isGlobalAdmin($user, $tenantId)) {
            return true;
        }

        return $this->accessesFor($user, $tenantId)
            ->firstWhere('module_alias', $moduleAlias) !== null;
    }

    /**
     * Usuário é administrador do módulo (pode criar/gerenciar usuários SOMENTE neste módulo)?
     */
    public function canManageUsersInModule(User $user, string $moduleAlias, ?int $tenantId = null): bool
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return false;
        }

        if ($this->isGlobalAdmin($user, $tenantId)) {
            return true;
        }

        $access = $this->accessesFor($user, $tenantId)->firstWhere('module_alias', $moduleAlias);

        return $access !== null && $access->can_manage_users;
    }

    /**
     * Módulos liberados para o usuário (aliases), com detalhes de escopo.
     *
     * @return array<int, array{module: string, role: string, all_org_units: bool, org_unit_ids: array<int>, can_manage_users: bool}>
     */
    public function moduleSummary(User $user, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return [];
        }

        if ($this->isGlobalAdmin($user, $tenantId)) {
            return [
                ['module' => '*', 'role' => 'admin', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => true],
            ];
        }

        return $this->accessesFor($user, $tenantId)
            ->map(fn (UserModuleAccess $a): array => [
                'module' => $a->module_alias,
                'role' => $a->role,
                'all_org_units' => $a->isUnrestricted(),
                'org_unit_ids' => $a->org_unit_ids ?? [],
                'can_manage_users' => (bool) $a->can_manage_users,
            ])
            ->values()
            ->all();
    }

    /**
     * IDs de unidades organizacionais permitidas no módulo (null = todas).
     * Expande hierarquicamente: acessar uma secretaria inclui os departamentos (prefixo de path).
     *
     * @return array<int>|null
     */
    public function allowedOrgUnitIds(User $user, string $moduleAlias, ?int $tenantId = null): ?array
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return [];
        }

        if ($this->isGlobalAdmin($user, $tenantId)) {
            return null; // todas
        }

        $access = $this->accessesFor($user, $tenantId)->firstWhere('module_alias', $moduleAlias);

        if ($access === null || $access->isUnrestricted()) {
            return null; // sem acesso ou acesso total
        }

        $ids = $access->org_unit_ids ?? [];

        if ($ids === []) {
            return [];
        }

        // Expansão hierárquica por prefixo de path
        $paths = OrgUnit::query()->whereIn('id', $ids)->pluck('path')->all();
        if ($paths === []) {
            return [];
        }

        return OrgUnit::query()
            ->where(function ($q) use ($paths) {
                foreach ($paths as $path) {
                    $q->orWhere('path', $path)
                      ->orWhere('path', 'like', $path.'.%');
                }
            })
            ->pluck('id')
            ->all();
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

    private function isGlobalAdmin(User $user, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }

    private function resolveTenantId(User $user): ?int
    {
        $context = app(\App\Support\TenantContext::class);
        if ($context->hasTenant()) {
            return $context->id();
        }
        return $user->tenants()->where('tenant_user.status', 'active')->value('tenants.id');
    }
}
