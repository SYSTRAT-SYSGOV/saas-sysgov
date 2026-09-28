<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Equipamento de uma necrópole (POINT): portaria, capela, sanitário,
 * administração ou ponto de água (spec: cemiterio/mapa-gis › camadas).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $park_id
 * @property string $tipo
 * @property string|null $rotulo
 * @property float $lat
 * @property float $lng
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Amenidade extends Model
{
    use TenantAware;

    public const TIPOS = ['portaria', 'capela', 'sanitario', 'administracao', 'agua', 'vegetacao'];

    protected $table = 'cemetery_amenities';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['geom'];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
    ];

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }
}
