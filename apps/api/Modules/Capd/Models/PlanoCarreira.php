<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Plano de Carreira (Geral vs Magistério) para cálculo ponderado de notas no CAPD.
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
