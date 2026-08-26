<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Role extends Model
{
    protected $fillable = ['name', 'slug', 'scope', 'description', 'guard_name', 'tenant_id', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_has_permissions');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'role_user');
    }

    /**
     * Scope for roles of a specific scope (systrat | tenant)
     *
     * @param Builder<Role> $query
     * @return Builder<Role>
     */
    public function scopeOfScope(Builder $query, string $scope): Builder
    {
        return $query->where('scope', $scope);
    }

    /**
     * Scope for system roles that cannot be deleted
     *
     * @param Builder<Role> $query
     * @return Builder<Role>
     */
    public function scopeSystem(Builder $query): Builder
    {
        return $query->where('is_system', true);
    }
}
