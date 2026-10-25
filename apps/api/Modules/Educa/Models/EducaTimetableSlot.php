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
 * Definição de Tempo de Aula ou Intervalo do Quadro.
 */
final class EducaTimetableSlot extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_timetable_slots';

    protected $fillable = [
        'tenant_id',
        'timetable_id',
        'numero_tempo',
        'hora_inicio',
        'hora_fim',
        'tipo',
        'descricao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'numero_tempo' => 'integer',
    ];

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(EducaTimetable::class, 'timetable_id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(EducaTimetableLesson::class, 'timetable_slot_id');
    }
}
