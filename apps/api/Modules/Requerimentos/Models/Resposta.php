<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $tramitacao_id
 * @property int    $elaborado_por
 * @property string $conteudo
 * @property string $status
 * @property string|null $enviado_em
 * @property array<string, mixed>|null $metadata
 */
final class Resposta extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_respostas';

    public const STATUS_RASCUNHO = 'rascunho';
    public const STATUS_ENVIADO  = 'enviado';

    protected $fillable = [
        'tenant_id',
        'tramitacao_id',
        'elaborado_por',
        'conteudo',
        'status',
        'enviado_em',
        'metadata',
    ];

    protected $casts = [
        'tenant_id'      => 'integer',
        'tramitacao_id'  => 'integer',
        'elaborado_por'  => 'integer',
        'enviado_em'     => 'datetime',
        'metadata'       => 'array',
    ];

    /** @return BelongsTo<TramitacaoPoderes, $this> */
    public function tramitacao(): BelongsTo
    {
        return $this->belongsTo(TramitacaoPoderes::class, 'tramitacao_id');
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function elaborador(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'elaborado_por');
    }

    /** @return MorphMany<Anexo, $this> */
    public function anexos(): MorphMany
    {
        return $this->morphMany(Anexo::class, 'anexavel');
    }

    public function isRascunho(): bool
    {
        return $this->status === self::STATUS_RASCUNHO;
    }

    public function isEnviado(): bool
    {
        return $this->status === self::STATUS_ENVIADO;
    }
}