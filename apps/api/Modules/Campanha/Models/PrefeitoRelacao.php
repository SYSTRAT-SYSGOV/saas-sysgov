<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Relação da campanha com o prefeito do município (D9); nome, vice e partido vêm da base pública.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 */
final class PrefeitoRelacao extends Model
{
    use CampanhaAware;
    use TenantAware;

    protected $table = 'campanha_prefeitos';

    protected $fillable = ['tenant_id', 'campanha_id', 'codigo_ibge', 'relacao', 'influencia', 'telefone', 'whatsapp', 'email', 'observacoes'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'codigo_ibge' => 'integer',
    ];
}
