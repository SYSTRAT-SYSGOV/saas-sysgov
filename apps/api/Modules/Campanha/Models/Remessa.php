<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Remessa de material para um município (D2). Sem exclusão lógica: excluir devolve a quantidade ao estoque.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int $material_id
 * @property int $codigo_ibge
 * @property int|null $coordenador_id
 * @property int|null $cabo_id
 * @property int $quantidade
 * @property Carbon $enviada_em
 * @property Carbon|null $entregue_em
 * @property string|null $recebido_por
 * @property string|null $foto
 */
final class Remessa extends Model
{
    use CampanhaAware;
    use TenantAware;

    protected $table = 'campanha_remessas';

    protected $fillable = [
        'tenant_id', 'campanha_id', 'material_id', 'codigo_ibge', 'coordenador_id', 'cabo_id', 'quantidade', 'enviada_em', 'transportadora',
        'motorista', 'veiculo', 'previsao_entrega', 'entregue_em', 'recebido_por', 'observacoes',
    ];

    protected $hidden = ['foto'];

    protected $appends = ['tem_foto', 'entregue'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'material_id' => 'integer',
        'codigo_ibge' => 'integer',
        'coordenador_id' => 'integer',
        'cabo_id' => 'integer',
        'quantidade' => 'integer',
        'enviada_em' => 'date:Y-m-d',
        'previsao_entrega' => 'date:Y-m-d',
        'entregue_em' => 'date:Y-m-d',
    ];

    /** @return BelongsTo<Material, $this> */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id')->withTrashed();
    }

    public function getTemFotoAttribute(): bool
    {
        return $this->foto !== null;
    }

    public function getEntregueAttribute(): bool
    {
        return $this->entregue_em !== null;
    }
}
