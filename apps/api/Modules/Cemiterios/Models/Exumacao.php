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
 * @property string $tipo
 * @property int|null $prazo_aplicado_anos
 * @property \Illuminate\Support\Carbon|null $liberada_em
 * @property string $situacao
 * @property string|null $motivo_suspensao
 * @property string|null $destino
 * @property int|null $service_order_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Exumacao extends Model
{
    use TenantAware;

    protected $table = 'cemetery_exhumations';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['liberada_em' => 'date', 'prazo_aplicado_anos' => 'integer'];

    /** @return BelongsTo<Inumacao, $this> */
    public function inumacao(): BelongsTo
    {
        return $this->belongsTo(Inumacao::class, 'burial_id');
    }

    /** @return BelongsTo<OrdemServico, $this> */
    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'service_order_id');
    }
}
