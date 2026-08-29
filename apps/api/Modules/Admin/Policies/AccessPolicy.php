<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

final class AccessPolicy
{
    use HandlesAuthorization;

    public function __construct(
        private readonly ModuleAccessService $access,
    ) {}

    /**
     * Admin geral (admin_tenant / platform_admin) pode ver tudo.
     * Admin de módulo vê apenas o que gerencia.
     */
    public function viewAny(User $user, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }

    /**
     * Conceder acesso: admin geral pode tudo; admin de módulo só no seu escopo.
     *
     * @param array<int> $orgUnitIds
     */
    public function create(User $user, int $tenantId, string $moduleAlias, array $orgUnitIds): bool
    {
        return $this->access->canGrantTo($user, $moduleAlias, $tenantId, $orgUnitIds);
    }

    /**
     * Revogar: admin geral ou admin do módulo (que gerencia o acesso).
     */
    public function revoke(User $user, UserModuleAccess $access, int $tenantId): bool
    {
        return $this->access->canGrantTo($user, $access->module_alias, $tenantId, $access->org_unit_ids ?? []);
    }

    /**
     * Renovar: mesmas regras da revogação.
     */
    public function renew(User $user, UserModuleAccess $access, int $tenantId): bool
    {
        return $this->access->canGrantTo($user, $access->module_alias, $tenantId, $access->org_unit_ids ?? []);
    }
}