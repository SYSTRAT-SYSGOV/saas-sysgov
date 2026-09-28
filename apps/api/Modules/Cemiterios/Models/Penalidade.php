<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $contractor_id
 * @property string $tipo
 * @property \Illuminate\Support\Carbon|null $inicio
 * @property \Illuminate\Support\Carbon|null $fim
 * @property string $motivo
 * @property string|null $arquivo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Penalidade extends Model
{
    use TenantAware;

    protected $table = 'cemetery_contractor_penalties';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['inicio' => 'date', 'fim' => 'date'];
}
