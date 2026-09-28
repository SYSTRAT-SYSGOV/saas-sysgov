<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Via/alameda interna de uma necrópole (LINESTRING), usada como aresta do
 * grafo de roteirização pedestre (spec: cemiterio/mapa-gis › roteirização).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $park_id
 * @property string $via_codigo
 * @property array<mixed> $geojson
 * @property float $min_lat
 * @property float $min_lng
 * @property float $max_lat
 * @property float $max_lng
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Via extends Model
{
    use TenantAware;

    protected $table = 'cemetery_paths';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['geom'];

    protected $casts = [
        'geojson' => 'array',
        'min_lat' => 'float',
        'min_lng' => 'float',
        'max_lat' => 'float',
        'max_lng' => 'float',
    ];

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }
}
