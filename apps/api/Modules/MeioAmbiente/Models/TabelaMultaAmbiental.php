<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Tabela de enquadramento legal de multas ambientais, parametrizada inicialmente pelo
 * Decreto Federal 6.514/2008 — editável por `meio_ambiente.chefia` sem deploy. Ver spec
 * `meio-ambiente/fiscalizacao-ambiental` e design.md (decisão D4).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo_infracao
 * @property string $criterio
 * @property int $valor_base_centavos
 * @property int $agravante_reincidencia_percentual
 */
final class TabelaMultaAmbiental extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_tabelas_multa';

    public const CRITERIO_POR_HECTARE = 'por_hectare';
    public const CRITERIO_FIXO = 'fixo';

    protected $fillable = [
        'tenant_id',
        'tipo_infracao',
        'criterio',
        'valor_base_centavos',
        'agravante_reincidencia_percentual',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'valor_base_centavos' => 'integer',
        'agravante_reincidencia_percentual' => 'integer',
    ];
}
