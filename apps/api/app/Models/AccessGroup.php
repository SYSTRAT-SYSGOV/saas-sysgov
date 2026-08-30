<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Grupo de acesso — pacote de permissões por módulo/secretaria que pode ser
 * herdado por vários usuários (facilita provisionar acessos iguais).
 * O acesso real do usuário = soma dos acessos diretos (user_module_access) +
 * dos acessos dos grupos aos quais pertence.
 */
final class AccessGroup extends Model
{
    use TenantAware;

    protected $fillable = [
        'tenant_id', 'category_id', 'name', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccessCategory::class, 'category_id');
    }

    public function accesses(): HasMany
    {
        return $this->hasMany(AccessGroupAccess::class, 'access_group_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'access_group_user', 'access_group_id', 'user_id');
    }
}