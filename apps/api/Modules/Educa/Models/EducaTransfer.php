<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Transferências Escolares e Remanejamentos.
 */
final class EducaTransfer extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const TIPO_INTERNA = 'interna_remanejamento';
    public const TIPO_SAIDA_REDE = 'saida_rede';
    public const TIPO_ENTRADA_REDE = 'entrada_rede';

    protected $table = 'educa_transfers';

    protected $fillable = [
        'tenant_id',
        'enrollment_id',
        'tipo',
        'turma_origem_id',
        'turma_destino_id',
        'escola_destino_externa',
        'municipio_destino_externo',
        'uf_destino_externo',
        'data_transferencia',
        'motivo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_transferencia' => 'date:Y-m-d',
    ];

    /**
     * @return BelongsTo<EducaEnrollment, self>
     */
    public function matricula(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    /**
     * @return BelongsTo<EducaSchoolClass, self>
     */
    public function turmaOrigem(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'turma_origem_id');
    }

    /**
     * @return BelongsTo<EducaSchoolClass, self>
     */
    public function turmaDestino(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'turma_destino_id');
    }
}
