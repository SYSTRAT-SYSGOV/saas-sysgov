<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleAccessService;
use App\Support\TenantContext;
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
     *
     * NOTA: Gate passa o nome da classe (string) como argumento posicional quando
     * autorizamos via [Model::class, ...]. Por isso o tenant é resolvido pelo
     * TenantContext (já setado pelo middleware 'tenant'), não por parâmetro.
     */
    public function viewAny(User $user): bool
    {
        $context = app(TenantContext::class);
        if (!$context->hasTenant()) {
            return false;
        }

        return $this->isManager($user, $context->id());
    }

    /**
     * Conceder acesso: admin geral pode tudo; admin de módulo só no seu escopo (RN-ACC-002).
     *
     * Assinatura considera que Gate injeta o nome da classe como 1º argumento posicional.
     *
     * @param array<int> $orgUnitIds
     */
    public function create(User $user, string $modelClass, string $moduleAlias, array $orgUnitIds): bool
    {
        $context = app(TenantContext::class);
        if (!$context->hasTenant()) {
            return false;
        }

        return $this->access->canGrantTo($user, $moduleAlias, $context->id(), $orgUnitIds);
    }

    /**
     * Revogar: admin geral ou admin do módulo (que gerencia o acesso).
     * O 1º argumento é uma instância de UserModuleAccess (não classe), então a
     * assinatura casa com ($user, $access, $tenantId).
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

    private function isManager(User $user, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }
}