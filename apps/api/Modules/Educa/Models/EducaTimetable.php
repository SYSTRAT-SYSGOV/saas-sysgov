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
 * Cabeçalho do Quadro de Horários da Turma.
 */
final class EducaTimetable extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_timetables';

    protected $fillable = [
        'tenant_id',
        'school_class_id',
        'academic_year_id',
        'nome',
        'turno',
        'ativo',
        'data_inicio_vigencia',
        'data_fim_vigencia',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo' => 'boolean',
        'data_inicio_vigencia' => 'date',
        'data_fim_vigencia' => 'date',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'school_class_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(EducaTimetableSlot::class, 'timetable_id')->orderBy('numero_tempo');
    }
}
