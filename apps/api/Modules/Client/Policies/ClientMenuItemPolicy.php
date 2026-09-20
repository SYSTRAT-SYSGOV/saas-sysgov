<?php

declare(strict_types=1);

namespace Modules\Client\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Client\Models\ClientMenuItem;
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

    private function belongsToCurrentTenant(ClientMenuItem $item): bool
    {
        try {
            $tenantId = app(TenantContext::class)->id();
        } catch (Throwable) {
            return false;
        }

        $groupTenantId = $item->group?->tenant_id;

        return $groupTenantId !== null && $groupTenantId === $tenantId;
    }

    public function viewAny(User $user): bool { return $this->isAdminTenant($user); }
    public function view(User $user): bool { return $this->isAdminTenant($user); }
    public function create(User $user): bool { return $this->isAdminTenant($user); }

    public function update(User $user, ?ClientMenuItem $item = null): bool
    {
        if ($item === null) {
            // Checagem de classe (ex.: reorder(), que escopa por tenant na própria query).
            return $this->isAdminTenant($user);
        }

        return $this->isAdminTenant($user) && $this->belongsToCurrentTenant($item);
    }

    public function delete(User $user, ClientMenuItem $item): bool
    {
        return $this->isAdminTenant($user) && $this->belongsToCurrentTenant($item);
    }
}
