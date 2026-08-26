<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

final class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasPermissions;

    protected $fillable = [
        'name',
        'email',
        'avatar_url',
        'password',
        'is_systrat',
        'is_active',
        'is_platform_admin',
        'mfa_secret',
        'mfa_enabled',
        'mfa_confirmed_at',
        'email_verified_at',
    ];

    protected $hidden = ['password', 'remember_token', 'mfa_secret'];

    protected $casts = [
        'is_platform_admin' => 'boolean',
        'is_systrat' => 'boolean',
        'is_active' => 'boolean',
        'mfa_enabled' => 'boolean',
        'mfa_confirmed_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_user')
            ->withPivot('role_id', 'status', 'is_primary');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(UserInvitation::class, 'invited_by');
    }

    /**
     * Tenants liberados para o usuário como analista de suporte (carteira de clientes).
     */
    public function analystTenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_analyst')
            ->withPivot(['can_read', 'can_write', 'expires_at', 'assigned_by'])
            ->withTimestamps();
    }

    /**
     * É analista de suporte (role support_analyst)?
     */
    public function isSupportAnalyst(): bool
    {
        return $this->roles()
            ->where('slug', 'support_analyst')
            ->exists();
    }

    /**
     * Matriz de acesso por módulo (web-client): módulo × secretarias × role.
     */
    public function moduleAccesses(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserModuleAccess::class);
    }

    public function receivedInvitations(): HasMany
    {
        return $this->hasMany(UserInvitation::class, 'email', 'email');
    }

    /**
     * Scope for SYSTRAT team users
     *
     * @param Builder<User> $query
     * @return Builder<User>
     */
    public function scopeSystrat(Builder $query): Builder
    {
        return $query->where('is_systrat', true);
    }

    /**
     * Scope for active users
     *
     * @param Builder<User> $query
     * @return Builder<User>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for users of a specific tenant
     *
     * @param Builder<User> $query
     * @return Builder<User>
     */
    public function scopeOfTenant(Builder $query, int $tenantId): Builder
    {
        return $query->whereHas('tenants', function ($q) use ($tenantId) {
            $q->where('tenants.id', $tenantId);
        });
    }

    /**
     * Check if user has MFA requirement based on roles (RN-USR-005)
     * Funciona sem TenantContext (fluxo de login) e por vínculo tenant
     */
    public function requiresMfa(): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        // Papéis privilegiados do escopo SYSTRAT
        $hasPrivilegedSystratRole = $this->roles()
            ->whereIn('slug', ['super_admin', 'admin_ops'])
            ->where('scope', 'systrat')
            ->exists();

        if ($hasPrivilegedSystratRole) {
            return true;
        }

        // Papel admin_tenant vinculado via tenant_user
        $adminRoleIds = \App\Models\Role::where('slug', 'admin_tenant')->pluck('id');

        return $this->tenants()
            ->wherePivot('status', 'active')
            ->wherePivotIn('role_id', $adminRoleIds)
            ->exists();
    }
}
