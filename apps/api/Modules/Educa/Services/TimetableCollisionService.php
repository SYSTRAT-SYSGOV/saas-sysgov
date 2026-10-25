<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaTimetableLesson;
use Modules\Educa\Models\EducaTimetableSlot;

/**
 * Motor Matemático e Transacional de Prevenção Anti-Choque de Horários Docente.
 */
final class TimetableCollisionService
{
    /**
     * Verifica e bloqueia sobreposição de horários para o docente informado.
     *
     * @throws ValidationException Caso haja choque de horário
     */
    public function verificarChoqueDocente(
        string $employeeId,
        int $diaSemana,
        string $horaInicio,
        string $horaFim,
        int $tenantId,
        ?string $ignorarLessonId = null
    ): void {
        // Normaliza horários para formato H:i:s
        $inicio = strlen($horaInicio) === 5 ? "{$horaInicio}:00" : $horaInicio;
        $fim = strlen($horaFim) === 5 ? "{$horaFim}:00" : $horaFim;

        if ($inicio >= $fim) {
            $erro = ValidationException::withMessages([
                'hora_inicio' => ['O horário de início do tempo deve ser estritamente anterior ao horário de término.'],
            ]);
            $erro->status = 422;
            throw $erro;
        }

        /** @var EducaEmployee $docente */
        $docente = EducaEmployee::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $employeeId)
            ->firstOrFail();

        // Busca aulas conflitantes em qualquer turma ou escola do mesmo tenant
        $query = EducaTimetableLesson::query()
            ->select('educa_timetable_lessons.*')
            ->join('educa_timetable_slots', 'educa_timetable_slots.id', '=', 'educa_timetable_lessons.timetable_slot_id')
            ->join('educa_timetables', 'educa_timetables.id', '=', 'educa_timetable_slots.timetable_id')
            ->join('educa_school_classes', 'educa_school_classes.id', '=', 'educa_timetables.school_class_id')
            ->join('educa_schools', 'educa_schools.id', '=', 'educa_school_classes.school_id')
            ->where('educa_timetables.tenant_id', $tenantId)
            ->where('educa_timetables.ativo', true)
            ->where('educa_timetable_lessons.dia_semana', $diaSemana)
            ->where(function ($q) use ($employeeId): void {
                $q->where('educa_timetable_lessons.teacher_employee_id', $employeeId)
                  ->orWhere('educa_timetable_lessons.substitute_employee_id', $employeeId);
            })
            // Condição matemática de sobreposição de intervalos: A_inicio < B_fim AND A_fim > B_inicio
            ->where('educa_timetable_slots.hora_inicio', '<', $fim)
            ->where('educa_timetable_slots.hora_fim', '>', $inicio);

        if ($ignorarLessonId !== null) {
            $query->where('educa_timetable_lessons.id', '!=', $ignorarLessonId);
        }

        // Lock pessimista para garantir consistência em concorrência
        /** @var EducaTimetableLesson|null $conflito */
        $conflito = $query->lockForUpdate()->first();

        if ($conflito !== null) {
            /** @var EducaTimetableSlot $slotConflito */
            $slotConflito = $conflito->slot;
            $turmaConflito = $slotConflito->timetable?->schoolClass;
            $escolaConflito = $turmaConflito?->escola;
            $escolaNome = $escolaConflito?->nome ?? $escolaConflito?->sigla ?? 'Escola Municipal';
            $turmaNome = $turmaConflito?->nome ?? 'Turma';

            $dias = [
                1 => 'Domingo',
                2 => 'Segunda-feira',
                3 => 'Terça-feira',
                4 => 'Quarta-feira',
                5 => 'Quinta-feira',
                6 => 'Sexta-feira',
                7 => 'Sábado',
            ];
            $diaNome = $dias[$diaSemana] ?? "Dia {$diaSemana}";

            $erro = ValidationException::withMessages([
                'teacher_employee_id' => [
                    "Conflito de horários: o professor {$docente->pessoa->nome} já possui aula alocada na turma '{$turmaNome}' " .
                    "({$escolaNome}) na {$diaNome} das {$slotConflito->hora_inicio} às {$slotConflito->hora_fim}.",
                ],
            ]);
            $erro->status = 422;
            throw $erro;
        }
    }
}
