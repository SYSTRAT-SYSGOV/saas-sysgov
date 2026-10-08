<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Outorga de uso da água (poço ou captação superficial) vinculada a um
 * empreendimento — ver spec `meio-ambiente/recursos-hidricos`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $empreendimento_id
 * @property string $tipo_captacao
 * @property float $vazao_m3_hora
 * @property string $finalidade
 * @property \Illuminate\Support\Carbon $validade_em
 */
final class OutorgaAgua extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_outorgas_agua';

    public const TIPO_CAPTACAO_POCO = 'poco';
    public const TIPO_CAPTACAO_SUPERFICIAL = 'captacao_superficial';

    public const TIPOS_CAPTACAO_VALIDOS = [
        self::TIPO_CAPTACAO_POCO,
        self::TIPO_CAPTACAO_SUPERFICIAL,
    ];

    public const FINALIDADE_ABASTECIMENTO = 'abastecimento';
    public const FINALIDADE_IRRIGACAO = 'irrigacao';
    public const FINALIDADE_INDUSTRIAL = 'industrial';
    public const FINALIDADE_OUTRA = 'outra';

    public const FINALIDADES_VALIDAS = [
        self::FINALIDADE_ABASTECIMENTO,
        self::FINALIDADE_IRRIGACAO,
        self::FINALIDADE_INDUSTRIAL,
        self::FINALIDADE_OUTRA,
    ];

    /** Validade padrão, em dias, a partir do cadastro — parametrização inicial, ver design.md. */
    public const VALIDADE_DIAS = 1825;

    protected $fillable = [
        'tenant_id',
        'empreendimento_id',
        'tipo_captacao',
        'vazao_m3_hora',
        'finalidade',
        'validade_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'empreendimento_id' => 'integer',
        'vazao_m3_hora' => 'decimal:2',
        'validade_em' => 'date',
    ];

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }
}
