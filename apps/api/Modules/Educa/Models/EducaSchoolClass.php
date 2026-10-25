<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Turma Escolar com controle de vagas e turnos.
 */
final class EducaSchoolClass extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_school_classes';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'course_id',
        'grade_id',
        'matrix_id',
        'codigo',
        'nome',
        'sigla',
        'turno',
        'sala',
        'lotacao_maxima',
        'lotacao_efetiva',
        'tipo_atendimento',
        'is_multiseriada',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'lotacao_maxima' => 'integer',
        'lotacao_efetiva' => 'integer',
        'is_multiseriada' => 'boolean',
    ];

    protected $appends = [
        'vagas_disponiveis',
    ];

    /**
     * Vagas disponíveis calculadas: lotação máxima menos alunos matriculados efetivos.
     */
    public function getVagasDisponiveisAttribute(): int
    {
        return max(0, (int) $this->lotacao_maxima - (int) $this->lotacao_efetiva);
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function school(): BelongsTo
    {
        return $this->escola();
    }

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function anoLetivo(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }

    /**
     * @return BelongsTo<EducaGrade, self>
     */
    public function serie(): BelongsTo
    {
        return $this->belongsTo(EducaGrade::class, 'grade_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumMatrix, self>
     */
    public function matriz(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumMatrix::class, 'matrix_id');
    }

    public function timetables(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EducaTimetable::class, 'school_class_id');
    }

    public function activeTimetable(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EducaTimetable::class, 'school_class_id')->where('ativo', true);
    }

    /**
     * @return HasMany<EducaConselhoPreConselho>
     */
    public function preConselhos(): HasMany
    {
        return $this->hasMany(EducaConselhoPreConselho::class, 'school_class_id');
    }

    /**
     * @return HasMany<EducaConselhoAta>
     */
    public function conselhoAtas(): HasMany
    {
        return $this->hasMany(EducaConselhoAta::class, 'school_class_id');
    }
}


