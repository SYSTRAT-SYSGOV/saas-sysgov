<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tipo de Instrumento — parametrização dos tipos de proposição.
 *
 * @property int    $id
 * @property int    $tenant_id
 * @property string $nome
 * @property string $slug
 * @property string|null $descricao
 * @property string $poder_origem
 * @property int|null $prazo_regimental_dias
 * @property array<string, mixed>|null $campos_especificos
 * @property bool   $exige_tramitacao_interna
 * @property bool   $ativo
 * @property int    $ordem
 */
final class TipoInstrumento extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_tipos_instrumento';

    protected $fillable = [
        'tenant_id',
        'nome',
        'slug',
        'descricao',
        'poder_origem',
        'prazo_regimental_dias',
        'campos_especificos',
        'exige_tramitacao_interna',
        'ativo',
        'ordem',
    ];

    protected $casts = [
        'tenant_id'                => 'integer',
        'prazo_regimental_dias'    => 'integer',
        'campos_especificos'       => 'array',
        'exige_tramitacao_interna' => 'boolean',
        'ativo'                    => 'boolean',
        'ordem'                    => 'integer',
    ];

    /** @return HasMany<Proposicao, $this> */
    public function proposicoes(): HasMany
    {
        return $this->hasMany(Proposicao::class, 'tipo_instrumento_id');
    }

    /** @return HasMany<WorkflowConfig, $this> */
    public function workflows(): HasMany
    {
        return $this->hasMany(WorkflowConfig::class, 'tipo_instrumento_id');
    }

    /**
     * @param Builder<TipoInstrumento> $query
     * @return Builder<TipoInstrumento>
     */
    public function scopeAtivo(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }

    /**
     * @param Builder<TipoInstrumento> $query
     * @return Builder<TipoInstrumento>
     */
    public function scopeOrdenado(Builder $query): Builder
    {
        return $query->orderBy('ordem')->orderBy('nome');
    }
}