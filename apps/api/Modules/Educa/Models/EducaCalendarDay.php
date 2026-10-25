<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de Dia do Calendário Escolar com representação em data ISO.
 */
final class EducaCalendarDay extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_calendar_days';

    protected $fillable = [
        'tenant_id',
        'calendario_id',
        'data',
        'dia_da_semana',
        'motivo_id',
        'is_school_day',
        'origem',
        'descricao',
        'carga_horaria_minutos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data' => 'date:Y-m-d',
        'dia_da_semana' => 'integer',
        'is_school_day' => 'boolean',
        'carga_horaria_minutos' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaAcademicCalendar, self>
     */
    public function calendario(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicCalendar::class, 'calendario_id');
    }

    /**
     * @return BelongsTo<EducaCalendarDayReason, self>
     */
    public function motivo(): BelongsTo
    {
        return $this->belongsTo(EducaCalendarDayReason::class, 'motivo_id');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<EducaSchoolClass>
     */
    public function turmas(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(EducaSchoolClass::class, 'educa_calendar_day_classes', 'calendar_day_id', 'school_class_id')
            ->using(EducaCalendarDayClass::class)
            ->withPivot('id', 'tenant_id')
            ->withTimestamps();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<EducaCalendarEvent>
     */
    public function eventos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EducaCalendarEvent::class, 'calendar_day_id');
    }
}
