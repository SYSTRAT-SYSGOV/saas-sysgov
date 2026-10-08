<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Vistoria\Models\Documento;

/**
 * Extensão fina do `Documento` (auto de infração) do módulo Vistoria com os dados
 * específicos do direito ambiental — tipificação, área afetada e cálculo de multa.
 * Reaproveita inteiramente a emissão de documento, assinatura e processo
 * sancionatório do Vistoria (ver `Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService`
 * e design.md, decisão D3) — não duplica essa lógica.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $documento_id
 * @property int $empreendimento_id
 * @property string $tipo_infracao
 * @property float|null $area_afetada_ha
 * @property bool $reincidente
 * @property int|null $valor_multa_sugerido_centavos
 */
final class AutoInfracaoAmbiental extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_autos_infracao';

    public const TIPO_DESMATAMENTO = 'desmatamento';
    public const TIPO_POLUICAO_HIDRICA = 'poluicao_hidrica';
    public const TIPO_POLUICAO_ATMOSFERICA = 'poluicao_atmosferica';
    public const TIPO_QUEIMADA = 'queimada';
    public const TIPO_CACA_ILEGAL = 'caca_ilegal';
    public const TIPO_OUTRA = 'outra';

    public const TIPOS_VALIDOS = [
        self::TIPO_DESMATAMENTO,
        self::TIPO_POLUICAO_HIDRICA,
        self::TIPO_POLUICAO_ATMOSFERICA,
        self::TIPO_QUEIMADA,
        self::TIPO_CACA_ILEGAL,
        self::TIPO_OUTRA,
    ];

    /** Janela de reincidência, em meses — ver spec `meio-ambiente/fiscalizacao-ambiental`. */
    public const JANELA_REINCIDENCIA_MESES = 24;

    protected $fillable = [
        'tenant_id',
        'documento_id',
        'empreendimento_id',
        'tipo_infracao',
        'area_afetada_ha',
        'reincidente',
        'valor_multa_sugerido_centavos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'documento_id' => 'integer',
        'empreendimento_id' => 'integer',
        'area_afetada_ha' => 'decimal:2',
        'reincidente' => 'boolean',
        'valor_multa_sugerido_centavos' => 'integer',
    ];

    /** @return BelongsTo<Documento, $this> */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }
}
