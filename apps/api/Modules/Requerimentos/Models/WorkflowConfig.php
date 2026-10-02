<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $tipo_instrumento_id
 * @property int    $workflow_id
 * @property bool   $ativo
 */
final class WorkflowConfig extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_workflows';

    protected $fillable = [
        'tenant_id',
        'tipo_instrumento_id',
        'workflow_id',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'tipo_instrumento_id' => 'integer',
        'workflow_id'         => 'integer',
        'ativo'               => 'boolean',
    ];

    /** @return BelongsTo<TipoInstrumento, $this> */
    public function tipoInstrumento(): BelongsTo
    {
        return $this->belongsTo(TipoInstrumento::class, 'tipo_instrumento_id');
    }
}