<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Catálogo de Motivos de Dias do Calendário (Feriados, Recesso, Sábados Letivos).
 */
final class EducaCalendarDayReason extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_calendar_day_reasons';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'codigo',
        'nome',
        'tipo',
        'is_school_day',
        'color_hex',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'is_school_day' => 'boolean',
    ];

    /**
     * @return HasMany<EducaCalendarDay>
     */
    public function dias(): HasMany
    {
        return $this->hasMany(EducaCalendarDay::class, 'motivo_id');
    }
}
