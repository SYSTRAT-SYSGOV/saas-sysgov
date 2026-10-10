<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Dados do município na campanha (D5): situação, meta, votos anteriores e coordenador. Sem linha = sem atuação.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 */
final class MunicipioCampanha extends Model
{
    use CampanhaAware;
    use TenantAware;

    protected $table = 'campanha_municipios';

    protected $fillable = ['tenant_id', 'campanha_id', 'codigo_ibge', 'situacao', 'meta_votos', 'votos_anterior', 'coordenador_id', 'potencial', 'historico', 'observacoes'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'codigo_ibge' => 'integer',
        'meta_votos' => 'integer',
        'votos_anterior' => 'integer',
        'coordenador_id' => 'integer',
    ];
}
