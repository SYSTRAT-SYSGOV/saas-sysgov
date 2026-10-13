<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Resposta de uma pergunta do checklist, vinculada à execução de vistoria que a
 * coletou, com georreferenciamento automático capturado no momento do registro.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $execucao_id
 * @property int $pergunta_id
 * @property mixed $valor
 * @property float|null $latitude
 * @property float|null $longitude
 * @property \Illuminate\Support\Carbon|null $capturado_em
 */
final class RespostaChecklist extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_respostas_checklist';

    protected $fillable = [
        'tenant_id',
        'execucao_id',
        'pergunta_id',
        'valor',
        'latitude',
        'longitude',
        'capturado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'execucao_id' => 'integer',
        'pergunta_id' => 'integer',
        'valor' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'capturado_em' => 'datetime',
    ];

    /** @return BelongsTo<ExecucaoVistoria, $this> */
    public function execucao(): BelongsTo
    {
        return $this->belongsTo(ExecucaoVistoria::class, 'execucao_id');
    }

    /** @return BelongsTo<Pergunta, $this> */
    public function pergunta(): BelongsTo
    {
        return $this->belongsTo(Pergunta::class, 'pergunta_id');
    }
}
