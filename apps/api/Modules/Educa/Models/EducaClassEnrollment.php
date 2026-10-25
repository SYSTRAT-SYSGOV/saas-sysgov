<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Enturmação do Estudante em uma Turma Física.
 */
final class EducaClassEnrollment extends Model
{
    use HasUuids;
    use TenantAware;

    public const STATUS_ATIVA = 'ativa';
    public const STATUS_ENCERRADA = 'encerrada';
    public const STATUS_REMANEJADA = 'remanejada';

    protected $table = 'educa_class_enrollments';

    protected $fillable = [
        'tenant_id',
        'enrollment_id',
        'school_class_id',
        'numero_ordem',
        'data_entrada',
        'data_saida',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'numero_ordem' => 'integer',
        'data_entrada' => 'date:Y-m-d',
        'data_saida' => 'date:Y-m-d',
    ];

    /**
     * @return BelongsTo<EducaEnrollment, self>
     */
    public function matricula(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    /**
     * @return BelongsTo<EducaSchoolClass, self>
     */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'school_class_id');
    }
}
