<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Matrícula Escolar Acadêmica do Estudante.
 */
final class EducaEnrollment extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_ATIVA = 'ativa';
    public const STATUS_REMANEJADA = 'remanejada';
    public const STATUS_TRANSFERIDA = 'transferida';
    public const STATUS_CANCELADA = 'cancelada';
    public const STATUS_CONCLUIDA = 'concluida';
    public const STATUS_ABANDONADA = 'abandonada';
    public const STATUS_FALECIDA = 'falecida';

    protected $table = 'educa_enrollments';

    protected $fillable = [
        'tenant_id',
        'aluno_pessoa_id',
        'school_id',
        'course_id',
        'grade_id',
        'academic_year_id',
        'codigo_matricula',
        'data_matricula',
        'tipo_matricula',
        'status',
        'data_cancelamento',
        'justificativa_cancelamento',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'aluno_pessoa_id' => 'integer',
        'data_matricula' => 'date:Y-m-d',
        'data_cancelamento' => 'date:Y-m-d',
    ];

    protected $appends = [
        'aluno_nome',
        'escola_nome',
        'turma_atual',
    ];

    public function getAlunoNomeAttribute(): string
    {
        return $this->aluno?->nome_social ?? $this->aluno?->nome ?? '';
    }

    public function getEscolaNomeAttribute(): string
    {
        return $this->escola?->nome ?? '';
    }

    /**
     * @return array{turma_id: string, turma_nome: string, numero_ordem: int|null}|null
     */
    public function getTurmaAtualAttribute(): ?array
    {
        $ativa = $this->enturmacaoAtiva;
        if ($ativa === null || $ativa->turma === null) {
            return null;
        }

        return [
            'turma_id' => $ativa->turma->id,
            'turma_nome' => $ativa->turma->nome,
            'numero_ordem' => $ativa->numero_ordem,
        ];
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'aluno_pessoa_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }

    /**
     * @return BelongsTo<EducaGrade, self>
     */
    public function serie(): BelongsTo
    {
        return $this->belongsTo(EducaGrade::class, 'grade_id');
    }

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function anoLetivo(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * @return HasMany<EducaClassEnrollment>
     */
    public function enturmacoes(): HasMany
    {
        return $this->hasMany(EducaClassEnrollment::class, 'enrollment_id');
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function alunoPessoa(): BelongsTo
    {
        return $this->aluno();
    }

    /**
     * @return HasOne<EducaStudentProfile>
     */
    public function studentProfile(): HasOne
    {
        return $this->hasOne(EducaStudentProfile::class, 'pessoa_id', 'aluno_pessoa_id');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<EducaSchoolClass>
     */
    public function turmas(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            EducaSchoolClass::class,
            'educa_class_enrollments',
            'enrollment_id',
            'school_class_id'
        )->wherePivot('status', 'ativa');
    }

    /**
     * @return HasOne<EducaClassEnrollment>
     */
    public function enturmacaoAtiva(): HasOne
    {
        return $this->hasOne(EducaClassEnrollment::class, 'enrollment_id')
            ->where('status', 'ativa')
            ->latestOfMany();
    }

    /**
     * @return HasOne<EducaAeeStudentProfile>
     */
    public function aeeProfile(): HasOne
    {
        return $this->hasOne(EducaAeeStudentProfile::class, 'enrollment_id');
    }

    /**
     * @return HasMany<EducaAeeEnrollment>
     */
    public function aeeEnrollments(): HasMany
    {
        return $this->hasMany(EducaAeeEnrollment::class, 'regular_enrollment_id');
    }

    /**
     * @return HasMany<EducaConselhoPreConselhoAluno>
     */
    public function preConselhoSinalizacoes(): HasMany
    {
        return $this->hasMany(EducaConselhoPreConselhoAluno::class, 'enrollment_id');
    }

    /**
     * @return HasMany<EducaConselhoDeliberacaoAluno>
     */
    public function deliberacoesConselho(): HasMany
    {
        return $this->hasMany(EducaConselhoDeliberacaoAluno::class, 'enrollment_id');
    }
}

