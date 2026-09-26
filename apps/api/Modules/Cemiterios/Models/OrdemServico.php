<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $ano
 * @property int $numero
 * @property string $tipo
 * @property int|null $plot_id
 * @property \Illuminate\Support\Carbon|null $agendada_para
 * @property string|null $equipe
 * @property string $situacao
 * @property string|null $observacao
 * @property int|null $executada_por
 * @property \Illuminate\Support\Carbon|null $executada_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class OrdemServico extends Model
{
    use TenantAware;

    public const TIPOS = ['inumacao', 'exumacao', 'trasladacao', 'demolicao'];

    protected $table = 'cemetery_service_orders';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'ano' => 'integer',
        'numero' => 'integer',
        'agendada_para' => 'datetime',
        'executada_em' => 'datetime',
    ];

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return \Illuminate\Database\Eloquent\Relations\HasOne<Inumacao, $this> */
    public function inumacao(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Inumacao::class, 'service_order_id');
    }

    /** @return \Illuminate\Database\Eloquent\Relations\HasOne<Exumacao, $this> */
    public function exumacao(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Exumacao::class, 'service_order_id');
    }

    /** @return \Illuminate\Database\Eloquent\Relations\HasOne<Trasladacao, $this> */
    public function trasladacao(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Trasladacao::class, 'service_order_id');
    }

    public function getRotuloAttribute(): string
    {
        return "{$this->numero}/{$this->ano}";
    }

    public function getFalecidoNomeAttribute(): ?string
    {
        if ($this->relationLoaded('inumacao') && $this->inumacao?->relationLoaded('falecido')) {
            return $this->inumacao->falecido?->nome;
        }

        if ($this->relationLoaded('exumacao') && $this->exumacao?->relationLoaded('inumacao') && $this->exumacao->inumacao?->relationLoaded('falecido')) {
            return $this->exumacao->inumacao->falecido?->nome;
        }

        if ($this->relationLoaded('trasladacao') && $this->trasladacao?->relationLoaded('inumacao') && $this->trasladacao->inumacao?->relationLoaded('falecido')) {
            return $this->trasladacao->inumacao->falecido?->nome;
        }

        return null;
    }
}
