<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Sub-lote/gaveta com concessão administrativa própria, exclusivo do Cemitério
 * Independência (TTT.DBF legado) — subdivisão de um lote físico já existente
 * em `plot_inventory`, não uma nova unidade de sepultamento de primeira classe.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $plot_id
 * @property string $codigo_sublote
 * @property string|null $processo_administrativo
 * @property \Illuminate\Support\Carbon|null $validade_concessao
 * @property string $origem
 */
final class SubLoteLegado extends Model
{
    use TenantAware;

    protected $table = 'cemetery_legacy_sublots';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['validade_concessao' => 'date'];

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return HasOne<OcupacaoSubLoteLegado, $this> */
    public function ocupacao(): HasOne
    {
        return $this->hasOne(OcupacaoSubLoteLegado::class, 'sublot_id');
    }
}
