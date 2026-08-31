<?php

declare(strict_types=1);

namespace Modules\Client\Policies;

use App\Models\User;

final class ClientMenuGroupPolicy
{
    private function isAdminTenant(User $user): bool
    {
        $tenantId = $user->currentTenantId();
        if (!$tenantId) {
            return false;
        }
        return $user->rolesForTenant($tenantId)->contains('slug', 'admin_tenant');
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdminTenant($user);
    }

    public function view(User $user): bool
    {
        return $this->isAdminTenant($user);
    }

    public function create(User $user): bool
    {
        return $this->isAdminTenant($user);
    }

    public function update(User $user): bool
    {
        return $this->isAdminTenant($user);
    }

    public function delete(User $user): bool
    {
        return $this->isAdminTenant($user);
    }
}
