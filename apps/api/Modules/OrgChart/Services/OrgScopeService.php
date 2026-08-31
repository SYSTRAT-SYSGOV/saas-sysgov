<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Models\User;
use App\Support\OrgScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Fachada de escopo organizacional do módulo OrgChart.
 *
 * FASE 3: delega toda a lógica ABAC para o serviço central `App\Support\OrgScope`
 * (fonte única de verdade — RN-GRA-003). Mantém a assinatura original para não quebrar
 * policies, controllers e testes existentes.
 */
final readonly class OrgScopeService
{
    public function __construct(private OrgScope $scope) {}

    /**
     * @return array<int>|null Retorna array de IDs permitidos ou null se o acesso for irrestrito (scope_all).
     */
    public function getAllowedOrgUnitIds(User $user): ?array
    {
        return $this->scope->unitIdsFor($user);
    }

    public function canAccessOrgUnit(User $user, int $orgUnitId): bool
    {
        return $this->scope->canAccessOrgUnit($user, $orgUnitId);
    }

    public function applyScopeToQuery(Builder $query, User $user, string $column = 'org_unit_id'): Builder
    {
        return $this->scope->applyToQuery($query, $user, $column);
    }

    /**
     * @return array{
     *   is_unrestricted: boolean,
     *   allowed_unit_ids: array<int>,
     *   primary_unit: array<string, mixed>|null,
     *   managed_units: array<int, array<string, mixed>>
     * }
     */
    public function getUserScopeSummary(User $user): array
    {
        return $this->scope->getUserScopeSummary($user);
    }
}
