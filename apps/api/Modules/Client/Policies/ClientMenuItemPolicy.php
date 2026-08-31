<?php

declare(strict_types=1);

namespace Modules\Client\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Throwable;

final class ClientMenuItemPolicy
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

    public function viewAny(User $user): bool { return $this->isAdminTenant($user); }
    public function view(User $user): bool { return $this->isAdminTenant($user); }
    public function create(User $user): bool { return $this->isAdminTenant($user); }
    public function update(User $user): bool { return $this->isAdminTenant($user); }
    public function delete(User $user): bool { return $this->isAdminTenant($user); }
}
