<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Medição registrada para um parâmetro de qualidade de efluente, com sinalização
 * de conformidade em relação aos limites regulatórios.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $parametro_qualidade_efluente_id
 * @property float $valor
 * @property \Illuminate\Support\Carbon $medida_em
 * @property bool $conforme
 */
final class MedicaoEfluente extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_medicoes_efluente';

    protected $fillable = [
        'tenant_id',
        'parametro_qualidade_efluente_id',
        'valor',
        'medida_em',
        'conforme',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'parametro_qualidade_efluente_id' => 'integer',
        'valor' => 'decimal:3',
        'medida_em' => 'date',
        'conforme' => 'boolean',
    ];

    /** @return BelongsTo<ParametroQualidadeEfluente, $this> */
    public function parametro(): BelongsTo
    {
        return $this->belongsTo(ParametroQualidadeEfluente::class, 'parametro_qualidade_efluente_id');
    }
}
