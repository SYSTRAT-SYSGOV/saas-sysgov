<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Parâmetro de qualidade exigido numa licença de lançamento de efluentes (ex.: pH,
 * DBO, temperatura) com limites regulatórios — ver spec `meio-ambiente/recursos-hidricos`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $licenca_lancamento_efluente_id
 * @property string $parametro
 * @property float|null $limite_min
 * @property float|null $limite_max
 * @property string|null $unidade
 */
final class ParametroQualidadeEfluente extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_parametros_qualidade_efluente';

    protected $fillable = [
        'tenant_id',
        'licenca_lancamento_efluente_id',
        'parametro',
        'limite_min',
        'limite_max',
        'unidade',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licenca_lancamento_efluente_id' => 'integer',
        'limite_min' => 'decimal:3',
        'limite_max' => 'decimal:3',
    ];

    /** @return BelongsTo<LicencaLancamentoEfluente, $this> */
    public function licenca(): BelongsTo
    {
        return $this->belongsTo(LicencaLancamentoEfluente::class, 'licenca_lancamento_efluente_id');
    }

    /** @return HasMany<MedicaoEfluente, $this> */
    public function medicoes(): HasMany
    {
        return $this->hasMany(MedicaoEfluente::class, 'parametro_qualidade_efluente_id');
    }

    public function dentroDoLimite(float $valor): bool
    {
        if ($this->limite_min !== null && $valor < (float) $this->limite_min) {
            return false;
        }

        if ($this->limite_max !== null && $valor > (float) $this->limite_max) {
            return false;
        }

        return true;
    }
}
