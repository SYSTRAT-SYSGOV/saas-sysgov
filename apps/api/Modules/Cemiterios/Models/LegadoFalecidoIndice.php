<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cópia de preservação/auditoria do FALECIDO.DBF legado (índice de ocupação por lote).
 * Não alimenta nenhuma regra de negócio — os mesmos dados já chegam completos via
 * DADOS.DBF/DADOS.csv (Falecido + Inumacao). Existe apenas para não descartar o
 * arquivo de origem sem deixar rastro auditável da migração.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $park_id
 * @property string $quadra_legado
 * @property string $lote_legado
 * @property string $origem
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class LegadoFalecidoIndice extends Model
{
    use TenantAware;

    protected $table = 'cemetery_legacy_deceased_lots';

    protected $guarded = ['id', 'tenant_id'];

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }
}
