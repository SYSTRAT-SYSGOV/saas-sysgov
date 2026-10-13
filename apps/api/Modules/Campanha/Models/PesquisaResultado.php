<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Percentual de um candidato numa pesquisa (D7), em décimos de ponto (14,5% → 145).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pesquisa_id
 * @property string $nome
 * @property string|null $partido
 * @property int $percentual_decimos
 * @property bool $da_campanha
 * @property int $ordem
 */
final class PesquisaResultado extends Model
{
    use TenantAware;

    public $timestamps = false;

    protected $table = 'campanha_pesquisa_resultados';

    protected $fillable = ['tenant_id', 'pesquisa_id', 'nome', 'partido', 'percentual_decimos', 'da_campanha', 'ordem'];

    protected $casts = ['tenant_id' => 'integer', 'pesquisa_id' => 'integer', 'percentual_decimos' => 'integer', 'da_campanha' => 'boolean', 'ordem' => 'integer'];
}
