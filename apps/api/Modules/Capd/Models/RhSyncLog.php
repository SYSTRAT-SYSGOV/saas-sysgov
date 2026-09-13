<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class RhSyncLog extends Model
{
    use TenantAware;

    protected $table = 'capd_rh_sync_logs';

    protected $fillable = [
        'tenant_id',
        'integracao_id',
        'tipo',
        'direcao',
        'status',
        'registros_processados',
        'registros_sucesso',
        'registros_falha',
        'detalhes',
        'ip_origem',
    ];

    protected $casts = [
        'tenant_id'             => 'integer',
        'integracao_id'         => 'integer',
        'registros_processados' => 'integer',
        'registros_sucesso'     => 'integer',
        'registros_falha'       => 'integer',
        'detalhes'              => 'array',
    ];

    /** @return BelongsTo<RhIntegracao, $this> */
    public function integracao(): BelongsTo
    {
        return $this->belongsTo(RhIntegracao::class, 'integracao_id');
    }
}
