<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Coleta de resíduos (regular ou seletiva) associada a um gerador — ver spec
 * `meio-ambiente/residuos-solidos`. `rota` é campo texto livre nesta primeira
 * versão (ver design.md, Risks — integração com Gestão de Frota não existe ainda
 * no monorepo).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $gerador_residuo_id
 * @property string $tipo_coleta
 * @property string|null $rota
 * @property float $volume_kg
 * @property string $destinacao
 * @property \Illuminate\Support\Carbon $coletada_em
 */
final class ColetaResiduo extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_coletas_residuo';

    public const TIPO_COLETA_REGULAR = 'regular';
    public const TIPO_COLETA_SELETIVA = 'seletiva';

    public const TIPOS_COLETA_VALIDOS = [
        self::TIPO_COLETA_REGULAR,
        self::TIPO_COLETA_SELETIVA,
    ];

    public const DESTINACAO_ATERRO = 'aterro';
    public const DESTINACAO_RECICLAGEM = 'reciclagem';

    public const DESTINACOES_VALIDAS = [
        self::DESTINACAO_ATERRO,
        self::DESTINACAO_RECICLAGEM,
    ];

    protected $fillable = [
        'tenant_id',
        'gerador_residuo_id',
        'tipo_coleta',
        'rota',
        'volume_kg',
        'destinacao',
        'coletada_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'gerador_residuo_id' => 'integer',
        'volume_kg' => 'decimal:2',
        'coletada_em' => 'date',
    ];

    /** @return BelongsTo<GeradorResiduo, $this> */
    public function gerador(): BelongsTo
    {
        return $this->belongsTo(GeradorResiduo::class, 'gerador_residuo_id');
    }
}
