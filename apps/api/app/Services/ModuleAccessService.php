<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantModuleOrgUnit;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
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
 *
 * RN-ACC-001: vigência — acesso com valid_to no passado ou status=revoked/expired NÃO concede acesso.
 * RN-ACC-002: delegação — admin de módulo só gerencia seu módulo e suas secretarias.
 * RN-ACC-003: rastreabilidade — toda concessão/revogação/renovação registra auditoria.
 * RN-ACC-005: revogação é LÓGICA (status=revoked), nunca delete físico.
 */
final class ModuleAccessService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ModuleOrgUnitService $moduleOrgUnit,
        private readonly AccessService $access,
    ) {}

    /**
     * Usuário tem acesso ao módulo (de alguma forma)? Respeita vigência e status (RN-ACC-001).
     * FASE 1: delega ao AccessService único (unifica user_module_access + access_group_access + gate tenant_module.enabled).
     */
    public function hasModuleAccess(User $user, string $moduleAlias, ?int $tenantId = null, ?int $orgUnitId = null): bool
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return false;
        }

        return $this->access->canAccessModule($user, $moduleAlias, $tenantId, $orgUnitId);
    }

    /**
     * Usuário é administrador do módulo (pode criar/gerenciar usuários SOMENTE neste módulo)?
     * Respeita vigência e status (RN-ACC-001).
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

        return $access !== null && $access->isActive() && $access->can_manage_users;
    }

    /**
     * Módulos liberados para o usuário (aliases), com detalhes de escopo e vigência.
     *
     * @return array<int, array{module: string, role: string, all_org_units: bool, org_unit_ids: array<int>, can_manage_users: bool, status: string, valid_to: string|null, expiring: bool}>
     */
    public function moduleSummary(User $user, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->resolveTenantId($user);

        if ($tenantId === null) {
            return [];
        }

        if ($this->isGlobalAdmin($user, $tenantId)) {
            return [
                ['module' => '*', 'role' => 'admin', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => true, 'status' => UserModuleAccess::STATUS_ACTIVE, 'valid_to' => null, 'expiring' => false],
            ];
        }

        return $this->accessesFor($user, $tenantId)
            ->map(fn (UserModuleAccess $a): array => [
                'module' => $a->module_alias,
                'role' => $a->role,
                'all_org_units' => $a->isUnrestricted(),
                'org_unit_ids' => $a->org_unit_ids ?? [],
                'can_manage_users' => (bool) $a->can_manage_users,
                'status' => $a->status,
                'valid_to' => $a->valid_to?->toISOString(),
                'expiring' => $a->isExpiring(30),
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

        if ($access === null || !$access->isActive() || $access->isUnrestricted()) {
            return null; // sem acesso, expirado/revogado ou acesso total
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
     * Aplica escopo de unidades organizacionais a uma query para o módulo especificado.
     *
     * Combina dois filtros:
     * 1. user_module_access.org_unit_ids (matriz de acesso) — expansão hierárquica via path
     * 2. ModuleOrgUnitService — granularidade módulo×org_unit (tenant habilitou módulo na unidade?)
     *
     * @param Builder $query A query a ser filtrada (deve ter coluna org_unit_id ou similar)
     * @param User $user Usuário logado
     * @param string $moduleAlias Alias do módulo sendo acessado
     * @param int $tenantId ID do tenant
     * @param string $column Nome da coluna na query (default: org_unit_id)
     * @return Builder Query com escopo aplicado
     */
    public function scopeQuery(Builder $query, User $user, string $moduleAlias, int $tenantId, string $column = 'org_unit_id'): Builder
    {
        $allowedFromAccess = $this->allowedOrgUnitIds($user, $moduleAlias, $tenantId);

        if ($allowedFromAccess === null) {
            return $this->applyGranularityFilter($query, $tenantId, $column);
        }

        if ($allowedFromAccess === []) {
            return $query->whereRaw('1 = 0');
        }

        $module = \Modules\Admin\Models\Module::where('alias', $moduleAlias)->first();
        $moduleId = $module?->id;

        if (!$moduleId) {
            return $query->whereRaw('1 = 0');
        }

        $qualifiedColumn = $query->getModel()->qualifyColumn($column);

        return $query->where(function ($q) use ($qualifiedColumn, $allowedFromAccess, $tenantId, $moduleId) {
            $q->whereIn($qualifiedColumn, $allowedFromAccess);

            $granularityEnabled = \Illuminate\Support\Facades\Cache::remember(
                "module_org_unit:enabled:{$tenantId}:{$moduleId}",
                60,
                fn () => TenantModuleOrgUnit::query()
                    ->where('tenant_id', $tenantId)
                    ->where('module_id', $moduleId)
                    ->where('enabled', true)
                    ->exists()
            );

            if ($granularityEnabled) {
                $enabledUnits = \Modules\OrgChart\Models\OrgUnit::query()
                    ->where('tenant_id', $tenantId)
                    ->get()
                    ->filter(fn ($unit) => app(ModuleOrgUnitService::class)->isModuleEnabledForUnit($tenantId, $moduleId, $unit->id))
                    ->pluck('id')
                    ->all();

                if ($enabledUnits !== []) {
                    $q->whereIn($qualifiedColumn, $enabledUnits);
                } else {
                    $q->whereRaw('1 = 0');
                }
            }
        });
    }

    private function applyGranularityFilter(Builder $query, int $tenantId, string $column): Builder
    {
        $module = $query->getModel()::class;
        $qualifiedColumn = $query->getModel()->qualifyColumn($column);

        $moduleAlias = $this->inferModuleAlias($module);
        if (!$moduleAlias) {
            return $query;
        }

        $moduleModel = \Modules\Admin\Models\Module::where('alias', $moduleAlias)->first();
        if (!$moduleModel) {
            return $query;
        }

        $granularityEnabled = TenantModuleOrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->where('module_id', $moduleModel->id)
            ->where('enabled', true)
            ->exists();

        if (!$granularityEnabled) {
            return $query;
        }

        $enabledUnits = \Modules\OrgChart\Models\OrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->get()
            ->filter(fn ($unit) => app(ModuleOrgUnitService::class)->isModuleEnabledForUnit($tenantId, $moduleModel->id, $unit->id))
            ->pluck('id')
            ->all();

        if ($enabledUnits === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn($qualifiedColumn, $enabledUnits);
    }

    private function inferModuleAlias(string $modelClass): ?string
    {
        $map = [
            \Modules\Procurement\Models\Licitacao::class => 'procurement',
            \Modules\Contracts\Models\Contract::class => 'contracts',
            \Modules\Finance\Models\FinanceEntry::class => 'finance',
            \Modules\OrgChart\Models\OrgUnit::class => 'org',
        ];

        return $map[$modelClass] ?? null;
    }

    /**
     * RN-ACC-002: o grantor pode conceder/gerenciar acesso no módulo e nas secretarias do target?
     * - Admin geral (admin_tenant / platform_admin / suporte) → pode tudo no tenant.
     * - Admin de módulo → só o seu módulo; e só secretarias dentro do seu próprio escopo.
     *
     * @param array<int> $orgUnitIds
     */
    public function canGrantTo(User $grantor, string $moduleAlias, int $tenantId, array $orgUnitIds): bool
    {
        if ($this->isGlobalAdmin($grantor, $tenantId)) {
            return true;
        }

        // Admin de módulo: só o módulo que administra
        if (!$this->canManageUsersInModule($grantor, $moduleAlias, $tenantId)) {
            return false;
        }

        // Secretarias: null = todas (só quem já tem todas pode conceder todas)
        $allowed = $this->allowedOrgUnitIds($grantor, $moduleAlias, $tenantId);
        if ($orgUnitIds === []) {
            // Escopo vazio não pode ser concedido por módulo-admin
            return false;
        }

        // Módulo-admin sem escopo próprio não pode conceder nenhuma secretaria
        if ($allowed === null) {
            // Já passou pelo isGlobalAdmin, então chegou aqui com acesso total via matriz?
            $access = $this->accessesFor($grantor, $tenantId)->firstWhere('module_alias', $moduleAlias);
            if ($access === null || !$access->isUnrestricted()) {
                return false;
            }
            return true;
        }

        // Módulo-admin com escopo restrito: cada secretaria do target deve estar no seu escopo
        return array_diff($orgUnitIds, $allowed) === [];
    }

    /**
     * RN-ACC-003: concede ou atualiza o acesso de um usuário a um módulo, com rastreabilidade.
     *
     * @param array{role?: string, org_unit_ids?: array<int>|null, can_manage_users?: bool, can_create?: bool, can_edit?: bool, can_delete?: bool, valid_to?: Carbon|string|null, valid_from?: Carbon|string|null} $data
     */
    public function grantAccess(User $user, int $tenantId, string $moduleAlias, array $data, User $grantedBy): UserModuleAccess
    {
        $before = null;
        $access = UserModuleAccess::query()
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->where('module_alias', $moduleAlias)
            ->first();

        if ($access) {
            $before = $access->toArray();
        }

        $validTo = isset($data['valid_to']) ? $this->normalizeDate($data['valid_to']) : ($access->valid_to ?? null);
        $validFrom = isset($data['valid_from']) ? $this->normalizeDate($data['valid_from']) : ($access->valid_from ?? now());

        $attributes = [
            'role' => $data['role'] ?? $access->role ?? 'viewer',
            'org_unit_ids' => array_key_exists('org_unit_ids', $data) ? $data['org_unit_ids'] : ($access->org_unit_ids ?? null),
            'can_manage_users' => (bool) ($data['can_manage_users'] ?? $access->can_manage_users ?? false),
            'can_create' => (bool) ($data['can_create'] ?? $access->can_create ?? false),
            'can_edit' => (bool) ($data['can_edit'] ?? $access->can_edit ?? false),
            'can_delete' => (bool) ($data['can_delete'] ?? $access->can_delete ?? false),
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
            'status' => UserModuleAccess::STATUS_ACTIVE,
            'granted_by' => $grantedBy->getKey(),
        ];

        if ($access) {
            $access->fill($attributes)->save();
        } else {
            $access = UserModuleAccess::create([
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'module_alias' => $moduleAlias,
                ...$attributes,
            ]);
        }

        $this->forgetCache($user->id, $tenantId);
        $this->audit->record('access', 'access.granted', "user:{$user->id}:module:{$moduleAlias}", $before, $access->fresh()->toArray());

        return $access->fresh();
    }

    /**
     * RN-ACC-005: revogação LÓGICA — marca status=revoked, preserva histórico e auditoria.
     */
    public function revokeAccess(UserModuleAccess $access, User $revokedBy, ?string $reason = null): void
    {
        $before = $access->toArray();

        $access->forceFill([
            'status' => UserModuleAccess::STATUS_REVOKED,
        ])->save();

        $this->forgetCache($access->user_id, $access->tenant_id);
        $this->audit->record('access', 'access.revoked', "user:{$access->user_id}:module:{$access->module_alias}", $before, $access->fresh()->toArray());
        $this->outbox->publish('AccessRevoked', [
            'user_id' => $access->user_id,
            'tenant_id' => $access->tenant_id,
            'module_alias' => $access->module_alias,
            'revoked_by' => $revokedBy->getKey(),
            'reason' => $reason,
            'revoked_at' => now()->toISOString(),
        ], $access->tenant_id);
    }

    /**
     * RN-ACC-001/003: renova/estende a vigência de um acesso e o reativa se estiver revogado/expirado.
     */
    public function renewAccess(UserModuleAccess $access, ?Carbon $validTo = null): void
    {
        $before = $access->toArray();

        $access->forceFill([
            'status' => UserModuleAccess::STATUS_ACTIVE,
            'valid_to' => $validTo ?? $access->valid_to?->copy()->addDays(30) ?? now()->addDays(30),
        ])->save();

        $this->forgetCache($access->user_id, $access->tenant_id);
        $this->audit->record('access', 'access.renewed', "user:{$access->user_id}:module:{$access->module_alias}", $before, $access->fresh()->toArray());
        $this->outbox->publish('AccessRenewed', [
            'user_id' => $access->user_id,
            'tenant_id' => $access->tenant_id,
            'module_alias' => $access->module_alias,
            'valid_to' => $access->fresh()->valid_to?->toISOString(),
            'renewed_at' => now()->toISOString(),
        ], $access->tenant_id);
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

    private function forgetCache(int $userId, int $tenantId): void
    {
        Cache::forget("user:{$userId}:module_access:{$tenantId}");
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

    private function normalizeDate(Carbon|string|null $value): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        return $value instanceof Carbon ? $value : Carbon::parse($value);
    }
}
