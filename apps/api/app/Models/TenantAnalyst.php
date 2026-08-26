<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vínculo analista de suporte ↔ tenant (carteira de clientes do analista).
 * Determina quais tenants o analista pode acessar e com quais permissões (read/write).
 */
final class TenantAnalyst extends Model
{
    protected $table = 'tenant_analyst';

    protected $fillable = [
        'user_id', 'tenant_id', 'assigned_by',
        'can_read', 'can_write', 'expires_at',
    ];

    protected $casts = [
        'can_read' => 'boolean',
        'can_write' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function analyst(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * O vínculo está ativo (não expirado)?
     */
    public function isValid(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }
}
