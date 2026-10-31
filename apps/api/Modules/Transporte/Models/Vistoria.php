<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vistoria semestral do DETRAN. O histórico nunca é apagado: a regularidade do veículo usa a de maior validade.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $veiculo_id
 * @property \Illuminate\Support\Carbon $data_vistoria
 * @property string $certificado
 * @property \Illuminate\Support\Carbon $validade
 * @property string|null $observacoes
 */
final class Vistoria extends Model
{
    use TenantAware;

    protected $table = 'transporte_vistorias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'veiculo_id', 'data_vistoria', 'certificado', 'validade', 'observacoes'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'veiculo_id' => 'integer',
        'data_vistoria' => 'date',
        'validade' => 'date',
    ];

    /** @return BelongsTo<Veiculo, $this> */
    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id');
    }
}
