<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Pivô entre Dia do Calendário e Turma Específica.
 */
final class EducaCalendarDayClass extends Pivot
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_calendar_day_classes';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'calendar_day_id',
        'school_class_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
    ];
}
