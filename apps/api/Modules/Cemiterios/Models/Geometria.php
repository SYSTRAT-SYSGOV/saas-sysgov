<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $geometriavel_type
 * @property int $geometriavel_id
 * @property array<mixed> $geojson
 * @property float $min_lat
 * @property float $min_lng
 * @property float $max_lat
 * @property float $max_lng
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Geometria extends Model
{
    use TenantAware;

    public const TIPOS = ['parque' => Cemiterio::class, 'setor' => Setor::class, 'jazigo' => Jazigo::class];

    protected $table = 'cemetery_geometries';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['geom'];

    protected $casts = [
        'geojson' => 'array',
        'min_lat' => 'float',
        'min_lng' => 'float',
        'max_lat' => 'float',
        'max_lng' => 'float',
    ];
}
