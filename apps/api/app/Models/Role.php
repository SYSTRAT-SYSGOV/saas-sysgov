<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Role extends Model
{
    protected $fillable = ['name', 'guard_name', 'tenant_id'];
    public function permissions(): BelongsToMany { return $this->belongsToMany(Permission::class, 'role_has_permissions'); }
    public function users(): BelongsToMany { return $this->belongsToMany(User::class, 'role_user'); }
}
