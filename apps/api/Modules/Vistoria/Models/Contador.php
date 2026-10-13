<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Contador sequencial por tipo de documento/exercício (numeração "auto_infracao/1/2026"),
 * mesmo padrão de `Modules\Requerimentos\Models\Contador`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo_slug
 * @property int $exercicio
 * @property int $ultimo_numero
 */
final class Contador extends Model
{
    use TenantAware;

    protected $table = 'vistoria_contadores';

    protected $fillable = [
        'tenant_id',
        'tipo_slug',
        'exercicio',
        'ultimo_numero',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'exercicio' => 'integer',
        'ultimo_numero' => 'integer',
    ];
}
