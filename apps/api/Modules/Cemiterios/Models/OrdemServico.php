<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $ano
 * @property int $numero
 * @property string $tipo
 * @property int|null $plot_id
 * @property \Illuminate\Support\Carbon|null $agendada_para
 * @property string|null $equipe
 * @property string $situacao
 * @property string|null $observacao
 * @property int|null $executada_por
 * @property \Illuminate\Support\Carbon|null $executada_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class OrdemServico extends Model
{
    use TenantAware;

    public const TIPOS = ['inumacao', 'exumacao', 'trasladacao', 'demolicao'];

    protected $table = 'cemetery_service_orders';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'ano' => 'integer',
        'numero' => 'integer',
        'agendada_para' => 'datetime',
        'executada_em' => 'datetime',
    ];

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    public function getRotuloAttribute(): string
    {
        return "{$this->numero}/{$this->ano}";
    }
}
