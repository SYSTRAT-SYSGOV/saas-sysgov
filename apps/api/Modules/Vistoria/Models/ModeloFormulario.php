<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modelo de formulário/checklist de vistoria, parametrizável por tipo de fiscalização
 * (mesmo domínio de valores de `LocalFiscalizavel::classificacao_atividade`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo_fiscalizacao
 * @property string $nome
 * @property string|null $descricao
 * @property bool $ativo
 */
final class ModeloFormulario extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_modelos_formulario';

    protected $fillable = [
        'tenant_id',
        'tipo_fiscalizacao',
        'nome',
        'descricao',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo' => 'boolean',
    ];

    /** @return HasMany<Pergunta, $this> */
    public function perguntas(): HasMany
    {
        return $this->hasMany(Pergunta::class, 'modelo_id')->orderBy('ordem');
    }

    /** @return HasMany<Pergunta, $this> */
    public function perguntasAtivas(): HasMany
    {
        return $this->perguntas()->where('ativo', true);
    }

    /**
     * @param Builder<ModeloFormulario> $query
     *
     * @return Builder<ModeloFormulario>
     */
    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }
}
