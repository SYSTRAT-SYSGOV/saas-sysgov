<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Parcela individual de um `ParcelamentoMulta`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $parcelamento_id
 * @property int $numero
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $vencimento
 * @property bool $pago
 * @property \Illuminate\Support\Carbon|null $pago_em
 */
final class ParcelaMulta extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_parcelas_multa';

    protected $fillable = [
        'tenant_id',
        'parcelamento_id',
        'numero',
        'valor_centavos',
        'vencimento',
        'pago',
        'pago_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'parcelamento_id' => 'integer',
        'numero' => 'integer',
        'valor_centavos' => 'integer',
        'vencimento' => 'date',
        'pago' => 'boolean',
        'pago_em' => 'datetime',
    ];

    /** @return BelongsTo<ParcelamentoMulta, $this> */
    public function parcelamento(): BelongsTo
    {
        return $this->belongsTo(ParcelamentoMulta::class, 'parcelamento_id');
    }
}
