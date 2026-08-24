<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

final class User extends Authenticatable
{
    use HasApiTokens;
    use HasRoles;
    protected $fillable = ['name', 'email', 'password', 'is_platform_admin'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['is_platform_admin' => 'boolean', 'password' => 'hashed'];
    public function tenants(): BelongsToMany { return $this->belongsToMany(Tenant::class)->withPivot('role_id'); }
    public function roles(): BelongsToMany { return $this->belongsToMany(Role::class, 'role_user'); }
}
