<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $proposicao_id
 * @property string $poder_origem
 * @property string $poder_destino
 * @property int    $remetente_id
 * @property int|null $responsavel_id
 * @property string $data_encaminhamento
 * @property string|null $data_recebimento
 * @property string $data_limite_resposta
 * @property string $status
 * @property string|null $observacao
 */
final class TramitacaoPoderes extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_tramitacoes_poderes';

    public const STATUS_ENCAMINHADO = 'encaminhado';
    public const STATUS_RECEBIDO    = 'recebido';
    public const STATUS_RESPONDIDO  = 'respondido';
    public const STATUS_VENCIDO     = 'vencido';

    protected $fillable = [
        'tenant_id',
        'proposicao_id',
        'poder_origem',
        'poder_destino',
        'remetente_id',
        'responsavel_id',
        'data_encaminhamento',
        'data_recebimento',
        'data_limite_resposta',
        'status',
        'observacao',
    ];

    protected $casts = [
        'tenant_id'          => 'integer',
        'proposicao_id'      => 'integer',
        'remetente_id'       => 'integer',
        'responsavel_id'     => 'integer',
        'data_encaminhamento' => 'date',
        'data_recebimento'    => 'date',
        'data_limite_resposta' => 'date',
    ];

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicao(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class);
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function remetente(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'remetente_id');
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'responsavel_id');
    }

    /** @return HasMany<Resposta, $this> */
    public function respostas(): HasMany
    {
        return $this->hasMany(Resposta::class, 'tramitacao_id');
    }

    public function scopeDoPoder($query, string $poder)
    {
        return $query->where(function ($q) use ($poder) {
            $q->where('poder_origem', $poder)
              ->orWhere('poder_destino', $poder);
        });
    }

    public function scopePendentes($query)
    {
        return $query->whereIn('status', [self::STATUS_ENCAMINHADO, self::STATUS_RECEBIDO]);
    }

    public function scopeVencidas($query)
    {
        return $query->where('status', self::STATUS_VENCIDO);
    }
}