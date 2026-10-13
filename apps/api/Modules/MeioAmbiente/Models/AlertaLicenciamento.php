<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Alerta de vencimento de licença, gerado pelo job diário de verificação de
 * prazos (90/30/7 dias) — ver spec `meio-ambiente/licenciamento`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_licenciamento_id
 * @property int $dias_para_vencimento
 * @property \Illuminate\Support\Carbon $gerado_em
 */
final class AlertaLicenciamento extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_alertas_licenciamento';

    protected $fillable = [
        'tenant_id',
        'processo_licenciamento_id',
        'dias_para_vencimento',
        'gerado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_licenciamento_id' => 'integer',
        'dias_para_vencimento' => 'integer',
        'gerado_em' => 'datetime',
    ];

    /** @return BelongsTo<ProcessoLicenciamento, $this> */
    public function processoLicenciamento(): BelongsTo
    {
        return $this->belongsTo(ProcessoLicenciamento::class, 'processo_licenciamento_id');
    }
}
