<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Pergunta / Item de Avaliação parametrizável.
 *
 * Suporta a "Escala Gráfica para Avaliação de Desempenho" (Chiavenato) com graus de 1 a 5,
 * além de outros tipos de input e regras de trava antileniência via CIT (Diário de Bordo).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $modelo_id
 * @property string $codigo
 * @property string $enunciado
 * @property string $tipo
 * @property array<int, array{valor: int|string, rotulo: string, descricao?: string}>|null $opcoes
 * @property float $peso
 * @property string $grupo_key
 * @property int $ordem
 * @property bool $obrigatoria
 * @property bool $exige_evidencia
 * @property array<string, mixed>|null $regras_condicionais
 * @property array<int, string>|null $cargos_permitidos
 * @property bool $ativo
 */
final class Pergunta extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_perguntas';

    public const TIPO_ESCALA_GRAFICA   = 'escala_grafica';
    public const TIPO_ESCOLHA_SIMPLES  = 'escolha_simples';
    public const TIPO_ESCOLHA_MULTIPLA = 'escolha_multipla';
    public const TIPO_TEXTO_LIVRE      = 'texto_livre';
    public const TIPO_NOTA_0_10        = 'nota_0_10';
    public const TIPO_SIM_NAO          = 'sim_nao';
    public const TIPO_CONDICIONAL      = 'condicional';

    public const TIPOS_VALIDOS = [
        self::TIPO_ESCALA_GRAFICA,
        self::TIPO_ESCOLHA_SIMPLES,
        self::TIPO_ESCOLHA_MULTIPLA,
        self::TIPO_TEXTO_LIVRE,
        self::TIPO_NOTA_0_10,
        self::TIPO_SIM_NAO,
        self::TIPO_CONDICIONAL,
    ];

    protected $fillable = [
        'tenant_id',
        'modelo_id',
        'codigo',
        'enunciado',
        'tipo',
        'opcoes',
        'peso',
        'grupo_key',
        'ordem',
        'obrigatoria',
        'exige_evidencia',
        'regras_condicionais',
        'cargos_permitidos',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'modelo_id'           => 'integer',
        'peso'                => 'float',
        'ordem'               => 'integer',
        'obrigatoria'         => 'boolean',
        'exige_evidencia'     => 'boolean',
        'opcoes'              => 'array',
        'regras_condicionais' => 'array',
        'cargos_permitidos'   => 'array',
        'ativo'               => 'boolean',
    ];

    public function modelo(): BelongsTo
    {
        return $this->belongsTo(ModeloFormulario::class, 'modelo_id');
    }

    public function scopeAtivas(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }

    public function scopeDoGrupo(Builder $query, string $grupoKey): Builder
    {
        return $query->where('grupo_key', $grupoKey);
    }
}
