<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Índice de ocupação de sub-lote legado (OBA.DBF), exclusivo do Cemitério
 * Independência — preservação de auditoria, sem uso em regra de negócio
 * (mesmo tratamento dado a `LegadoFalecidoIndice`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $sublot_id
 * @property string $origem
 */
final class OcupacaoSubLoteLegado extends Model
{
    use TenantAware;

    protected $table = 'cemetery_legacy_sublot_occupancy';

    protected $guarded = ['id', 'tenant_id'];

    /** @return BelongsTo<SubLoteLegado, $this> */
    public function subLote(): BelongsTo
    {
        return $this->belongsTo(SubLoteLegado::class, 'sublot_id');
    }
}
