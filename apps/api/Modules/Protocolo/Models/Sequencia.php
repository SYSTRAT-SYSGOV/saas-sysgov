<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $ano
 * @property int $ultimo_numero
 */
final class Sequencia extends Model
{
    use TenantAware;
    use HasFactory;

    protected $table = 'protocolo_sequencias';

    protected $fillable = [
        'tenant_id',
        'ano',
        'ultimo_numero',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'ultimo_numero' => 'integer',
    ];
}
