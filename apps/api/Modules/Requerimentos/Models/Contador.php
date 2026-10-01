<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Contador sequencial por tipo de instrumento/exercício (numeração "requerimento/1/2026").
 * Sem `TenantAware`, dois tenants colidiriam no mesmo contador — cada um precisa da própria
 * sequência isolada, como qualquer outra entidade de negócio do módulo.
 *
 * @property int    $id
 * @property int    $tenant_id
 * @property string $tipo_slug
 * @property int    $exercicio
 * @property int    $ultimo_numero
 */
final class Contador extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_contadores';

    protected $fillable = [
        'tenant_id',
        'tipo_slug',
        'exercicio',
        'ultimo_numero',
    ];

    protected $casts = [
        'tenant_id'     => 'integer',
        'exercicio'     => 'integer',
        'ultimo_numero' => 'integer',
    ];

    public $timestamps = true;
}