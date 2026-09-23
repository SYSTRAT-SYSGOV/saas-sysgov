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
 * @property string $numero
 * @property int $plot_id
 * @property int $holder_id
 * @property string $modalidade
 * @property \Illuminate\Support\Carbon $inicio
 * @property \Illuminate\Support\Carbon|null $termino
 * @property string $situacao
 * @property \Illuminate\Support\Carbon|null $notificado_para_termino
 * @property bool $pendencia_regularizacao
 * @property bool $sujeita_taxa_anual
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Concessao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'concessions';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'inicio' => 'date',
        'termino' => 'date',
        'notificado_para_termino' => 'date',
        'pendencia_regularizacao' => 'boolean',
        'sujeita_taxa_anual' => 'boolean',
    ];

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return BelongsTo<Concessionario, $this> */
    public function concessionario(): BelongsTo
    {
        return $this->belongsTo(Concessionario::class, 'holder_id');
    }
}
