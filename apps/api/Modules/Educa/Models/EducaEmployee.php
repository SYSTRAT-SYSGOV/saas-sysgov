<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Servidor Escolar Municipal (Extensão Funcional de Pessoa).
 */
final class EducaEmployee extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_employees';

    protected $fillable = [
        'tenant_id',
        'pessoa_id',
        'carga_horaria_semanal',
        'escolaridade',
        'codigo_inep_docente',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'carga_horaria_semanal' => 'float',
        'ativo' => 'boolean',
    ];

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /**
     * @return HasMany<EducaEmployeeRole, self>
     */
    public function funcoes(): HasMany
    {
        return $this->hasMany(EducaEmployeeRole::class, 'employee_id');
    }

    /**
     * @return HasMany<EducaEmployeeAllocation, self>
     */
    public function alocacoes(): HasMany
    {
        return $this->hasMany(EducaEmployeeAllocation::class, 'employee_id');
    }

    /**
     * @return HasMany<EducaTeacherQualification, self>
     */
    public function habilitacoes(): HasMany
    {
        return $this->hasMany(EducaTeacherQualification::class, 'employee_id');
    }

    /**
     * @return HasMany<EducaEmployeeWithdrawal, self>
     */
    public function afastamentos(): HasMany
    {
        return $this->hasMany(EducaEmployeeWithdrawal::class, 'employee_id');
    }

    /**
     * @return HasMany<EducaEmployeeAbsence, self>
     */
    public function faltas(): HasMany
    {
        return $this->hasMany(EducaEmployeeAbsence::class, 'employee_id');
    }

    public function isDocente(): bool
    {
        return $this->funcoes()->where('is_docente', true)->exists();
    }

    public function timetableLessons(): HasMany
    {
        return $this->hasMany(EducaTimetableLesson::class, 'teacher_employee_id');
    }

    public function substituteLessons(): HasMany
    {
        return $this->hasMany(EducaTimetableLesson::class, 'substitute_employee_id');
    }
}
