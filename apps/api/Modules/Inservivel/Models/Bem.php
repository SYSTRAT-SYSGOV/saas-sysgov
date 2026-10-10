<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Bem inservível (D3, D4). Nunca é excluído: só muda de situação.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $numero_patrimonial
 * @property int $situacao_id
 * @property int $secretaria_unit_id
 * @property int|null $setor_unit_id
 * @property int $valor_contabil_cents
 * @property int $valor_avaliado_cents
 * @property-read Situacao $situacao
 */
final class Bem extends Model
{
    use TenantAware;

    protected $table = 'inservivel_bens';

    protected $fillable = [
        'tenant_id', 'numero_patrimonial', 'plaqueta_antiga', 'descricao', 'categoria_id', 'marca', 'modelo', 'numero_serie',
        'situacao_id', 'estado_conservacao_id', 'valor_contabil_cents', 'valor_avaliado_cents', 'data_aquisicao',
        'data_incorporacao', 'secretaria_unit_id', 'setor_unit_id', 'observacoes', 'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'categoria_id' => 'integer',
        'situacao_id' => 'integer',
        'estado_conservacao_id' => 'integer',
        'secretaria_unit_id' => 'integer',
        'setor_unit_id' => 'integer',
        'valor_contabil_cents' => 'integer',
        'valor_avaliado_cents' => 'integer',
        'data_aquisicao' => 'date:Y-m-d',
        'data_incorporacao' => 'date:Y-m-d',
    ];

    /** Valor que conta para o lote: o avaliado, ou o contábil quando o avaliado é zero (D4). */
    public function valorReferenciaCents(): int
    {
        return $this->valor_avaliado_cents > 0 ? $this->valor_avaliado_cents : $this->valor_contabil_cents;
    }

    /** @return BelongsTo<Situacao, $this> */
    public function situacao(): BelongsTo
    {
        return $this->belongsTo(Situacao::class, 'situacao_id');
    }

    /** @return BelongsTo<Categoria, $this> */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    /** @return BelongsTo<EstadoConservacao, $this> */
    public function estadoConservacao(): BelongsTo
    {
        return $this->belongsTo(EstadoConservacao::class, 'estado_conservacao_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function secretaria(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'secretaria_unit_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function setor(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'setor_unit_id');
    }

    /** @return BelongsToMany<Lote, $this> */
    public function lotes(): BelongsToMany
    {
        return $this->belongsToMany(Lote::class, 'inservivel_lote_bens', 'bem_id', 'lote_id')->withTimestamps();
    }

    /** @return HasMany<BemFoto, $this> */
    public function fotos(): HasMany
    {
        return $this->hasMany(BemFoto::class, 'bem_id');
    }

    /** @return HasOne<BemFoto, $this> */
    public function fotoPrincipal(): HasOne
    {
        return $this->hasOne(BemFoto::class, 'bem_id')->where('principal', true);
    }
}
