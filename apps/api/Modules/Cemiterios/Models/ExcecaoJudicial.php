<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Cemiterios\Models\Concerns\Imutavel;

/**
 * Exceção judicial à carência de exumação (RF-09, RN-03). Append-only.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $exhumation_id
 * @property string $processo
 * @property string $juizo
 * @property \Illuminate\Support\Carbon $data_decisao
 * @property string $arquivo
 * @property \Illuminate\Support\Carbon $prazo_contornado_ate
 * @property int|null $autor_id
 * @property \Illuminate\Support\Carbon|null $created_at
 */
final class ExcecaoJudicial extends Model
{
    use TenantAware;
    use Imutavel;

    public const UPDATED_AT = null;

    protected $table = 'cemetery_judicial_exceptions';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['data_decisao' => 'date', 'prazo_contornado_ate' => 'date'];
}
