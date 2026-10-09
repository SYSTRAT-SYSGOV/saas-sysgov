<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Alerta de vencimento de outorga de água ou licença de lançamento de efluentes,
 * gerado pelo job diário de verificação de prazos — ver spec
 * `meio-ambiente/recursos-hidricos`. `referencia_id` casa por `tipo_referencia`
 * (texto livre), mesmo padrão não polimórfico do restante do monorepo (ver
 * `AuditLog`/`resource`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo_referencia
 * @property int $referencia_id
 * @property int $dias_para_vencimento
 * @property \Illuminate\Support\Carbon $gerado_em
 */
final class AlertaRecursoHidrico extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_alertas_recursos_hidricos';

    public const TIPO_OUTORGA_AGUA = 'outorga_agua';
    public const TIPO_LICENCA_EFLUENTE = 'licenca_efluente';

    protected $fillable = [
        'tenant_id',
        'tipo_referencia',
        'referencia_id',
        'dias_para_vencimento',
        'gerado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'referencia_id' => 'integer',
        'dias_para_vencimento' => 'integer',
        'gerado_em' => 'datetime',
    ];
}
