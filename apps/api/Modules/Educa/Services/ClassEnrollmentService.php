<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use LogicException;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaSchoolGrade;
use Modules\Educa\Models\EducaTransfer;

/**
 * Serviço de Negócio para Alocação em Turmas (Enturmação e Remanejamento).
 */
final class ClassEnrollmentService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Aloca o estudante em uma turma com lock pessimista de vagas e validação de choque de horários.
     */
    public function enturmar(EducaEnrollment $matricula, string $schoolClassId, string $dataEntrada): EducaClassEnrollment
    {
        if ($matricula->status !== EducaEnrollment::STATUS_ATIVA) {
            throw new LogicException("Apenas matrículas com status 'ativa' podem ser enturmadas.");
        }

        return DB::transaction(function () use ($matricula, $schoolClassId, $dataEntrada): EducaClassEnrollment {
            // Lock pessimista para evitar concorrência na reserva de vagas
            $turma = EducaSchoolClass::query()
                ->where('id', $schoolClassId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($turma->grade_id !== $matricula->grade_id) {
                throw ValidationException::withMessages([
                    'school_class_id' => ['A turma selecionada pertence a uma série diferente da matrícula.'],
                ]);
            }

            // 1. Verificação de Vagas
            $schoolGrade = EducaSchoolGrade::query()
                ->where('school_id', $turma->school_id)
                ->where('grade_id', $turma->grade_id)
                ->first();

            $bloquearSemVagas = $schoolGrade?->bloquear_enturmacao_sem_vaga ?? true;
            if ($bloquearSemVagas && $turma->lotacao_efetiva >= $turma->lotacao_maxima) {
                throw ValidationException::withMessages([
                    'school_class_id' => ["A turma {$turma->nome} não possui vagas disponíveis (capacidade máxima: {$turma->lotacao_maxima})."],
                ]);
            }

            // 2. Prevenção de Choque de Horários (Regra do legado i-Educar)
            // Estudante não pode ter 2 enturmações regulares ativas no mesmo turno e ano letivo
            if ($turma->tipo_atendimento === 'regular') {
                $choqueHorario = EducaClassEnrollment::query()
                    ->where('status', EducaClassEnrollment::STATUS_ATIVA)
                    ->whereHas('matricula', function ($mq) use ($matricula): void {
                        $mq->where('aluno_pessoa_id', $matricula->aluno_pessoa_id)
                            ->where('academic_year_id', $matricula->academic_year_id);
                    })
                    ->whereHas('turma', function ($tq) use ($turma): void {
                        $tq->where('turno', $turma->turno)
                            ->where('tipo_atendimento', 'regular');
                    })
                    ->exists();

                if ($choqueHorario) {
                    throw ValidationException::withMessages([
                        'school_class_id' => ["O estudante já possui enturmação ativa no turno {$turma->turno} para escolarização regular."],
                    ]);
                }
            }

            // 3. Sequencial de Chamada
            $maxOrdem = EducaClassEnrollment::query()
                ->where('school_class_id', $turma->id)
                ->where('status', EducaClassEnrollment::STATUS_ATIVA)
                ->max('numero_ordem');

            $proximaOrdem = ($maxOrdem !== null) ? ((int) $maxOrdem + 1) : 1;

            // 4. Criação da Enturmação e incremento de lotação
            $enturmacao = EducaClassEnrollment::create([
                'tenant_id' => $matricula->tenant_id,
                'enrollment_id' => $matricula->id,
                'school_class_id' => $turma->id,
                'numero_ordem' => $proximaOrdem,
                'data_entrada' => $dataEntrada,
                'status' => EducaClassEnrollment::STATUS_ATIVA,
            ]);

            $turma->increment('lotacao_efetiva');

            $this->audit->record('educa', 'class_enrollment.created', "EducaClassEnrollment #{$enturmacao->id}", null, $enturmacao->toArray());

            return $enturmacao;
        });
    }

    /**
     * Encerra uma enturmação ativa e libera a vaga na turma.
     */
    public function desenturmar(EducaClassEnrollment $enturmacao, string $dataSaida): void
    {
        DB::transaction(function () use ($enturmacao, $dataSaida): void {
            $turma = EducaSchoolClass::query()
                ->where('id', $enturmacao->school_class_id)
                ->lockForUpdate()
                ->first();

            $enturmacao->update([
                'status' => EducaClassEnrollment::STATUS_ENCERRADA,
                'data_saida' => $dataSaida,
            ]);

            if ($turma !== null && $turma->lotacao_efetiva > 0) {
                $turma->decrement('lotacao_efetiva');
            }

            $this->audit->record('educa', 'class_enrollment.closed', "EducaClassEnrollment #{$enturmacao->id}", null, [
                'data_saida' => $dataSaida,
            ]);
        });
    }

    /**
     * Remaneja o estudante para outra turma da mesma série com liberação atômica da vaga anterior.
     */
    public function remanejar(EducaEnrollment $matricula, string $turmaDestinoId, string $dataRemanejamento, ?string $motivo = null): EducaClassEnrollment
    {
        return DB::transaction(function () use ($matricula, $turmaDestinoId, $dataRemanejamento, $motivo): EducaClassEnrollment {
            $enturmacaoAtual = $matricula->enturmacaoAtiva;
            $turmaOrigemId = $enturmacaoAtual?->school_class_id;

            if ($enturmacaoAtual !== null) {
                $this->desenturmar($enturmacaoAtual, $dataRemanejamento);
            }

            $novaEnturmacao = $this->enturmar($matricula, $turmaDestinoId, $dataRemanejamento);

            // Registro formal do remanejamento
            EducaTransfer::create([
                'tenant_id' => $matricula->tenant_id,
                'enrollment_id' => $matricula->id,
                'tipo' => EducaTransfer::TIPO_INTERNA,
                'turma_origem_id' => $turmaOrigemId,
                'turma_destino_id' => $turmaDestinoId,
                'data_transferencia' => $dataRemanejamento,
                'motivo' => $motivo ?? 'Remanejamento interno de turma',
            ]);

            $this->audit->record('educa', 'enrollment.reassigned', "EducaEnrollment #{$matricula->id}", null, [
                'turma_origem_id' => $turmaOrigemId,
                'turma_destino_id' => $turmaDestinoId,
            ]);

            return $novaEnturmacao;
        });
    }
}
