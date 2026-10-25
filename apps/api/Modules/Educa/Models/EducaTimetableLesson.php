<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Aula Semanal Alocada em um Slot com Docente e Componente Curricular.
 */
final class EducaTimetableLesson extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_timetable_lessons';

    protected $fillable = [
        'tenant_id',
        'timetable_slot_id',
        'dia_semana',
        'curriculum_component_id',
        'teacher_employee_id',
        'substitute_employee_id',
        'substituicao_inicio',
        'substituicao_fim',
        'substituicao_motivo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'dia_semana' => 'integer',
        'substituicao_inicio' => 'date',
        'substituicao_fim' => 'date',
    ];

    public function slot(): BelongsTo
    {
        return $this->belongsTo(EducaTimetableSlot::class, 'timetable_slot_id');
    }

    public function curriculumComponent(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'curriculum_component_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'teacher_employee_id');
    }

    public function substitute(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'substitute_employee_id');
    }

    public function classDiaries(): HasMany
    {
        return $this->hasMany(EducaClassDiary::class, 'timetable_lesson_id');
    }
}
