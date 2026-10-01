<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $proposicao_id
 * @property string $etapa_nome
 * @property int    $ordem
 * @property string $status
 * @property int|null $responsavel_id
 * @property string|null $data_inicio
 * @property string|null $data_conclusao
 * @property int|null $prazo_dias
 * @property string|null $observacao
 * @property array|null $metadata
 */
final class EtapaTramitacao extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_etapas_tramitacao';

    public const STATUS_PENDENTE    = 'pendente';
    public const STATUS_EM_ANDAMENTO = 'em_andamento';
    public const STATUS_CONCLUIDA   = 'concluida';

    protected $fillable = [
        'tenant_id',
        'proposicao_id',
        'etapa_nome',
        'ordem',
        'status',
        'responsavel_id',
        'data_inicio',
        'data_conclusao',
        'prazo_dias',
        'observacao',
        'metadata',
    ];

    protected $casts = [
        'tenant_id'        => 'integer',
        'proposicao_id'    => 'integer',
        'ordem'            => 'integer',
        'responsavel_id'   => 'integer',
        'prazo_dias'       => 'integer',
        'data_inicio'      => 'date',
        'data_conclusao'   => 'date',
        'metadata'         => 'array',
    ];

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicao(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class);
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'responsavel_id');
    }
}