<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Alocação de Profissional de Apoio Escolar (Cuidador, Intérprete Libras, etc.).
 */
final class EducaAeeSupportAllocation extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_support_allocations';

    protected $fillable = [
        'tenant_id',
        'student_profile_id',
        'school_id',
        'caregiver_employee_id',
        'tipo_apoio',
        'turno',
        'carga_horaria_semanal',
        'data_inicio',
        'data_fim',
        'observacoes',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'carga_horaria_semanal' => 'integer',
        'data_inicio' => 'date',
        'data_fim' => 'date',
    ];

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(EducaAeeStudentProfile::class, 'student_profile_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function caregiverEmployee(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'caregiver_employee_id');
    }
}
