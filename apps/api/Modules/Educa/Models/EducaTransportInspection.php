<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Laudo e registro de vistoria semestral do DETRAN para veículos escolares.
 */
final class EducaTransportInspection extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const RESULTADO_APROVADO = 'aprovado';
    public const RESULTADO_REPROVADO = 'reprovado';
    public const RESULTADO_COM_RESTRICOES = 'com_restricoes';

    protected $table = 'educa_transport_inspections';

    protected $fillable = [
        'tenant_id',
        'vehicle_id',
        'numero_laudo',
        'orgao_emissor',
        'data_vistoria',
        'data_validade',
        'resultado',
        'observacoes',
    ];

    protected $casts = [
        'data_vistoria' => 'date:Y-m-d',
        'data_validade' => 'date:Y-m-d',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(EducaTransportVehicle::class, 'vehicle_id');
    }
}
