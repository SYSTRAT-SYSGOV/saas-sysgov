<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Throwable;

final readonly class OrgScopeService
{
    /**
     * Resolve a lista de IDs de unidades organizacionais acessíveis pelo usuário no tenant ativo.
     * Implementa o escopo de dados ABAC (RN-ORG-008):
     * - `org.scope_all` (raiz/auditoria/gabinete): acesso irrestrito a todas as unidades do tenant (retorna null indicando "sem filtro").
     * - `org.scope_recursive` (responsável de secretaria/departamento): retorna a unidade direta + todos os seus descendentes.
     * - Vínculo direto (membro): retorna apenas as unidades onde o usuário está diretamente lotado.
     *
     * @return array<int>|null Retorna array de IDs permitidos ou null se o acesso for irrestrito (scope_all).
     */
    public function getAllowedOrgUnitIds(User $user): ?array
    {
        // 1. Se for platform admin, super admin, admin do tenant, auditor ou possuir permissão org.scope_all
        if (
            (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant', 'auditor'])
            || $this->safeHasPermission($user, 'org.scope_all')
        ) {
            return null; // Acesso global sem restrição
        }

        // 2. Busca todos os vínculos do usuário com unidades organizacionais
        $links = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->with('orgUnit')
            ->get();

        if ($links->isEmpty()) {
            return []; // Usuário sem nenhum vínculo não acessa dados departamentais
        }

        $allowedIds = [];
        $hasRecursiveScope = $this->safeHasPermission($user, 'org.scope_recursive');

        foreach ($links as $link) {
            /** @var OrgUnit|null $unit */
            $unit = $link->orgUnit;
            if ($unit === null || !$unit->is_active) {
                continue;
            }

            $allowedIds[] = $unit->id;

            // Se for responsável da unidade ou tiver permissão org.scope_recursive, inclui toda a subárvore
            if ($link->role === 'responsavel' || $hasRecursiveScope) {
                $descendantIds = $unit->getSelfAndDescendantIds();
                $allowedIds = array_merge($allowedIds, $descendantIds);
            }
        }

        return array_values(array_unique($allowedIds));
    }

    /**
     * Verifica se o usuário tem autorização para visualizar ou atuar sobre uma unidade específica.
     */
    public function canAccessOrgUnit(User $user, int $orgUnitId): bool
    {
        $allowedIds = $this->getAllowedOrgUnitIds($user);

        if ($allowedIds === null) {
            return true; // Acesso irrestrito
        }

        return in_array($orgUnitId, $allowedIds, true);
    }

    /**
     * Aplica o filtro de escopo organizacional em uma query Eloquent (ABAC).
     */
    public function applyScopeToQuery(Builder $query, User $user, string $column = 'org_unit_id'): Builder
    {
        $allowedIds = $this->getAllowedOrgUnitIds($user);

        if ($allowedIds === null) {
            return $query; // Não filtra
        }

        if (empty($allowedIds)) {
            return $query->whereRaw('1 = 0'); // Bloqueia resultados
        }

        return $query->whereIn($query->getModel()->qualifyColumn($column), $allowedIds);
    }

    /**
     * Retorna resumo do escopo do usuário para uso em filtros do frontend.
     *
     * @return array{
     *   is_unrestricted: boolean,
     *   allowed_unit_ids: array<int>,
     *   primary_unit: array<string, mixed>|null,
     *   managed_units: array<int, array<string, mixed>>
     * }
     */
    public function getUserScopeSummary(User $user): array
    {
        $allowedIds = $this->getAllowedOrgUnitIds($user);
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
            'managed_units' => $managedLinks->filter(fn($l) => $l->orgUnit !== null)->map(fn($l) => [
                'id' => $l->orgUnit->id,
                'name' => $l->orgUnit->name,
                'code' => $l->orgUnit->code,
                'acronym' => $l->orgUnit->acronym,
            ])->values()->all(),
        ];
    }

    /**
     * @param array<int, string>|string $roles
     */
    private function safeHasRole(User $user, array|string $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];
        foreach ($roles as $role) {
            try {
                if ($user->hasRole($role)) {
                    return true;
                }
            } catch (Throwable) {
                continue;
            }
        }

        return false;
    }

    private function safeHasPermission(User $user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (Throwable) {
            return false;
        }
    }
}
