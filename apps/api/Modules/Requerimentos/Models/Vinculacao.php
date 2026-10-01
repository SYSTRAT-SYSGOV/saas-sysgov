<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $proposicao_origem_id
 * @property int    $proposicao_destino_id
 * @property string $tipo_vinculacao
 * @property string|null $observacao
 */
final class Vinculacao extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_vinculacoes';

    public const TIPO_APENSADA     = 'apensada';
    public const TIPO_DEPENDENTE   = 'dependente';
    public const TIPO_RELACIONADA  = 'relacionada';

    protected $fillable = [
        'tenant_id',
        'proposicao_origem_id',
        'proposicao_destino_id',
        'tipo_vinculacao',
        'observacao',
    ];

    protected $casts = [
        'tenant_id'             => 'integer',
        'proposicao_origem_id'  => 'integer',
        'proposicao_destino_id' => 'integer',
    ];

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicaoOrigem(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class, 'proposicao_origem_id');
    }

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicaoDestino(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class, 'proposicao_destino_id');
    }
}