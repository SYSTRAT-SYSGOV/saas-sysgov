<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Entrega registrada num ponto de logística reversa.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $ponto_logistica_reversa_id
 * @property float $quantidade_kg
 * @property \Illuminate\Support\Carbon $entregue_em
 */
final class EntregaLogisticaReversa extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_entregas_logistica_reversa';

    protected $fillable = [
        'tenant_id',
        'ponto_logistica_reversa_id',
        'quantidade_kg',
        'entregue_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ponto_logistica_reversa_id' => 'integer',
        'quantidade_kg' => 'decimal:2',
        'entregue_em' => 'date',
    ];

    /** @return BelongsTo<PontoLogisticaReversa, $this> */
    public function ponto(): BelongsTo
    {
        return $this->belongsTo(PontoLogisticaReversa::class, 'ponto_logistica_reversa_id');
    }
}
