<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $indice
 * @property int $competencia
 * @property float $percentual
 * @property string $origem
 * @property int|null $autor_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Reajuste extends Model
{
    use TenantAware;

    protected $table = 'cemetery_price_adjustments';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['competencia' => 'integer', 'percentual' => 'float'];
}
