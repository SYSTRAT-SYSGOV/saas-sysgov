<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Vistoria\Models\ProcessoSancionatorio;

/**
 * Parcelamento da multa aplicada num processo sancionatório ambiental concluído —
 * ver spec `meio-ambiente/fiscalizacao-ambiental`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_sancionatorio_id
 * @property int $numero_parcelas
 * @property int $valor_total_centavos
 */
final class ParcelamentoMulta extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_parcelamentos_multa';

    /** Limite de parcelas configurado pela Secretaria — ver spec, cenário de rejeição acima do limite. */
    public const LIMITE_PARCELAS = 12;

    protected $fillable = [
        'tenant_id',
        'processo_sancionatorio_id',
        'numero_parcelas',
        'valor_total_centavos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_sancionatorio_id' => 'integer',
        'numero_parcelas' => 'integer',
        'valor_total_centavos' => 'integer',
    ];

    /** @return BelongsTo<ProcessoSancionatorio, $this> */
    public function processoSancionatorio(): BelongsTo
    {
        return $this->belongsTo(ProcessoSancionatorio::class, 'processo_sancionatorio_id');
    }

    /** @return HasMany<ParcelaMulta, $this> */
    public function parcelas(): HasMany
    {
        return $this->hasMany(ParcelaMulta::class, 'parcelamento_id');
    }
}
