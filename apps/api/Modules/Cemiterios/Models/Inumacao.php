<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $deceased_id
 * @property int $plot_id
 * @property string|null $tipo
 * @property \Illuminate\Support\Carbon $sepultado_em
 * @property string $situacao
 * @property string $origem
 * @property string|null $livro_referencia
 * @property bool $revisao_pendente
 * @property \Illuminate\Support\Carbon $carencia_desde
 * @property int|null $service_order_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Inumacao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_burials';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'sepultado_em' => 'datetime',
        'carencia_desde' => 'date',
        'revisao_pendente' => 'boolean',
    ];

    /** @return BelongsTo<Falecido, $this> */
    public function falecido(): BelongsTo
    {
        return $this->belongsTo(Falecido::class, 'deceased_id');
    }

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return BelongsTo<OrdemServico, $this> */
    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'service_order_id');
    }
}
