<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registro de Exportação Oficial do Censo Escolar (INEP/MEC).
 */
final class EducaCensusExport extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const ETAPA_MATRICULA_INICIAL = 'matricula_inicial';
    public const ETAPA_SITUACAO_ALUNO = 'situacao_aluno';

    public const STATUS_SOLICITADA = 'solicitada';
    public const STATUS_PROCESSANDO = 'processando';
    public const STATUS_CONCLUIDA = 'concluida';
    public const STATUS_FALHOU = 'falhou';

    protected $table = 'educa_census_exports';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'ano',
        'etapa_censo',
        'status',
        'total_linhas',
        'total_erros',
        'total_avisos',
        'checksum_sha256',
        'arquivo_path',
        'erro_detalhe',
    ];

    protected $casts = [
        'ano' => 'integer',
        'total_linhas' => 'integer',
        'total_erros' => 'integer',
        'total_avisos' => 'integer',
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
