<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaEnrollmentApplication;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaWaitlist;

/**
 * Convocação de Candidatos e Conversão de Pré-Matrículas Deferidas em Matrículas Escolares Ativas.
 */
final class ApplicationEnrollmentConverterService
{
    public function __construct(
        private readonly SchoolCapacityService $capacityService,
        private readonly WaitlistRankingService $rankingService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Convoca nominalmente o candidato no topo da fila e reserva vaga.
     */
    public function convocar(string $waitlistId, int $diasUteisSla = 5): EducaWaitlist
    {
        return DB::transaction(function () use ($waitlistId, $diasUteisSla): EducaWaitlist {
            $waitlist = EducaWaitlist::query()
                ->with(['application', 'school'])
                ->lockForUpdate()
                ->findOrFail($waitlistId);

            if ($waitlist->status !== 'aguardando') {
                throw new LogicException("Apenas candidatos com status 'aguardando' podem ser convocados.");
            }

            // Reserva a vaga na capacidade da escola
            $this->capacityService->reservarVaga(
                $waitlist->school_id,
                $waitlist->application->academic_year_id,
                $waitlist->etapa_ensino,
                $waitlist->turno
            );

            $agora = Carbon::now();
            $limite = (clone $agora)->addWeekdays($diasUteisSla);

            $anterior = $waitlist->toArray();

            $waitlist->update([
                'status' => 'convocado',
                'convocado_em' => $agora,
                'limite_comparecimento' => $limite,
            ]);

            $waitlist->application->update([
                'status' => 'convocado',
            ]);

            $this->audit->record(
                'educa',
                'convocar_candidato',
                "educa_waitlist:{$waitlist->id}",
                $anterior,
                $waitlist->toArray()
            );

            return $waitlist->fresh(['application', 'school']);
        });
    }

    public function convocarCandidato(string $waitlistId, int $diasUteisSla = 5, ?string $observacoes = null): EducaWaitlist
    {
        return $this->convocar($waitlistId, $diasUteisSla);
    }

    /**
     * Efetiva a matrícula do candidato convocado, convertendo para EducaEnrollment.
     *
     * @param array{
     *     course_id?: string|null,
     *     grade_id?: string|null,
     *     codigo_matricula?: string|null,
     *     data_matricula?: string|null,
     *     school_class_id?: string|null
     * } $dados
     */
    public function converterEmMatricula(string $waitlistId, array $dados = [], int $userId = 1): EducaEnrollment
    {
        return DB::transaction(function () use ($waitlistId, $dados, $userId): EducaEnrollment {
            $waitlist = EducaWaitlist::query()
                ->with(['application.candidato', 'school'])
                ->lockForUpdate()
                ->findOrFail($waitlistId);

            if ($waitlist->status !== 'convocado') {
                throw new LogicException("O candidato precisa estar no status 'convocado' para conversão em matrícula.");
            }

            $application = $waitlist->application;
            $ano = $application->academicYear;

            // Efetiva ocupação definitiva da vaga na capacidade
            $this->capacityService->efetivarOcupacaoVaga(
                $waitlist->school_id,
                $application->academic_year_id,
                $waitlist->etapa_ensino,
                $waitlist->turno
            );

            $capacidade = \Modules\Educa\Models\EducaSchoolCapacity::query()
                ->where('school_id', $waitlist->school_id)
                ->where('academic_year_id', $application->academic_year_id)
                ->where('etapa_ensino', $waitlist->etapa_ensino)
                ->where('turno', $waitlist->turno)
                ->first();

            $gradeId = $dados['grade_id'] ?? $capacidade?->grade_id;
            $courseId = $dados['course_id'] ?? $capacidade?->course_id;

            if (! $gradeId || ! $courseId) {
                $serie = EducaGrade::first();
                $gradeId = $gradeId ?: $serie?->id;
                $courseId = $courseId ?: $serie?->course_id;
            } else {
                $serie = EducaGrade::find($gradeId);
            }

            // Gera código da matrícula
            $codigoMatricula = $dados['codigo_matricula']
                ?? ("{$ano->ano}-" . strtoupper(substr($serie?->codigo ?? 'MAT', 0, 4)) . "-" . str_pad((string) mt_rand(1, 9999), 4, '0', STR_PAD_LEFT));

            // Cria o registro oficial de matrícula
            $enrollment = EducaEnrollment::create([
                'tenant_id' => $application->tenant_id,
                'aluno_pessoa_id' => $application->candidato_pessoa_id,
                'school_id' => $waitlist->school_id,
                'course_id' => $courseId,
                'grade_id' => $gradeId,
                'school_class_id' => $dados['school_class_id'] ?? null,
                'academic_year_id' => $ano->id,
                'codigo_matricula' => $codigoMatricula,
                'data_matricula' => $dados['data_matricula'] ?? Carbon::now()->toDateString(),
                'tipo_matricula' => 'inicial',
                'status' => EducaEnrollment::STATUS_ATIVA,
            ]);


            // Atualiza status da fila e da solicitação
            $waitlist->update([
                'status' => 'matriculado',
            ]);

            $application->update([
                'status' => 'matriculado',
            ]);

            // Reclassifica os demais da fila
            $this->rankingService->reclassificarFila($waitlist->school_id, $waitlist->etapa_ensino);

            $this->audit->record(
                'educa',
                'converter_matricula',
                "educa_enrollment:{$enrollment->id}",
                null,
                $enrollment->toArray()
            );

            return $enrollment;
        });
    }

    /**
     * Registra desistência ou expiração do prazo de comparecimento de candidato convocado.
     */
    public function registrarDesistencia(string $waitlistId, string $motivo): EducaWaitlist
    {
        return DB::transaction(function () use ($waitlistId, $motivo): EducaWaitlist {
            $waitlist = EducaWaitlist::query()
                ->with('application')
                ->lockForUpdate()
                ->findOrFail($waitlistId);

            if ($waitlist->status === 'convocado') {
                // Libera a vaga reservada
                $this->capacityService->liberarReservaVaga(
                    $waitlist->school_id,
                    $waitlist->application->academic_year_id,
                    $waitlist->etapa_ensino,
                    $waitlist->turno
                );
            }

            $waitlist->update([
                'status' => 'recusou_vaga',
            ]);

            $waitlist->application->update([
                'status' => 'desistente',
                'observacoes_analise' => trim(($waitlist->application->observacoes_analise ?? '') . " [Desistência: {$motivo}]"),
            ]);

            $this->rankingService->reclassificarFila($waitlist->school_id, $waitlist->etapa_ensino);

            return $waitlist->fresh();
        });
    }
}
