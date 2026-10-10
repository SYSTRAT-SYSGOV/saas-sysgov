<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Visita de campo a uma liderança (D6); o encaminhamento pode virar demanda (demanda_id).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $lideranca
 * @property int $codigo_ibge
 * @property Carbon $data
 * @property string $assunto
 * @property string|null $encaminhamento
 * @property int|null $demanda_id
 */
final class Visita extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_visitas';

    protected $fillable = ['tenant_id', 'campanha_id', 'lideranca', 'codigo_ibge', 'bairro', 'data', 'assunto', 'resultado', 'encaminhamento'];

    protected $casts = ['tenant_id' => 'integer', 'campanha_id' => 'integer', 'codigo_ibge' => 'integer', 'data' => 'date:Y-m-d', 'demanda_id' => 'integer'];
}
