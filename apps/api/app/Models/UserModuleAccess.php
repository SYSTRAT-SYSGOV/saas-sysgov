<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Matriz de acesso do usuário no tenant: módulo × secretarias (org_units) × role no módulo.
 * - org_unit_ids = null → acesso a TODAS as secretarias do módulo
 * - org_unit_ids = []  → sem acesso a dados de secretaria (não deve ocorrer na prática)
 * - org_unit_ids = [1,2] → acesso às unidades selecionadas E seus descendentes (expansão por path)
 */
final class UserModuleAccess extends Model
{
    protected $table = 'user_module_access';

    protected $fillable = [
        'user_id', 'tenant_id', 'module_alias',
        'role', 'org_unit_ids', 'can_manage_users',
    ];

    protected $casts = [
        'org_unit_ids' => 'array',
        'can_manage_users' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Acesso irrestrito a todas as secretarias deste módulo?
     */
    public function isUnrestricted(): bool
    {
        return $this->org_unit_ids === null;
    }

    /**
     * @param Builder<UserModuleAccess> $query
     */
    public function scopeForModule(Builder $query, string $moduleAlias): Builder
    {
        return $query->where('module_alias', $moduleAlias);
    }
}
