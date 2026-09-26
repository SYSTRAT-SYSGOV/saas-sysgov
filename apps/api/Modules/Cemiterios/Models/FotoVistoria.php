<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $inspection_id
 * @property string $arquivo
 * @property \Illuminate\Support\Carbon $capturada_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class FotoVistoria extends Model
{
    use TenantAware;

    protected $table = 'cemetery_inspection_photos';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['capturada_em' => 'datetime'];
}
