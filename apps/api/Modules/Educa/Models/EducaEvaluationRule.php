<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Regra de Avaliação e Fórmulas de Cálculo Escolar.
 */
final class EducaEvaluationRule extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const TIPO_NOTA_NUMERICA = 'numerica';
    public const TIPO_NOTA_CONCEITUAL = 'conceitual';
    public const TIPO_NOTA_PARECER = 'parecer';

    protected $table = 'educa_evaluation_rules';

    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo_nota',
        'nota_maxima',
        'nota_minima_aprovacao',
        'formula_media_anual',
        'formula_recuperacao',
        'formula_exame_final',
        'nota_minima_exame',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'nota_maxima' => 'decimal:2',
        'nota_minima_aprovacao' => 'decimal:2',
        'nota_minima_exame' => 'decimal:2',
        'ativo' => 'boolean',
    ];

    /**
     * @return HasMany<EducaGradeScale>
     */
    public function escalas(): HasMany
    {
        return $this->hasMany(EducaGradeScale::class, 'evaluation_rule_id');
    }

    /**
     * @return HasMany<EducaStudentGrade>
     */
    public function notas(): HasMany
    {
        return $this->hasMany(EducaStudentGrade::class, 'evaluation_rule_id');
    }
}
