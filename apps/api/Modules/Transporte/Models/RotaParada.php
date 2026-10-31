<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Posição de uma parada no itinerário de uma rota.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $rota_id
 * @property int $parada_id
 * @property int $ordem
 * @property string|null $embarque_previsto
 * @property string|null $desembarque_previsto
 * @property-read Parada $parada
 */
final class RotaParada extends Model
{
    use TenantAware;

    protected $table = 'transporte_rota_paradas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'rota_id', 'parada_id', 'ordem', 'embarque_previsto', 'desembarque_previsto'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'rota_id' => 'integer', 'parada_id' => 'integer', 'ordem' => 'integer'];

    /** @return BelongsTo<Parada, $this> */
    public function parada(): BelongsTo
    {
        return $this->belongsTo(Parada::class, 'parada_id');
    }
}
