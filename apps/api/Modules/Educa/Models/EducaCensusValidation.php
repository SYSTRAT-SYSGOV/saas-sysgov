<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Diagnóstico de Auditoria e Validação Prévia do Educacenso.
 */
final class EducaCensusValidation extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const GRAVIDADE_IMPEDITIVO = 'impeditivo';
    public const GRAVIDADE_AVISO = 'aviso';

    protected $table = 'educa_census_validations';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'tipo_registro',
        'gravidade',
        'codigo_regra',
        'mensagem',
        'entidade_tipo',
        'entidade_id',
        'rota_correcao',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }
}
