<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela de plataforma (não `TenantAware`): prova o controle do e-mail antes de existir sessão
 * ou `TenantContext` algum. `tenant_id` diz qual vínculo `tenant_user` o clique ativa — uma
 * pessoa pode ter cadastros pendentes em mais de um órgão ao mesmo tempo (design D5/D6).
 *
 * @property int $id
 * @property int $user_id
 * @property int $tenant_id
 * @property string $token_hash
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $used_at
 * @property-read User $user
 * @property-read Tenant $tenant
 */
final class EmailVerificationToken extends Model
{
    protected $fillable = ['user_id', 'tenant_id', 'token_hash', 'expires_at', 'used_at'];

    protected $casts = [
        'user_id' => 'integer',
        'tenant_id' => 'integer',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Tenant, $this> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
