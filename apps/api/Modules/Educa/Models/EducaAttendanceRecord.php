<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de Assiduidade e Frequência do Estudante.
 */
final class EducaAttendanceRecord extends Model
{
    use HasUuids;
    use TenantAware;

    public const STATUS_PRESENTE = 'presente';
    public const STATUS_FALTA = 'falta';
    public const STATUS_FALTA_JUSTIFICADA = 'falta_justificada';

    protected $table = 'educa_attendance_records';

    protected $fillable = [
        'tenant_id',
        'class_diary_id',
        'class_enrollment_id',
        'status',
        'justificativa',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaClassDiary, self>
     */
    public function diario(): BelongsTo
    {
        return $this->belongsTo(EducaClassDiary::class, 'class_diary_id');
    }

    /**
     * @return BelongsTo<EducaClassEnrollment, self>
     */
    public function enturmacao(): BelongsTo
    {
        return $this->belongsTo(EducaClassEnrollment::class, 'class_enrollment_id');
    }
}
