<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Plano de Carreira para cálculo ponderado de notas no CAPD.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $codigo
 * @property string $nome
 * @property string|null $lei_referencia
 * @property bool $ativo
 */
final class PlanoCarreira extends Model
{
    use TenantAware;

    protected $table = 'capd_planos_carreira';

    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'lei_referencia',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo'     => 'boolean',
    ];

    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }
}
