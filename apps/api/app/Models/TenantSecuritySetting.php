<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Configurações de segurança por tenant — senha padrão usada no cadastro de usuários.
 * A senha é armazenada como hash; nunca em texto puro.
 */
final class TenantSecuritySetting extends Model
{
    protected $table = 'tenant_security_settings';

    protected $fillable = [
        'tenant_id', 'default_password_hash', 'updated_by', 'default_password_set_at',
    ];

    protected $casts = [
        'default_password_set_at' => 'datetime',
    ];
}
