<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $operator_id
 * @property string $numero
 * @property \Illuminate\Support\Carbon $validade
 * @property string|null $arquivo
 * @property string|null $hash
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class OperadorLicenca extends Model
{
    use TenantAware;

    protected $table = 'cemetery_operator_licenses';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['validade' => 'date'];

    /** @return BelongsTo<OperadorCemiterio, $this> */
    public function operador(): BelongsTo
    {
        return $this->belongsTo(OperadorCemiterio::class, 'operator_id');
    }
}
