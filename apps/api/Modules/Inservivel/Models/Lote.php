<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Modules\Inservivel\Enums\StatusLote;

/**
 * Lote de bens inservíveis (spec: Lotes; D5).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $numero
 * @property StatusLote $status
 * @property int|null $criado_por
 */
final class Lote extends Model
{
    use TenantAware;

    protected $table = 'inservivel_lotes';

    protected $fillable = [
        'tenant_id', 'numero', 'descricao', 'data_criacao', 'responsavel', 'data_sorteio_prevista', 'status', 'observacoes', 'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'criado_por' => 'integer',
        'status' => StatusLote::class,
        'data_criacao' => 'date:Y-m-d',
        'data_sorteio_prevista' => 'datetime',
    ];

    protected $attributes = ['status' => 'aberto'];

    /** @return BelongsToMany<Bem, $this> */
    public function bens(): BelongsToMany
    {
        return $this->belongsToMany(Bem::class, 'inservivel_lote_bens', 'lote_id', 'bem_id')->withPivot('tenant_id')->withTimestamps();
    }

    /** @return HasMany<Interesse, $this> */
    public function interesses(): HasMany
    {
        return $this->hasMany(Interesse::class, 'lote_id');
    }

    /** @return HasOne<Sorteio, $this> */
    public function sorteio(): HasOne
    {
        return $this->hasOne(Sorteio::class, 'lote_id');
    }

    /** @return HasMany<LoteDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(LoteDocumento::class, 'lote_id');
    }
}
