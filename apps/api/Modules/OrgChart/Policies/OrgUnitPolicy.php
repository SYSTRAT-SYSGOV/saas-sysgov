<?php

declare(strict_types=1);

namespace Modules\OrgChart\Policies;

use App\Models\User;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgScopeService;
use Throwable;

final readonly class OrgUnitPolicy
{
    public function __construct(private OrgScopeService $scopeService) {}

    public function viewAny(User $user): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant', 'auditor', 'responsavel', 'membro'])
            || $this->safeHasPermission($user, 'org.view');
    }

    public function view(User $user, OrgUnit $unit): bool
    {
        if (!$this->viewAny($user)) {
            return false;
        }

        return $this->scopeService->canAccessOrgUnit($user, $unit->id);
    }

    public function create(User $user): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.create');
    }

    public function update(User $user, OrgUnit $unit): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.update');
    }

    public function delete(User $user, OrgUnit $unit): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.delete');
    }

    public function move(User $user, OrgUnit $unit): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.move');
    }

    public function linkUser(User $user, OrgUnit $unit): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.user.link');
    }

    public function unlinkUser(User $user, OrgUnit $unit): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_tenant'])
            || $this->safeHasPermission($user, 'org.user.unlink');
    }

    public function adminSeed(User $user): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_ops'])
            || $this->safeHasPermission($user, 'org.admin.seed');
    }

    public function adminRead(User $user): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $this->safeHasRole($user, ['super_admin', 'admin_ops', 'suporte'])
            || $this->safeHasPermission($user, 'org.admin.read');
    }

    private function safeHasRole(User $user, array|string $roles): bool
    {
        try {
            return $user->hasRole($roles);
        } catch (Throwable) {
            return false;
        }
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
