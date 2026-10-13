<?php

declare(strict_types=1);

namespace Modules\Ata\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $org_unit_id
 * @property int $ano
 * @property int $ultimo
 */
final class AtaNumeracao extends Model
{
    use TenantAware;

    protected $table = 'ata_numeracoes';

    protected $fillable = ['tenant_id', 'org_unit_id', 'ano', 'ultimo'];

    protected $casts = ['tenant_id' => 'integer', 'org_unit_id' => 'integer', 'ano' => 'integer', 'ultimo' => 'integer'];
}
