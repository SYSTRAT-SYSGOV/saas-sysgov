<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Fator de Avaliação Periódica de Desempenho (F1 a F8).
 */
final class FatorAvaliacao extends Model
{
    use TenantAware;

    protected $table = 'capd_fatores_avaliacao';

    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'descricao',
        'automatizado',
        'peso_geral',
        'peso_magisterio',
        'ordem',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'       => 'integer',
        'automatizado'    => 'boolean',
        'peso_geral'      => 'float',
        'peso_magisterio' => 'float',
        'ordem'           => 'integer',
        'ativo'           => 'boolean',
    ];

    public function diarios(): HasMany
    {
        return $this->hasMany(DiarioBordo::class, 'fator_id');
    }

    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }

    public function scopeForTenant(Builder $query, int $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }
}
