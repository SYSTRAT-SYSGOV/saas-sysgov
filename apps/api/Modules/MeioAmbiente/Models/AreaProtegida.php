<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Área de Preservação Permanente (APP), reserva legal ou unidade de conservação
 * municipal, com geometria georreferenciada (GeoJSON Polygon/MultiPolygon) — ver
 * spec `meio-ambiente/areas-protegidas` e design.md (decisão D6: coluna `JSON` em
 * vez de tipo espacial nativo do MySQL, decisão deliberadamente não definitiva).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo
 * @property string|null $subtipo
 * @property array<string, mixed> $geometria
 * @property string|null $ato_legal
 */
final class AreaProtegida extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_areas_protegidas';

    public const TIPO_APP = 'app';
    public const TIPO_RESERVA_LEGAL = 'reserva_legal';
    public const TIPO_UNIDADE_CONSERVACAO = 'unidade_conservacao';

    public const TIPOS_VALIDOS = [
        self::TIPO_APP,
        self::TIPO_RESERVA_LEGAL,
        self::TIPO_UNIDADE_CONSERVACAO,
    ];

    protected $fillable = [
        'tenant_id',
        'tipo',
        'subtipo',
        'geometria',
        'ato_legal',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'geometria' => 'array',
    ];
}
