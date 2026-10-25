<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaTimetable;
use Modules\Educa\Models\EducaTimetableLesson;
use Modules\Educa\Models\EducaTimetableSlot;

/**
 * Serviço de Gestão e Montagem da Grade e Quadro de Horários.
 */
final class TimetableService
{
    public function __construct(
        private readonly TimetableCollisionService $collisionService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Retorna o quadro de horários ativo da turma com slots e aulas.
     */
    public function obterQuadroTurma(string $turmaId, int $tenantId): ?EducaTimetable
    {
        return EducaTimetable::query()
            ->where('tenant_id', $tenantId)
            ->where('school_class_id', $turmaId)
            ->where('ativo', true)
            ->with([
                'slots' => function ($q): void {
                    $q->orderBy('numero_tempo')
                      ->with(['lessons.curriculumComponent', 'lessons.teacher.pessoa', 'lessons.substitute.pessoa']);
                },
            ])
            ->first();
    }

    /**
     * Cria ou atualiza o quadro de horários da turma.
     *
     * @param array<string, mixed> $dados
     */
    public function salvarQuadro(string $turmaId, array $dados, int $tenantId): EducaTimetable
    {
        /** @var EducaSchoolClass $turma */
        $turma = EducaSchoolClass::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $turmaId)
            ->firstOrFail();

        return DB::transaction(function () use ($turma, $dados, $tenantId): EducaTimetable {
            // Desativa outros quadros anteriores se este for ativo
            EducaTimetable::query()
                ->where('tenant_id', $tenantId)
                ->where('school_class_id', $turma->id)
                ->update(['ativo' => false]);

            /** @var EducaTimetable $quadro */
            $quadro = EducaTimetable::query()->create([
                'tenant_id' => $tenantId,
                'school_class_id' => $turma->id,
                'academic_year_id' => $turma->academic_year_id,
                'nome' => $dados['nome'],
                'turno' => $dados['turno'],
                'ativo' => true,
                'data_inicio_vigencia' => $dados['data_inicio_vigencia'],
                'data_fim_vigencia' => $dados['data_fim_vigencia'] ?? null,
            ]);

            $this->audit->record('educa', 'timetable.created', 'educa_timetables:' . $quadro->id, null, [
                'turma_id' => $turma->id,
                'nome' => $quadro->nome,
                'turno' => $quadro->turno,
            ]);

            return $quadro;
        });
    }

    /**
     * Sincroniza a matriz de tempos (slots) do quadro de horários.
     *
     * @param array<int, array<string, mixed>> $slotsData
     * @return Collection<int, EducaTimetableSlot>
     */
    public function sincronizarSlots(string $turmaId, array $slotsData, int $tenantId): Collection
    {
        /** @var EducaTimetable $quadro */
        $quadro = EducaTimetable::query()
            ->where('tenant_id', $tenantId)
            ->where('school_class_id', $turmaId)
            ->where('ativo', true)
            ->firstOrFail();

        // Valida ordenação temporal e sobreposição interna entre os tempos
        usort($slotsData, fn ($a, $b) => $a['numero_tempo'] <=> $b['numero_tempo']);

        for ($i = 0; $i < count($slotsData) - 1; $i++) {
            $atualFim = $slotsData[$i]['hora_fim'];
            $proximoInicio = $slotsData[$i + 1]['hora_inicio'];

            if ($atualFim > $proximoInicio) {
                $erro = ValidationException::withMessages([
                    'slots' => [
                        "Sobreposição de horários detectada entre o tempo {$slotsData[$i]['numero_tempo']} " .
                        "({$slotsData[$i]['hora_inicio']} - {$atualFim}) e o tempo {$slotsData[$i + 1]['numero_tempo']} " .
                        "({$proximoInicio} - {$slotsData[$i + 1]['hora_fim']}).",
                    ],
                ]);
                $erro->status = 422;
                throw $erro;
            }
        }

        return DB::transaction(function () use ($quadro, $slotsData, $tenantId): Collection {
            // Remove slots anteriores sem aulas vinculadas ou recria matriz
            $slotsExistentes = EducaTimetableSlot::query()
                ->where('tenant_id', $tenantId)
                ->where('timetable_id', $quadro->id)
                ->get()
                ->keyBy('numero_tempo');

            $slotsSalvos = new Collection();

            foreach ($slotsData as $s) {
                $numeroTempo = (int) $s['numero_tempo'];
                $horaInicio = strlen((string) $s['hora_inicio']) === 5 ? "{$s['hora_inicio']}:00" : (string) $s['hora_inicio'];
                $horaFim = strlen((string) $s['hora_fim']) === 5 ? "{$s['hora_fim']}:00" : (string) $s['hora_fim'];

                /** @var EducaTimetableSlot|null $existente */
                $existente = $slotsExistentes->get($numeroTempo);

                if ($existente !== null) {
                    $existente->update([
                        'hora_inicio' => $horaInicio,
                        'hora_fim' => $horaFim,
                        'tipo' => $s['tipo'] ?? 'aula',
                        'descricao' => $s['descricao'] ?? null,
                    ]);
                    $slotsSalvos->push($existente);
                } else {
                    $novo = EducaTimetableSlot::query()->create([
                        'tenant_id' => $tenantId,
                        'timetable_id' => $quadro->id,
                        'numero_tempo' => $numeroTempo,
                        'hora_inicio' => $horaInicio,
                        'hora_fim' => $horaFim,
                        'tipo' => $s['tipo'] ?? 'aula',
                        'descricao' => $s['descricao'] ?? null,
                    ]);
                    $slotsSalvos->push($novo);
                }
            }

            return $slotsSalvos;
        });
    }

