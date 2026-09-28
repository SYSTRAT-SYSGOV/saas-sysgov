<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $contractor_id
 * @property int $plot_id
 * @property string $descricao
 * @property float $comprimento_m
 * @property float $largura_m
 * @property \Illuminate\Support\Carbon $prazo_fim
 * @property string $situacao
 * @property bool $sinalizada
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class AlvaraObra extends Model
{
    use TenantAware;

    protected $table = 'cemetery_work_permits';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'comprimento_m' => 'float',
        'largura_m' => 'float',
        'prazo_fim' => 'date',
        'sinalizada' => 'boolean',
    ];
}
