<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Cemiterios\Models\Concerns\Imutavel;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $plot_id
 * @property string|null $de
 * @property string $para
 * @property string|null $motivo
 * @property string $origem
 * @property int|null $autor_id
 * @property \Illuminate\Support\Carbon $ocorrido_em
 */
final class JazigoHistorico extends Model
{
    use TenantAware;
    use Imutavel;

    public $timestamps = false;

    protected $table = 'plot_state_history';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['ocorrido_em' => 'datetime'];
}