    /**
     * Aloca uma aula em um slot com validação anti-choque.
     *
     * @param array<string, mixed> $dados
     */
    public function alocarAula(string $turmaId, array $dados, int $tenantId): EducaTimetableLesson
    {
        /** @var EducaSchoolClass $turma */
        $turma = EducaSchoolClass::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $turmaId)
            ->firstOrFail();

        /** @var EducaTimetableSlot $slot */
        $slot = EducaTimetableSlot::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $dados['timetable_slot_id'])
            ->firstOrFail();

        // 1. Valida se o componente curricular pertence à matriz da turma
        $matrizValida = DB::table('educa_matrix_components')
            ->where('tenant_id', $tenantId)
            ->where('matrix_id', $turma->matrix_id)
            ->where('component_id', $dados['curriculum_component_id'])
            ->exists();

        if (!$matrizValida) {
            $erro = ValidationException::withMessages([
                'curriculum_component_id' => ['O componente curricular selecionado não faz parte da matriz curricular da turma.'],
            ]);
            $erro->status = 422;
            throw $erro;
        }

        $diaSemana = (int) $dados['dia_semana'];
        $docenteId = (string) $dados['teacher_employee_id'];

        return DB::transaction(function () use ($slot, $diaSemana, $docenteId, $dados, $tenantId): EducaTimetableLesson {
            // 2. Executa a trava anti-choque para o professor titular
            $this->collisionService->verificarChoqueDocente(
                $docenteId,
                $diaSemana,
                (string) $slot->hora_inicio,
                (string) $slot->hora_fim,
                $tenantId
            );

            // 3. Se houver substituto, valida também contra choque
            if (!empty($dados['substitute_employee_id'])) {
                $this->collisionService->verificarChoqueDocente(
                    (string) $dados['substitute_employee_id'],
                    $diaSemana,
                    (string) $slot->hora_inicio,
                    (string) $slot->hora_fim,
                    $tenantId
                );
            }

            // Remove alocação anterior do mesmo slot e dia da semana se houver
            EducaTimetableLesson::query()
                ->where('tenant_id', $tenantId)
                ->where('timetable_slot_id', $slot->id)
                ->where('dia_semana', $diaSemana)
                ->delete();

            /** @var EducaTimetableLesson $aula */
            $aula = EducaTimetableLesson::query()->create([
                'tenant_id' => $tenantId,
                'timetable_slot_id' => $slot->id,
                'dia_semana' => $diaSemana,
                'curriculum_component_id' => $dados['curriculum_component_id'],
                'teacher_employee_id' => $docenteId,
                'substitute_employee_id' => $dados['substitute_employee_id'] ?? null,
                'substituicao_inicio' => $dados['substituicao_inicio'] ?? null,
                'substituicao_fim' => $dados['substituicao_fim'] ?? null,
                'substituicao_motivo' => $dados['substituicao_motivo'] ?? null,
            ]);

            $this->audit->record('educa', 'timetable.lesson_allocated', 'educa_timetable_lessons:' . $aula->id, null, [
                'slot_id' => $slot->id,
                'dia_semana' => $diaSemana,
                'component_id' => $dados['curriculum_component_id'],
                'teacher_id' => $docenteId,
            ]);

            return $aula;
        });
    }

    /**
     * Remove uma aula alocada.
     */
    public function removerAula(string $aulaId, int $tenantId): void
    {
        /** @var EducaTimetableLesson $aula */
        $aula = EducaTimetableLesson::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $aulaId)
            ->firstOrFail();

        $aula->delete();
    }

    /**
     * Registra professor substituto com vigência para a aula.
     *
     * @param array<string, mixed> $dados
     */
    public function registrarSubstituto(string $aulaId, array $dados, int $tenantId): EducaTimetableLesson
    {
        /** @var EducaTimetableLesson $aula */
        $aula = EducaTimetableLesson::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $aulaId)
            ->firstOrFail();

        $substitutoId = (string) $dados['substitute_employee_id'];
        $slot = $aula->slot;

        // Valida contra choque para o professor substituto
        $this->collisionService->verificarChoqueDocente(
            $substitutoId,
            $aula->dia_semana,
            (string) $slot->hora_inicio,
            (string) $slot->hora_fim,
            $tenantId,
            $aula->id
        );

        $aula->update([
            'substitute_employee_id' => $substitutoId,
            'substituicao_inicio' => $dados['substituicao_inicio'],
            'substituicao_fim' => $dados['substituicao_fim'],
            'substituicao_motivo' => $dados['substituicao_motivo'] ?? null,
        ]);

        return $aula;
    }

    /**
     * Retorna a grade semanal de aulas do professor em toda a rede (todas as turmas e escolas).
     *
     * @return array<int, array<string, mixed>>
     */
    public function obterGradeSemanalDocente(string $servidorId, int $tenantId): array
    {
        $aulas = EducaTimetableLesson::query()
            ->select('educa_timetable_lessons.*')
            ->join('educa_timetable_slots', 'educa_timetable_slots.id', '=', 'educa_timetable_lessons.timetable_slot_id')
            ->join('educa_timetables', 'educa_timetables.id', '=', 'educa_timetable_slots.timetable_id')
            ->join('educa_school_classes', 'educa_school_classes.id', '=', 'educa_timetables.school_class_id')
            ->join('educa_schools', 'educa_schools.id', '=', 'educa_school_classes.school_id')
            ->join('educa_curriculum_components', 'educa_curriculum_components.id', '=', 'educa_timetable_lessons.curriculum_component_id')
            ->where('educa_timetables.tenant_id', $tenantId)
            ->where('educa_timetables.ativo', true)
            ->where(function ($q) use ($servidorId): void {
                $q->where('educa_timetable_lessons.teacher_employee_id', $servidorId)
                  ->orWhere('educa_timetable_lessons.substitute_employee_id', $servidorId);
            })
            ->with(['slot.timetable.schoolClass.school', 'curriculumComponent'])
            ->get();

        return $aulas->map(function (EducaTimetableLesson $aula) use ($servidorId): array {
            $slot = $aula->slot;
            $turma = $slot->timetable->schoolClass;
            $escola = $turma->school;

            return [
                'aula_id' => $aula->id,
                'escola_nome' => $escola->nome,
                'turma_nome' => $turma->nome,
                'componente_nome' => $aula->curriculumComponent->nome,
                'dia_semana' => $aula->dia_semana,
                'numero_tempo' => $slot->numero_tempo,
                'hora_inicio' => (string) $slot->hora_inicio,
                'hora_fim' => (string) $slot->hora_fim,
                'papel' => $aula->teacher_employee_id === $servidorId ? 'titular' : 'substituto',
            ];
        })->toArray();
    }
}
