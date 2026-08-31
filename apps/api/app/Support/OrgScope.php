<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Serviço central de escopo organizacional ABAC (RN-GRA-003 / FASE 3).
 *
 * Regras por perfil:
 * - scope_all (Gabinete/Auditoria) → null (todas as unidades)
 * - scope_recursive (responsável da secretaria) → unidade + descendentes via path LIKE
 * - Vínculo direto (membro) → apenas a unidade direta
 *
 * Use `applyToQuery()` nas listagens de TODOS os módulos de negócio para
 * garantir que cada usuário veja apenas os dados do seu escopo hierárquico.
 */
final readonly class OrgScope
{
    /**
     * IDs de unidades organizacionais acessíveis pelo usuário no tenant.
     *
     * @param User $user Usuário logado
     * @param int|null $tenantId ID do tenant (opcional; resolve do TenantContext se omitido)
     * @return array<int>|null Retorna array de IDs ou null se acesso irrestrito (scope_all)
     */
    public function unitIdsFor(User $user, ?int $tenantId = null): ?array
    {
        $tenantId ??= $this->resolveTenantId();

        if ($this->isUnrestricted($user, $tenantId)) {
            return null;
        }

        $links = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->with('orgUnit')
            ->get();

        if ($links->isEmpty()) {
            return [];
        }

        $allowedIds = [];
        $hasRecursiveScope = $this->safeHasPermission($user, 'org.scope_recursive');

        foreach ($links as $link) {
            $unit = $link->orgUnit;
            if ($unit === null || !$unit->is_active) {
                continue;
            }

            $allowedIds[] = $unit->id;

            if ($link->role === 'responsavel' || $hasRecursiveScope) {
                $descendantIds = $unit->getSelfAndDescendantIds();
                $allowedIds = array_merge($allowedIds, $descendantIds);
            }
        }

        return array_values(array_unique($allowedIds));
    }

    /**
     * Aplica o filtro de escopo organizacional em uma query Eloquent.
     *
     * @param Builder $query A query a ser filtrada
     * @param User $user Usuário logado
     * @param string $column Nome da coluna na query (default: org_unit_id)
     * @return Builder Query com escopo aplicado
     */
    public function applyToQuery(Builder $query, User $user, string $column = 'org_unit_id'): Builder
    {
        $allowedIds = $this->unitIdsFor($user);

        if ($allowedIds === null) {
            return $query;
        }

        if ($allowedIds === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn($query->getModel()->qualifyColumn($column), $allowedIds);
    }

    /**
     * Verifica se o usuário pode acessar uma unidade específica.
     */
    public function canAccessOrgUnit(User $user, int $orgUnitId, ?int $tenantId = null): bool
    {
        $allowedIds = $this->unitIdsFor($user, $tenantId);

        if ($allowedIds === null) {
            return true;
        }

        return in_array($orgUnitId, $allowedIds, true);
    }

    /**
     * Resumo do escopo do usuário para uso em filtros do frontend.
     *
     * @return array{is_unrestricted: bool, allowed_unit_ids: array<int>, primary_unit: array|null, managed_units: array<int, array>}
     */
    public function getUserScopeSummary(User $user): array
    {
        $allowedIds = $this->unitIdsFor($user);
        $isUnrestricted = ($allowedIds === null);

        $primaryLink = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->where('is_primary', true)
            ->with('orgUnit')
            ->first();

        $managedLinks = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->where('role', 'responsavel')
            ->with('orgUnit')
            ->get();

        return [
            'is_unrestricted' => $isUnrestricted,
            'allowed_unit_ids' => $allowedIds ?? OrgUnit::query()->pluck('id')->all(),
            'primary_unit' => $primaryLink?->orgUnit ? [
                'id' => $primaryLink->orgUnit->id,
                'name' => $primaryLink->orgUnit->name,
                'code' => $primaryLink->orgUnit->code,
                'acronym' => $primaryLink->orgUnit->acronym,
                'role' => $primaryLink->role,
            ] : null,
            'managed_units' => $managedLinks->filter(fn ($l) => $l->orgUnit !== null)->map(fn ($l) => [
                'id' => $l->orgUnit->id,
                'name' => $l->orgUnit->name,
                'code' => $l->orgUnit->code,
                'acronym' => $l->orgUnit->acronym,
            ])->values()->all(),
        ];
    }

    private function isUnrestricted(User $user, ?int $tenantId): bool
    {
        if ((bool) $user->getAttribute('is_platform_admin')) {
            return true;
        }

        if ($this->safeHasPermission($user, 'org.scope_all')) {
            return true;
        }

        foreach (['super_admin', 'admin_tenant', 'auditor'] as $role) {
            try {
                if ($user->hasRole($role, $tenantId)) {
                    return true;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return false;
    }

    private function safeHasPermission(User $user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (\Throwable) {
            return false;
        }
    }

    private function resolveTenantId(): ?int
    {
        try {
            $context = app(TenantContext::class);
            return $context->hasTenant() ? $context->id() : null;
        } catch (\Throwable) {
            return null;
        }
    }
}