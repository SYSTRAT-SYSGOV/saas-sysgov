<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $park_id
 * @property string $codigo
 * @property string|null $descricao
 * @property string $tipo_zona
 * @property float|null $area_m2
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Setor extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_sectors';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['area_m2' => 'float'];

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }

    /** @return HasMany<Jazigo, $this> */
    public function jazigos(): HasMany
    {
        return $this->hasMany(Jazigo::class, 'sector_id');
    }
}
