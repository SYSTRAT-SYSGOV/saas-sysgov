<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Quinquênio persistido — RN-08 (art. 17, Lei 1.704/2006).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $servidor_id
 * @property \Illuminate\Support\Carbon $data_quinquenio
 * @property string $percentual — DECIMAL(5,2) como string, nunca float
 */
final class Quinquenio extends Model
{
    use TenantAware;

    protected $table = 'capd_quinquenios';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'data_quinquenio',
        'percentual',
    ];

    protected $casts = [
        'tenant_id'       => 'integer',
        'servidor_id'     => 'integer',
        'data_quinquenio' => 'date',
        'percentual'      => 'string',
    ];

    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }
}
