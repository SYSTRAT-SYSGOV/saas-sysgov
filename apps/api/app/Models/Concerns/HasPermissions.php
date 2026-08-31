<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Permission;
use App\Models\Role;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

trait HasPermissions
{
    public function hasPermission(string $permission, ?int $tenantId = null): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        $tenantId = $tenantId ?? $this->currentTenantId();

        if ($tenantId && $this->hasRole('admin_tenant', $tenantId)) {
            return true;
        }

        if ($tenantId && $this->permissionsForTenant($tenantId)->contains('slug', $permission)) {
            return true;
        }

        // Permissões de roles SYSTRAT vinculadas via role_user (Spatie)
        // Ex.: super_admin, admin_ops, support_analyst — mesmo sem is_platform_admin ou tenant_user
        if ($this->permissionsForSystrat()->contains('slug', $permission)) {
            return true;
        }

        return false;
    }

    public function hasRole(string $roleSlug, ?int $tenantId = null): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        try {
            $tenantId = $tenantId ?? $this->currentTenantId();
        } catch (\Throwable) {
            return false;
        }

        if ($tenantId) {
            try {
                if ($this->rolesForTenant($tenantId)->contains('slug', $roleSlug)) {
                    return true;
                }
            } catch (\Throwable) {
                return false;
            }
        }

        // Roles SYSTRAT via role_user (Spatie)
        try {
            if ($this->roles()->where('scope', 'systrat')->where('slug', $roleSlug)->exists()) {
                return true;
            }
        } catch (\Throwable) {
            return false;
        }

        return false;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Role>
     */
    public function rolesForTenant(int $tenantId): Collection
    {
        $cacheKey = "user:{$this->id}:roles:tenant:{$tenantId}";
        return Cache::remember($cacheKey, 300, function () use ($tenantId): Collection {
            // Papel primário do tenant_user
            $primaryRoleId = (int) \Illuminate\Support\Facades\DB::table('tenant_user')
                ->where('user_id', $this->id)
                ->where('tenant_id', $tenantId)
                ->value('role_id');

            // Roles Spatie com scope=tenant vinculadas ESPECIFICAMENTE a este tenant (RN-CORE-001)
            $spatieRoles = Role::query()
                ->where('scope', 'tenant')
                ->where('roles.tenant_id', $tenantId)
                ->whereHas('users', fn ($q) => $q->where('users.id', $this->id))
                ->pluck('id')
                ->all();

            $allRoleIds = array_unique(array_filter(array_merge(
                $primaryRoleId ? [$primaryRoleId] : [],
                $spatieRoles
            )));

            if (empty($allRoleIds)) {
                return new Collection();
            }

            return Role::query()->whereIn('id', $allRoleIds)->get();
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Permission>
     */
    public function permissionsForTenant(int $tenantId): Collection
    {
        $cacheKey = "user:{$this->id}:permissions:tenant:{$tenantId}";
        return Cache::remember($cacheKey, 300, function () use ($tenantId): Collection {
            $roleId = \Illuminate\Support\Facades\DB::table('tenant_user')
                ->where('user_id', $this->id)
                ->where('tenant_id', $tenantId)
                ->value('role_id');

            if (!$roleId) {
                return new Collection();
            }

            return Permission::query()
                ->whereHas('roles', function ($query) use ($roleId): void {
                    $query->where('roles.id', $roleId);
                })
                ->get();
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Permission>
     */
    public function permissionsForSystrat(): Collection
    {
        $cacheKey = "user:{$this->id}:permissions:systrat";
        return Cache::remember($cacheKey, 300, function (): Collection {
            return Permission::query()
                ->whereHas('roles', function ($query): void {
                    $query->where('scope', 'systrat')
                          ->whereHas('users', function ($q): void {
                              $q->where('users.id', $this->id);
                          });
                })
                ->get();
        });
    }

    public function currentTenantId(): ?int
    {
        $context = app(TenantContext::class);
        return $context->hasTenant() ? $context->id() : null;
    }

    /**
     * Invalida o cache de roles/permissões do usuário.
     * Se $tenantId for informado, limpa apenas o cache daquele tenant; senão, de todos os tenants do usuário.
     */
    public function clearPermissionCache(?int $tenantId = null): void
    {
        if ($tenantId !== null) {
            Cache::forget("user:{$this->id}:roles:tenant:{$tenantId}");
            Cache::forget("user:{$this->id}:permissions:tenant:{$tenantId}");

            return;
        }

        $tenantIds = $this->tenants()->pluck('tenants.id')->all();
        foreach ($tenantIds as $tid) {
            Cache::forget("user:{$this->id}:roles:tenant:{$tid}");
            Cache::forget("user:{$this->id}:permissions:tenant:{$tid}");
        }
    }
}