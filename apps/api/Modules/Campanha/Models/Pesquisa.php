<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Pesquisa eleitoral (D7): abrangência estadual (codigo_ibge nulo) ou municipal; margem em décimos de ponto.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $tipo interna | externa
 * @property string $instituto
 * @property Carbon $divulgada_em
 * @property int|null $codigo_ibge
 * @property int $margem_erro_decimos
 */
final class Pesquisa extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_pesquisas';

    protected $fillable = ['tenant_id', 'campanha_id', 'tipo', 'instituto', 'divulgada_em', 'codigo_ibge', 'margem_erro_decimos', 'amostra', 'registro_tse', 'observacoes'];

    protected $casts = [
        'tenant_id' => 'integer', 'campanha_id' => 'integer', 'divulgada_em' => 'date:Y-m-d', 'codigo_ibge' => 'integer',
        'margem_erro_decimos' => 'integer', 'amostra' => 'integer',
    ];

    /** @return HasMany<PesquisaResultado, $this> */
    public function resultados(): HasMany
    {
        return $this->hasMany(PesquisaResultado::class, 'pesquisa_id')->orderBy('ordem');
    }
}
