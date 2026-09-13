<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Histórico de lotação do servidor por OrgUnit, usado por
 * HierarquiaService::dividirPorTransferencia para detectar transferências
 * de unidade dentro da janela de um ciclo e calcular dias de exercício.
 */
final class ServidorUnitHistory extends Model
{
    use TenantAware;

    protected $table = 'capd_servidor_unit_history';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'org_unit_id',
        'valido_de',
        'valido_ate',
    ];

    protected $casts = [
        'tenant_id'    => 'integer',
        'servidor_id'  => 'integer',
        'org_unit_id'  => 'integer',
        'valido_de'    => 'date',
        'valido_ate'   => 'date',
    ];

    /** @return BelongsTo<Servidor, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    public function scopeAberto($query)
    {
        return $query->whereNull('valido_ate');
    }
}
