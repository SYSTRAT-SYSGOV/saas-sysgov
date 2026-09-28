<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $contractor_id
 * @property string $numero
 * @property \Illuminate\Support\Carbon $validade
 * @property string|null $arquivo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class AlvaraAnual extends Model
{
    use TenantAware;

    protected $table = 'cemetery_contractor_licenses';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['validade' => 'date'];
}
