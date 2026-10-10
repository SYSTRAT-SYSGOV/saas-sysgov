<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Vereador do município na campanha, com sugestão dos eleitos da base pública (D10).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 */
final class Vereador extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_vereadores';

    protected $fillable = ['tenant_id', 'campanha_id', 'codigo_ibge', 'ref_mandatario_id', 'nome', 'partido', 'numero', 'mandato', 'telefone', 'whatsapp', 'email', 'instagram', 'facebook', 'aliado', 'votos_estimados', 'dobradinha', 'apoio_presidente', 'apoio_governador', 'apoio_senador', 'apoio_dep_federal', 'apoio_dep_estadual', 'observacoes'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'codigo_ibge' => 'integer',
        'ref_mandatario_id' => 'integer',
        'aliado' => 'boolean',
        'votos_estimados' => 'integer',
    ];
}
