<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Log de Conciliação e Atribuição de Códigos Oficiais do INEP no Retorno do Censo.
 */
final class EducaCensusInepLog extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_CONCILIADO = 'conciliado';
    public const STATUS_DIVERGENTE = 'divergente';
    public const STATUS_IGNORADO = 'ignorado';

    protected $table = 'educa_census_inep_logs';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'tipo_registro',
        'entidade_tipo',
        'entidade_id',
        'codigo_inep',
        'status',
        'mensagem',
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
