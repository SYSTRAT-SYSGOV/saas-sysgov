<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Cabeçalho do Calendário Escolar (da Unidade Escolar ou Matriz Geral da Secretaria).
 */
final class EducaAcademicCalendar extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_LOCKED = 'locked';

    protected $table = 'educa_academic_calendars';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'ano',
        'nome',
        'status',
        'carga_horaria_diaria_minutos',
        'total_school_days',
        'total_school_hours',
        'published_at',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'carga_horaria_diaria_minutos' => 'integer',
        'total_school_days' => 'integer',
        'total_school_hours' => 'float',
        'published_at' => 'datetime',
    ];

    /**
     * @return HasMany<EducaCalendarDay>
     */
    public function dias(): HasMany
    {
        return $this->hasMany(EducaCalendarDay::class, 'calendario_id')->orderBy('data');
    }

    /**
     * @return HasMany<EducaCalendarEvent>
     */
    public function eventos(): HasMany
    {
        return $this->hasMany(EducaCalendarEvent::class, 'calendario_id')->orderBy('data');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    public function isLocked(): bool
    {
        return $this->status === self::STATUS_LOCKED;
    }

    public function isRede(): bool
    {
        return $this->school_id === null;
    }

    /**
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeRede(Builder $query): Builder
    {
        return $query->whereNull('school_id');
    }

    /**
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }
}
