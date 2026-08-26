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

        if (!$tenantId) {
            return false;
        }

        return $this->permissionsForTenant($tenantId)->contains('slug', $permission);
    }

    public function hasRole(string $roleSlug, ?int $tenantId = null): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        $tenantId = $tenantId ?? $this->currentTenantId();

        if (!$tenantId) {
            return false;
        }

        return $this->rolesForTenant($tenantId)->contains('slug', $roleSlug);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Role>
     */
    public function rolesForTenant(int $tenantId): Collection
    {
        $cacheKey = "user:{$this->id}:roles:tenant:{$tenantId}";
        return Cache::remember($cacheKey, 300, function () use ($tenantId): Collection {
            return $this->roles()
                ->where('tenant_id', $tenantId)
                ->get();
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Permission>
     */
    public function permissionsForTenant(int $tenantId): Collection
    {
        $cacheKey = "user:{$this->id}:permissions:tenant:{$tenantId}";
        return Cache::remember($cacheKey, 300, function () use ($tenantId): Collection {
            return Permission::query()
                ->whereHas('roles', function ($query) use ($tenantId): void {
                    $query->where('roles.tenant_id', $tenantId)
                          ->whereHas('users', function ($q): void {
                              $q->where('users.id', $this->id);
                          });
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