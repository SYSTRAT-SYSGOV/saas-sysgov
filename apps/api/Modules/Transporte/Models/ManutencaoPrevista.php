<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Manutenção prevista por data, por quilometragem ou por ambas (design D-M4).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $veiculo_id
 * @property string $descricao
 * @property \Illuminate\Support\Carbon|null $data_prevista
 * @property int|null $km_previsto
 * @property string $status pendente | convertida | cancelada
 * @property int|null $ordem_servico_id
 * @property-read Veiculo|null $veiculo
 */
final class ManutencaoPrevista extends Model
{
    use TenantAware;

    protected $table = 'transporte_manutencoes_previstas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'veiculo_id', 'descricao', 'data_prevista', 'km_previsto', 'status', 'ordem_servico_id'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'veiculo_id' => 'integer', 'data_prevista' => 'date', 'km_previsto' => 'integer', 'ordem_servico_id' => 'integer'];

    /** @return BelongsTo<Veiculo, $this> */
    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id')->withTrashed();
    }
}
