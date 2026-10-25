<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Lotação Semanal do Servidor em Unidade Escolar.
 */
final class EducaEmployeeAllocation extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_ATIVA = 'ativa';
    public const STATUS_SUSPENSA = 'suspensa';
    public const STATUS_CANCELADA = 'cancelada';

    protected $table = 'educa_employee_allocations';

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'school_id',
        'academic_year_id',
        'turno',
        'dia_semana',
        'horas_regencia',
        'horas_atividade',
        'horas_excedentes',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'dia_semana' => 'integer',
        'horas_regencia' => 'float',
        'horas_atividade' => 'float',
        'horas_excedentes' => 'float',
    ];

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'employee_id');
    }

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function employee(): BelongsTo
    {
        return $this->servidor();
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function anoLetivo(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    public function getCargaTotalAttribute(): float
    {
        return (float) ($this->horas_regencia + $this->horas_atividade + $this->horas_excedentes);
    }
}
