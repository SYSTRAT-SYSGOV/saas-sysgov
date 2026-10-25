<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaAttendanceRecord;
use Modules\Educa\Models\EducaClassDiary;
use Modules\Educa\Models\EducaClassEnrollment;

/**
 * Serviço de Negócio para Frequência Escolar e Abono de Faltas.
 */
final class AttendanceService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Salva ou atualiza a chamada dos alunos para uma aula registrada no diário.
     *
     * @param array<int, array{class_enrollment_id: string, status: string, justificativa?: string|null}> $registros
     */
    public function salvarFrequencia(string $classDiaryId, array $registros): int
    {
        $diario = EducaClassDiary::query()->where('id', $classDiaryId)->firstOrFail();

        return DB::transaction(function () use ($diario, $registros): int {
            $computados = 0;

            foreach ($registros as $item) {
                $enturmacaoId = $item['class_enrollment_id'];
                $status = $item['status'];
                $justificativa = $item['justificativa'] ?? null;

                // Valida se o aluno pertence à turma do diário
                $enturmacao = EducaClassEnrollment::query()
                    ->where('id', $enturmacaoId)
                    ->where('school_class_id', $diario->school_class_id)
                    ->first();

                if ($enturmacao === null) {
                    throw ValidationException::withMessages([
                        'class_enrollment_id' => ["O estudante da enturmação {$enturmacaoId} não pertence à turma desta aula."],
                    ]);
                }

                EducaAttendanceRecord::updateOrCreate(
                    [
                        'tenant_id' => $diario->tenant_id,
                        'class_diary_id' => $diario->id,
                        'class_enrollment_id' => $enturmacaoId,
                    ],
                    [
                        'status' => $status,
                        'justificativa' => $justificativa,
                    ]
                );

                $computados++;
            }

            $this->audit->record(
                'educa',
                'attendance.saved',
                "EducaClassDiary #{$diario->id}",
                null,
                ['diario_id' => $diario->id, 'total_alunos' => $computados]
            );

            return $computados;
        });
    }

    /**
     * Realiza o abono legal de falta para um registro de frequência com justificativa.
     */
    public function abonarFalta(string $attendanceRecordId, string $justificativa): EducaAttendanceRecord
    {
        /** @var EducaAttendanceRecord $registro */
        $registro = EducaAttendanceRecord::query()->where('id', $attendanceRecordId)->firstOrFail();

        $dadosAntigos = $registro->toArray();

        $registro->update([
            'status' => EducaAttendanceRecord::STATUS_FALTA_JUSTIFICADA,
            'justificativa' => $justificativa,
        ]);

        $this->audit->record(
            'educa',
            'attendance.excused',
            "EducaAttendanceRecord #{$registro->id}",
            $dadosAntigos,
            $registro->toArray()
        );

        return $registro;
    }

    /**
     * Lista presenças apuradas de uma determinada aula.
     *
     * @return Collection<int, EducaAttendanceRecord>
     */
    public function listarPorDiario(string $classDiaryId): Collection
    {
        return EducaAttendanceRecord::query()
            ->with(['enturmacao.matricula.aluno'])
            ->where('class_diary_id', $classDiaryId)
            ->get();
    }

    /**
     * Calcula o percentual de frequência de um estudante em uma turma / componente.
     */
    public function calcularPercentualFrequencia(string $classEnrollmentId): float
    {
        $enturmacao = EducaClassEnrollment::query()->where('id', $classEnrollmentId)->firstOrFail();

        // Total de aulas ministradas na turma
        $totalAulas = (int) EducaClassDiary::query()
            ->where('school_class_id', $enturmacao->school_class_id)
            ->sum('quantidade_aulas');

        if ($totalAulas === 0) {
            return 100.0;
        }

        // Faltas não justificadas
        $faltas = (int) EducaAttendanceRecord::query()
            ->join('educa_class_diaries', 'educa_class_diaries.id', '=', 'educa_attendance_records.class_diary_id')
            ->where('educa_attendance_records.class_enrollment_id', $classEnrollmentId)
            ->where('educa_attendance_records.status', EducaAttendanceRecord::STATUS_FALTA)
            ->sum('educa_class_diaries.quantidade_aulas');

        $presencas = max(0, $totalAulas - $faltas);

        return round(($presencas / $totalAulas) * 100, 2);
    }
}
