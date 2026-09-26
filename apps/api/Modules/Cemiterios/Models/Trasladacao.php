<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $burial_id
 * @property int $plot_origem_id
 * @property int|null $plot_destino_id
 * @property string|null $destino_externo
 * @property string|null $documento_destino
 * @property int|null $exhumation_id
 * @property string $situacao
 * @property int|null $service_order_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Trasladacao extends Model
{
    use TenantAware;

    protected $table = 'cemetery_transfers';

    protected $guarded = ['id', 'tenant_id'];

    /** @return BelongsTo<Inumacao, $this> */
    public function inumacao(): BelongsTo
    {
        return $this->belongsTo(Inumacao::class, 'burial_id');
    }

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigoOrigem(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_origem_id');
    }

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigoDestino(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_destino_id');
    }
}
