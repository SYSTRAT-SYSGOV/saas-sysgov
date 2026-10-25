<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Extensão Educacional da OrgUnit (Escola da Rede Municipal).
 */
final class EducaSchool extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_schools';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'codigo_inep',
        'sigla',
        'situacao_funcionamento',
        'dependencia_administrativa',
        'zona',
        'regulamentada',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'regulamentada' => 'boolean',
    ];

    protected $appends = [
        'nome',
    ];

    /**
     * @return BelongsTo<OrgUnit, self>
     */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    /**
     * Nome da escola herdado da OrgUnit no organograma.
     */
    public function getNomeAttribute(): string
    {
        return $this->orgUnit?->name ?? $this->sigla;
    }

    /**
     * @return BelongsToMany<EducaCourse>
     */
    public function cursos(): BelongsToMany
    {
        return $this->belongsToMany(EducaCourse::class, 'educa_school_courses', 'school_id', 'course_id')
            ->withPivot('autorizacao_ato', 'data_autorizacao')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<EducaGrade>
     */
    public function series(): BelongsToMany
    {
        return $this->belongsToMany(EducaGrade::class, 'educa_school_grades', 'school_id', 'grade_id')
            ->withPivot('bloquear_enturmacao_sem_vaga', 'bloquear_abertura_turma_com_vagas')
            ->withTimestamps();
    }

    /**
     * @return HasMany<EducaSchoolClass>
     */
    public function turmas(): HasMany
    {
        return $this->hasMany(EducaSchoolClass::class, 'school_id');
    }

    /**
     * @return HasMany<EducaMealLog>
     */
    public function mealLogs(): HasMany
    {
        return $this->hasMany(EducaMealLog::class, 'school_id');
    }

    /**
     * @return HasMany<EducaSchoolCapacity>
     */
    public function capacities(): HasMany
    {
        return $this->hasMany(EducaSchoolCapacity::class, 'school_id');
    }

    /**
     * @return HasMany<EducaWaitlist>
     */
    public function waitlistEntries(): HasMany
    {
        return $this->hasMany(EducaWaitlist::class, 'school_id');
    }

    /**
     * @return HasMany<EducaAeeStudentProfile>
     */
    public function aeeStudentProfiles(): HasMany
    {
        return $this->hasMany(EducaAeeStudentProfile::class, 'school_id');
    }

    /**
     * @return HasMany<EducaAeeResourceRoom>
     */
    public function aeeResourceRooms(): HasMany
    {
        return $this->hasMany(EducaAeeResourceRoom::class, 'school_id');
    }

    /**
     * @return HasMany<EducaAeeSupportAllocation>
     */
    public function aeeSupportAllocations(): HasMany
    {
        return $this->hasMany(EducaAeeSupportAllocation::class, 'school_id');
    }

    /**
     * @return HasMany<EducaConselhoCronograma>
     */
    public function conselhoCronogramas(): HasMany
    {
        return $this->hasMany(EducaConselhoCronograma::class, 'school_id');
    }

    /**
     * @return HasMany<EducaConselhoAta>
     */
    public function conselhoAtas(): HasMany
    {
        return $this->hasMany(EducaConselhoAta::class, 'school_id');
    }
}


