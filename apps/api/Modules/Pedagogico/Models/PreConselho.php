<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;

/**
 * Ficha de pré-conselho de uma turma × matéria × período × ano (uma por combinação; reenviar atualiza).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $materia_id
 * @property int $ano_letivo
 * @property int $periodo
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PreConselhoAluno> $alunos
 */
final class PreConselho extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_pre_conselhos';

    /** Campos da ficha preenchidos pelo professor/pedagogia. */
    public const CAMPOS_FICHA = [
        'data_registro', 'desempenho_geral', 'desempenho_justificativa', 'conteudos_trabalhados', 'objetivos_atingidos',
        'metodologias', 'metodologias_outras', 'metodologias_eficacia', 'instrumentos_avaliativos', 'instrumentos_adequados',
        'instrumentos_outros', 'instrumentos_obs', 'engajamento_nivel', 'engajamento_dificuldades', 'engajamento_potencialidades',
        'dificuldades_aprendizagem', 'estrategias_superacao', 'socioemocional_status', 'socioemocional_descricao', 'obs_pedagogicas',
    ];

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'turma_id', 'materia_id', 'ano_letivo', 'periodo', 'registrado_por', ...self::CAMPOS_FICHA,
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'turma_id' => 'integer', 'materia_id' => 'integer', 'ano_letivo' => 'integer',
        'periodo' => 'integer', 'data_registro' => 'date:Y-m-d', 'metodologias' => 'array',
        'instrumentos_avaliativos' => 'array', 'registrado_por' => 'integer',
    ];

    /** @return HasMany<PreConselhoAluno, $this> */
    public function alunos(): HasMany
    {
        return $this->hasMany(PreConselhoAluno::class, 'pre_conselho_id');
    }

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id')->withTrashed();
    }

    /** @return BelongsTo<Materia, $this> */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id')->withTrashed();
    }
}
