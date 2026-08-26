<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\Tenant;
use App\Models\User;

final class TenantPolicy
{
    public function viewAny(User $user): bool
    {
        // Analistas de suporte, admin_ops e suporte têm acesso restrito pela carteira/role.
        return $user->is_platform_admin
            || $user->hasPermission('admin.tenants.view');
    }

    public function view(User $user, Tenant $tenant): bool
    {
        return $user->is_platform_admin
            || $user->hasPermission('admin.tenants.view');
    }

    public function create(User $user): bool { return $user->is_platform_admin; }
    public function update(User $user, Tenant $tenant): bool { return $user->is_platform_admin; }
    public function delete(User $user, Tenant $tenant): bool { return $user->is_platform_admin; }
}
