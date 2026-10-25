<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Registro de ocorrência disciplinar, pedagógica ou elogio de conduta do estudante.
 */
final class EducaStudentIncident extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const TIPO_DISCIPLINAR = 'disciplinar';
    public const TIPO_PEDAGOGICA = 'pedagogica';
    public const TIPO_SAUDE = 'saude';
    public const TIPO_ELOGIO = 'elogio';

    public const GRAVIDADE_BAIXA = 'baixa';
    public const GRAVIDADE_MEDIA = 'media';
    public const GRAVIDADE_ALTA = 'alta';
    public const GRAVIDADE_GRAVISSIMA = 'gravissima';

    public const STATUS_ABERTA = 'aberta';
    public const STATUS_EM_ANALISE = 'em_analise';
    public const STATUS_CONCLUIDA = 'concluida';
    public const STATUS_CIENTIFICADA = 'cientificada';

    protected $table = 'educa_student_incidents';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'enrollment_id',
        'aluno_pessoa_id',
        'autor_user_id',
        'numero_sequencial',
        'tipo',
        'gravidade',
        'relato',
        'data_ocorrencia',
        'status',
        'data_ciencia',
        'responsavel_ciencia_id',
    ];

    protected $casts = [
        'aluno_pessoa_id' => 'integer',
        'autor_user_id' => 'integer',
        'responsavel_ciencia_id' => 'integer',
        'data_ocorrencia' => 'date:Y-m-d',
        'data_ciencia' => 'datetime',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    public function alunoPessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'aluno_pessoa_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_user_id');
    }

    public function responsavelCiencia(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'responsavel_ciencia_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(EducaIncidentAction::class, 'incident_id')->orderBy('data_acao');
    }
}
