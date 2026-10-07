<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Acompanhamento do prazo de regularização de um auto de infração: vincula a vistoria
 * original (que constatou a irregularidade) ao auto de infração e à ordem de serviço de
 * reinspeção agendada para verificar se a irregularidade foi sanada.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $documento_id
 * @property int $ordem_servico_original_id
 * @property int|null $ordem_servico_reinspecao_id
 * @property string $status
 * @property \Illuminate\Support\Carbon $data_limite
 * @property \Illuminate\Support\Carbon|null $constatada_em
 * @property string|null $observacao
 */
final class Reinspecao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_reinspecoes';

    public const STATUS_PENDENTE = 'pendente';
    public const STATUS_REGULARIZADO = 'regularizado';
    public const STATUS_NAO_REGULARIZADO = 'nao_regularizado';

    protected $fillable = [
        'tenant_id',
        'documento_id',
        'ordem_servico_original_id',
        'ordem_servico_reinspecao_id',
        'status',
        'data_limite',
        'constatada_em',
        'observacao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'documento_id' => 'integer',
        'ordem_servico_original_id' => 'integer',
        'ordem_servico_reinspecao_id' => 'integer',
        'data_limite' => 'date',
        'constatada_em' => 'datetime',
    ];

    /** @return BelongsTo<Documento, $this> */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    /** @return BelongsTo<OrdemServico, $this> */
    public function ordemServicoOriginal(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_original_id');
    }

    /** @return BelongsTo<OrdemServico, $this> */
    public function ordemServicoReinspecao(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_reinspecao_id');
    }
}
