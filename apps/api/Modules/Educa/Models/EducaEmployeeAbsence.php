<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Falta ou Atraso Funcional do Servidor Escolar.
 */
final class EducaEmployeeAbsence extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_employee_absences';

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'school_id',
        'data_falta',
        'tipo',
        'minutos',
        'justificada',
        'motivo_justificativa',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_falta' => 'date',
        'minutos' => 'integer',
        'justificada' => 'boolean',
    ];

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'employee_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }
}
