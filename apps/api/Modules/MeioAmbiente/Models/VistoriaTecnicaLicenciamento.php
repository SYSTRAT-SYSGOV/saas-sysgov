<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vistoria técnica (parecer favorável/desfavorável) vinculada a um processo de
 * licenciamento — ver spec `meio-ambiente/licenciamento`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_licenciamento_id
 * @property string $resultado
 * @property string|null $parecer
 * @property \Illuminate\Support\Carbon $realizada_em
 */
final class VistoriaTecnicaLicenciamento extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_vistorias_tecnicas_licenciamento';

    public const RESULTADO_FAVORAVEL = 'favoravel';
    public const RESULTADO_DESFAVORAVEL = 'desfavoravel';

    protected $fillable = [
        'tenant_id',
        'processo_licenciamento_id',
        'resultado',
        'parecer',
        'realizada_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_licenciamento_id' => 'integer',
        'realizada_em' => 'date',
    ];

    /** @return BelongsTo<ProcessoLicenciamento, $this> */
    public function processoLicenciamento(): BelongsTo
    {
        return $this->belongsTo(ProcessoLicenciamento::class, 'processo_licenciamento_id');
    }
}
