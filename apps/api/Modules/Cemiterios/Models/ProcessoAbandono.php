<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $plot_id
 * @property int $concession_id
 * @property int $inspection_id
 * @property \Illuminate\Support\Carbon $instaurado_em
 * @property \Illuminate\Support\Carbon|null $edital_publicado_em
 * @property int|null $prazo_dias_aplicado
 * @property \Illuminate\Support\Carbon|null $prazo_fim
 * @property string|null $manifestacao
 * @property string $situacao
 * @property string|null $decisao
 * @property bool $remocao_pendente
 * @property int|null $demolicao_order_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ProcessoAbandono extends Model
{
    use TenantAware;

    protected $table = 'cemetery_abandonment_processes';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'instaurado_em' => 'date',
        'edital_publicado_em' => 'date',
        'prazo_fim' => 'date',
        'prazo_dias_aplicado' => 'integer',
        'remocao_pendente' => 'boolean',
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }
}
