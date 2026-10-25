<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Nota e Conceito de Avaliação do Estudante por Etapa.
 */
final class EducaStudentGrade extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_student_grades';

    protected $fillable = [
        'tenant_id',
        'enrollment_id',
        'curriculum_component_id',
        'evaluation_rule_id',
        'etapa_sequencial',
        'nota_bruta',
        'nota_recuperacao',
        'nota_arredondada',
        'conceito',
        'parecer_descritivo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'etapa_sequencial' => 'integer',
        'nota_bruta' => 'decimal:2',
        'nota_recuperacao' => 'decimal:2',
        'nota_arredondada' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<EducaEnrollment, self>
     */
    public function matricula(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumComponent, self>
     */
    public function componente(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'curriculum_component_id');
    }

    /**
     * @return BelongsTo<EducaEvaluationRule, self>
     */
    public function regra(): BelongsTo
    {
        return $this->belongsTo(EducaEvaluationRule::class, 'evaluation_rule_id');
    }
}
