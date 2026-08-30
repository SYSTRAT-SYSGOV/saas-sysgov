<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Matriz de acessos de um grupo de acesso (mesma granularidade do user_module_access).
 * Permite definir por módulo: secretarias, papel, admin do módulo e permissões granulares.
 */
final class AccessGroupAccess extends Model
{
    protected $table = 'access_group_access';

    protected $fillable = [
        'access_group_id', 'tenant_id', 'module_alias', 'role',
        'org_unit_ids', 'can_manage_users', 'can_create', 'can_edit', 'can_delete',
        'valid_to',
    ];

    protected $casts = [
        'org_unit_ids' => 'array',
        'can_manage_users' => 'boolean',
        'can_create' => 'boolean',
        'can_edit' => 'boolean',
        'can_delete' => 'boolean',
        'valid_to' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(AccessGroup::class, 'access_group_id');
    }

    public function isUnrestricted(): bool
    {
        return $this->org_unit_ids === null;
    }
}