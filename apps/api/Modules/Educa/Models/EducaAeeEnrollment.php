<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Matrícula de Dupla Entrada na Sala de Recursos Multifuncionais (AEE Contraturno).
 */
final class EducaAeeEnrollment extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_enrollments';

    protected $fillable = [
        'tenant_id',
        'student_profile_id',
        'resource_room_id',
        'regular_enrollment_id',
        'turno_atendimento',
        'dias_semana',
        'horario_inicio',
        'horario_fim',
        'frequencia_semanal',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'dias_semana' => 'array',
        'frequencia_semanal' => 'integer',
    ];

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(EducaAeeStudentProfile::class, 'student_profile_id');
    }

    public function resourceRoom(): BelongsTo
    {
        return $this->belongsTo(EducaAeeResourceRoom::class, 'resource_room_id');
    }

    public function regularEnrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'regular_enrollment_id');
    }
}
