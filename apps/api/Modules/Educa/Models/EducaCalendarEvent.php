<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Evento ou anotação pedagógica/administrativa do calendário escolar.
 */
final class EducaCalendarEvent extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_calendar_events';

    protected $fillable = [
        'tenant_id',
        'calendario_id',
        'calendar_day_id',
        'data',
        'titulo',
        'descricao',
        'tipo_evento',
        'horario_inicio',
        'horario_fim',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data' => 'date:Y-m-d',
    ];

    /**
     * @return BelongsTo<EducaAcademicCalendar, self>
     */
    public function calendario(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicCalendar::class, 'calendario_id');
    }

    /**
     * @return BelongsTo<EducaCalendarDay, self>
     */
    public function dia(): BelongsTo
    {
        return $this->belongsTo(EducaCalendarDay::class, 'calendar_day_id');
    }
}
