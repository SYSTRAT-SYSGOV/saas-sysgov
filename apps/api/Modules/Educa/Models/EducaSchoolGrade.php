<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Oferta de Série por Escola (com parâmetros de travas de vagas).
 */
final class EducaSchoolGrade extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_school_grades';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'grade_id',
        'bloquear_enturmacao_sem_vaga',
        'bloquear_abertura_turma_com_vagas',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'bloquear_enturmacao_sem_vaga' => 'boolean',
        'bloquear_abertura_turma_com_vagas' => 'boolean',
    ];

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaGrade, self>
     */
    public function serie(): BelongsTo
    {
        return $this->belongsTo(EducaGrade::class, 'grade_id');
    }
}
