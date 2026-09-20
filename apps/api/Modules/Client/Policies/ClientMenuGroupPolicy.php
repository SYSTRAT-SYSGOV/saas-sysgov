<?php

declare(strict_types=1);

namespace Modules\Client\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Client\Models\ClientMenuGroup;
use Throwable;

final class ClientMenuGroupPolicy
{
    private function isAdminTenant(User $user): bool
    {
        try {
            $tenantId = app(TenantContext::class)->id();
        } catch (Throwable) {
            return false;
        }

        return $user->rolesForTenant($tenantId)->contains('slug', 'admin_tenant');
    }

    private function belongsToCurrentTenant(ClientMenuGroup $group): bool
    {
        try {
            $tenantId = app(TenantContext::class)->id();
        } catch (Throwable) {
            return false;
        }

        return $group->tenant_id !== null && $group->tenant_id === $tenantId;
    }

    public function viewAny(User $user): bool { return $this->isAdminTenant($user); }
    public function view(User $user): bool { return $this->isAdminTenant($user); }
    public function create(User $user): bool { return $this->isAdminTenant($user); }

    public function update(User $user, ClientMenuGroup $group): bool
    {
        return $this->isAdminTenant($user) && $this->belongsToCurrentTenant($group);
    }

    public function delete(User $user, ClientMenuGroup $group): bool
    {
        return $this->isAdminTenant($user) && $this->belongsToCurrentTenant($group);
    }
}
