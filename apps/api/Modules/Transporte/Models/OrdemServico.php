<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ordem de serviço de um veículo. Aberta deixa o veículo "em manutenção"; concluída ou cancelada não é mais editada
 * (design D-M3).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $veiculo_id
 * @property int|null $fornecedor_id
 * @property string $tipo
 * @property string $descricao
 * @property \Illuminate\Support\Carbon $aberta_em
 * @property \Illuminate\Support\Carbon|null $concluida_em
 * @property int|null $km
 * @property string|null $valor
 * @property string $status aberta | concluida | cancelada
 * @property string|null $motivo_cancelamento
 * @property int|null $criada_por
 * @property-read Veiculo|null $veiculo
 * @property-read Fornecedor|null $fornecedor
 */
final class OrdemServico extends Model
{
    use TenantAware;

    protected $table = 'transporte_ordens_servico';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'veiculo_id', 'fornecedor_id', 'tipo', 'descricao', 'aberta_em', 'concluida_em', 'km', 'valor', 'status',
        'motivo_cancelamento', 'criada_por',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'veiculo_id' => 'integer', 'fornecedor_id' => 'integer', 'aberta_em' => 'date', 'concluida_em' => 'date',
        'km' => 'integer', 'valor' => 'decimal:2', 'criada_por' => 'integer',
    ];

    /** @return BelongsTo<Veiculo, $this> */
    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id')->withTrashed();
    }

    /** @return BelongsTo<Fornecedor, $this> */
    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class, 'fornecedor_id')->withTrashed();
    }
}
