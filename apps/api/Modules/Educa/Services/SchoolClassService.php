<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use LogicException;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaSchoolGrade;

/**
 * Serviço de Negócio para Turmas Escolares, Controle de Vagas e Trava Anti-Ociosidade.
 */
final class SchoolClassService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     academic_year_id?: string|null,
     *     turno?: string|null
     * } $filtros
     * @return Collection<int, EducaSchoolClass>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaSchoolClass::query()->with(['escola', 'curso', 'serie', 'matriz']);

        if (!empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (!empty($filtros['academic_year_id'])) {
            $query->where('academic_year_id', $filtros['academic_year_id']);
        }

        if (!empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }

        return $query->orderBy('nome')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     school_id: string,
     *     academic_year_id: string,
     *     course_id: string,
     *     grade_id: string,
     *     matrix_id: string,
     *     codigo?: string|null,
     *     nome: string,
     *     sigla?: string|null,
     *     turno: string,
     *     sala?: string|null,
     *     lotacao_maxima: int,
     *     tipo_atendimento?: string,
     *     is_multiseriada?: bool
     * } $dados
     */
    public function criar(array $dados): EducaSchoolClass
    {
        // 1. Trava anti-ociosidade (Regra do legado i-Educar)
        $schoolGrade = EducaSchoolGrade::where('school_id', $dados['school_id'])
            ->where('grade_id', $dados['grade_id'])
            ->first();

        if ($schoolGrade?->bloquear_abertura_turma_com_vagas) {
            $turmaComVagas = EducaSchoolClass::query()
                ->where('school_id', $dados['school_id'])
                ->where('academic_year_id', $dados['academic_year_id'])
                ->where('grade_id', $dados['grade_id'])
                ->where('turno', $dados['turno'])
                ->where('status', 'ativa')
                ->whereRaw('lotacao_efetiva < lotacao_maxima')
                ->first();

            if ($turmaComVagas !== null) {
                $vagas = $turmaComVagas->vagas_disponiveis;
                throw ValidationException::withMessages([
                    'turno' => ["A turma {$turmaComVagas->nome} ainda possui {$vagas} vagas em aberto para o turno {$dados['turno']}."],
                ]);
            }
        }

        // 2. Unicidade de nome de turma no mesmo ano/escola/série
        $conflito = EducaSchoolClass::query()
            ->where('school_id', $dados['school_id'])
            ->where('academic_year_id', $dados['academic_year_id'])
            ->where('course_id', $dados['course_id'])
            ->where('grade_id', $dados['grade_id'])
            ->where('nome', $dados['nome'])
            ->exists();

        if ($conflito) {
            throw new LogicException("Já existe uma turma cadastrada com o nome '{$dados['nome']}' para esta série e ano letivo.");
        }

        if (empty($dados['codigo'])) {
            $dados['codigo'] = 'TRM-' . strtoupper(Str::random(6));
        }

        $dados['status'] = 'ativa';
        $dados['lotacao_efetiva'] = 0;

        return DB::transaction(function () use ($dados): EducaSchoolClass {
            $turma = EducaSchoolClass::create($dados);
            $this->audit->record('educa', 'school_class.created', "EducaSchoolClass #{$turma->id}", null, $turma->toArray());

            return $turma;
        });
    }

    /**
     * @param array{
     *     nome?: string,
     *     sigla?: string|null,
     *     sala?: string|null,
     *     lotacao_maxima?: int,
     *     status?: string
     * } $dados
     */
    public function atualizar(EducaSchoolClass $turma, array $dados): EducaSchoolClass
    {
        if (isset($dados['lotacao_maxima']) && $dados['lotacao_maxima'] < $turma->lotacao_efetiva) {
            throw new LogicException("A lotação máxima não pode ser inferior aos alunos já matriculados ({$turma->lotacao_efetiva}).");
        }

        $old = $turma->toArray();
        $turma->update($dados);

        $this->audit->record('educa', 'school_class.updated', "EducaSchoolClass #{$turma->id}", $old, $turma->fresh()->toArray());

        return $turma->fresh();
    }

    /**
     * Remove a turma com soft-delete se não possuir alunos enturmados.
     */
    public function remover(EducaSchoolClass $turma): void
    {
        if ($turma->lotacao_efetiva > 0) {
            throw new LogicException("Não é possível remover a turma '{$turma->nome}' pois ela possui {$turma->lotacao_efetiva} aluno(s) enturmado(s).");
        }

        $turma->delete();
        $this->audit->record('educa', 'school_class.deleted', "EducaSchoolClass #{$turma->id}", $turma->toArray(), null);
    }
}
