<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaClassDiary;
use Modules\Educa\Models\EducaSchoolClass;

/**
 * Serviço de Negócio para o Diário de Classe e Validação de Dias Letivos.
 */
final class ClassDiaryService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Registra uma aula ministrada no diário de classe com validação estrita de dia letivo.
     *
     * @param array<string, mixed> $dados
     */
    public function registrarAula(array $dados): EducaClassDiary
    {
        $turma = EducaSchoolClass::query()->where('id', $dados['school_class_id'])->firstOrFail();

        // 1. Validação de Dia Letivo Oficial no Calendário
        $this->validarDiaLetivo($turma, (string) $dados['data_aula']);

        /** @var EducaClassDiary $diario */
        $diario = EducaClassDiary::create([
            'tenant_id' => $turma->tenant_id,
            'school_class_id' => $turma->id,
            'curriculum_component_id' => $dados['curriculum_component_id'],
            'timetable_lesson_id' => $dados['timetable_lesson_id'] ?? null,
            'data_aula' => $dados['data_aula'],
            'quantidade_aulas' => $dados['quantidade_aulas'] ?? 1,
            'conteudo' => $dados['conteudo'],
            'habilidades_bncc' => $dados['habilidades_bncc'] ?? null,
            'status' => $dados['status'] ?? EducaClassDiary::STATUS_PUBLICADO,
        ]);

        $this->audit->record('educa', 'class_diary.created', "EducaClassDiary #{$diario->id}", null, $diario->toArray());

        return $diario;
    }

    /**
     * Retorna as aulas sugeridas do quadro de horários da turma para uma data específica.
     *
     * @return array<int, array<string, mixed>>
     */
    public function obterSugestoesAulasDoDia(string $turmaId, string $dataAula): array
    {
        $turma = EducaSchoolClass::query()->where('id', $turmaId)->firstOrFail();
        $timestamp = strtotime($dataAula);
        $diaSemana = (int) date('w', $timestamp) + 1;

        $quadro = \Modules\Educa\Models\EducaTimetable::query()
            ->where('tenant_id', $turma->tenant_id)
            ->where('school_class_id', $turma->id)
            ->where('ativo', true)
            ->first();

        if ($quadro === null) {
            return [];
        }

        $aulas = \Modules\Educa\Models\EducaTimetableLesson::query()
            ->select('educa_timetable_lessons.*')
            ->join('educa_timetable_slots', 'educa_timetable_slots.id', '=', 'educa_timetable_lessons.timetable_slot_id')
            ->where('educa_timetable_slots.timetable_id', $quadro->id)
            ->where('educa_timetable_lessons.dia_semana', $diaSemana)
            ->with(['curriculumComponent', 'teacher.pessoa', 'substitute.pessoa', 'slot'])
            ->orderBy('educa_timetable_slots.numero_tempo')
            ->get();

        return $aulas->map(function (\Modules\Educa\Models\EducaTimetableLesson $aula) use ($dataAula): array {
            $slot = $aula->slot;
            $emSubstituicao = false;

            if ($aula->substitute_employee_id !== null && $aula->substituicao_inicio !== null && $aula->substituicao_fim !== null) {
                $inicio = (string) $aula->substituicao_inicio;
                $fim = (string) $aula->substituicao_fim;
                $emSubstituicao = ($dataAula >= $inicio && $dataAula <= $fim);
            }

            $docenteEfetivo = $emSubstituicao && $aula->substitute
                ? $aula->substitute->pessoa->nome . ' (Substituto)'
                : ($aula->teacher?->pessoa?->nome ?? 'Titular');

            return [
                'timetable_lesson_id' => $aula->id,
                'numero_tempo' => $slot->numero_tempo,
                'hora_inicio' => (string) $slot->hora_inicio,
                'hora_fim' => (string) $slot->hora_fim,
                'curriculum_component_id' => $aula->curriculum_component_id,
                'componente_nome' => $aula->curriculumComponent->nome,
                'docente_nome' => $docenteEfetivo,
                'em_substituicao' => $emSubstituicao,
            ];
        })->toArray();
    }

    /**
     * Lista aulas registradas com filtros.
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, EducaClassDiary>
     */
    public function listar(array $filtros): Collection
    {
        $query = EducaClassDiary::with(['turma', 'componente'])->orderByDesc('data_aula');

        if (!empty($filtros['school_class_id'])) {
            $query->where('school_class_id', $filtros['school_class_id']);
        }
        if (!empty($filtros['curriculum_component_id'])) {
            $query->where('curriculum_component_id', $filtros['curriculum_component_id']);
        }
        if (!empty($filtros['data_inicio'])) {
            $query->where('data_aula', '>=', $filtros['data_inicio']);
        }
        if (!empty($filtros['data_fim'])) {
            $query->where('data_aula', '<=', $filtros['data_fim']);
        }

        return $query->get();
    }

    /**
     * Valida se a data corresponde a um dia letivo do calendário escolar ativo.
     */
    private function validarDiaLetivo(EducaSchoolClass $turma, string $dataAula): void
    {
        $ano = $turma->anoLetivo?->ano ?? (int) substr($dataAula, 0, 4);

        // Busca o calendário da escola ou o calendário geral da rede para o ano
        $calendario = EducaAcademicCalendar::query()
            ->where('tenant_id', $turma->tenant_id)
            ->where('ano', $ano)
            ->where(function ($q) use ($turma): void {
                $q->where('school_id', $turma->school_id)
                  ->orWhereNull('school_id'); // Calendário da rede
            })
            ->orderByRaw('school_id IS NOT NULL DESC')
            ->first();

        if ($calendario !== null) {
            $dia = EducaCalendarDay::query()
                ->where('calendario_id', $calendario->id)
                ->where('data', $dataAula)
                ->first();

            // Se o dia existir e estiver marcado como não letivo, bloqueia
            if ($dia !== null && !$dia->is_school_day) {
                throw ValidationException::withMessages([
                    'data_aula' => ["A data {$dataAula} não é um dia letivo oficial no calendário escolar."],
                ]);
            }
        }
    }
}
