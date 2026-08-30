<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Matriz de acesso do usuário no tenant: módulo × secretarias (org_units) × role no módulo.
 * - org_unit_ids = null → acesso a TODAS as secretarias do módulo
 * - org_unit_ids = []  → sem acesso a dados de secretaria (não deve ocorrer na prática)
 * - org_unit_ids = [1,2] → acesso às unidades selecionadas E seus descendentes (expansão por path)
 *
 * RN-ACC-001: vigência — valid_to nulo = sem expiração; acesso com valid_to no passado
 *             ou status=revoked/expired NÃO concede acesso em tempo real.
 * RN-ACC-003: rastreabilidade — granted_by identifica quem concedeu o acesso.
 * RN-ACC-005: revogação é LÓGICA (status=revoked), nunca delete físico.
 */
final class UserModuleAccess extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REVOKED = 'revoked';

    protected $table = 'user_module_access';

    protected $fillable = [
        'user_id', 'tenant_id', 'module_alias',
        'role', 'org_unit_ids', 'can_manage_users',
        'can_create', 'can_edit', 'can_delete',
        'valid_from', 'valid_to', 'status', 'granted_by',
    ];

    protected $casts = [
        'org_unit_ids' => 'array',
        'can_manage_users' => 'boolean',
        'can_create' => 'boolean',
        'can_edit' => 'boolean',
        'can_delete' => 'boolean',
        'valid_from' => 'datetime',
        'valid_to' => 'datetime',
        'status' => 'string',
        'granted_by' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function grantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    /**
     * Acesso irrestrito a todas as secretarias deste módulo?
     */
    public function isUnrestricted(): bool
    {
        return $this->org_unit_ids === null;
    }

    /**
     * RN-ACC-001: acesso ativo? status='active' E vigência válida (sem valid_to ou futuro).
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && ($this->valid_to === null || $this->valid_to->isFuture());
    }

    /**
     * RN-ACC-001: expira nos próximos $days dias?
     */
    public function isExpiring(int $days = 30): bool
    {
        if ($this->status !== self::STATUS_ACTIVE || $this->valid_to === null) {
            return false;
        }

        return $this->valid_to->isBetween(Carbon::now(), Carbon::now()->addDays($days));
    }

    /**
     * Marca como revogado (lógico) — preserva histórico.
     */
    public function markRevoked(): void
    {
        $this->forceFill(['status' => self::STATUS_REVOKED])->save();
    }

    /**
     * @param Builder<UserModuleAccess> $query
     */
    public function scopeForModule(Builder $query, string $moduleAlias): Builder
    {
        return $query->where('module_alias', $moduleAlias);
    }

    /**
     * @param Builder<UserModuleAccess> $query
     * @return Builder<UserModuleAccess>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->where(function (Builder $q): void {
                $q->whereNull('valid_to')->orWhere('valid_to', '>', Carbon::now());
            });
    }

    /**
     * @param Builder<UserModuleAccess> $query
     * @return Builder<UserModuleAccess>
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->where('status', self::STATUS_EXPIRED)
              ->orWhere(function (Builder $q2): void {
                  $q2->where('status', self::STATUS_ACTIVE)
                     ->where('valid_to', '<', Carbon::now());
              });
        });
    }

    /**
     * @param Builder<UserModuleAccess> $query
     * @return Builder<UserModuleAccess>
     */
    public function scopeRevoked(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REVOKED);
    }
}
