<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $plot_id
 * @property int|null $vistoriador_id
 * @property \Illuminate\Support\Carbon $data
 * @property string $estado_conservacao
 * @property string $risco
 * @property string|null $observacoes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Vistoria extends Model
{
    use TenantAware;

    public const ESTADOS = ['bom', 'regular', 'ruim', 'em_ruina', 'indicio_abandono'];

    protected $table = 'cemetery_inspections';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['data' => 'date'];

    /** @return HasMany<FotoVistoria, $this> */
    public function fotos(): HasMany
    {
        return $this->hasMany(FotoVistoria::class, 'inspection_id');
    }
}
