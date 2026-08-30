<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Configurações de segurança por tenant — senha padrão usada no cadastro de usuários.
 * A senha é armazenada como hash (para validação) e como texto cifrado (para recuperação).
 */
final class TenantSecuritySetting extends Model
{
    protected $table = 'tenant_security_settings';

    protected $fillable = [
        'tenant_id', 'default_password_hash', 'default_password_plain_cipher', 'updated_by', 'default_password_set_at',
    ];

    protected $casts = [
        'default_password_set_at' => 'datetime',
    ];

    protected $hidden = [
        'default_password_plain_cipher',
    ];

    public function getDefaultPasswordPlain(): ?string
    {
        if ($this->default_password_plain_cipher === null) {
            return null;
        }
        try {
            return Crypt::decryptString($this->default_password_plain_cipher);
        } catch (\Exception) {
            return null;
        }
    }

    public function setDefaultPasswordPlain(string $plain): void
    {
        $this->default_password_plain_cipher = Crypt::encryptString($plain);
    }
}
