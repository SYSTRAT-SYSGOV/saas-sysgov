<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Modules\Educa\Http\Requests\TimetableCreateRequest;
use Modules\Educa\Http\Requests\TimetableLessonAllocateRequest;
use Modules\Educa\Http\Requests\TimetableSlotsSyncRequest;
use Modules\Educa\Http\Requests\TimetableSubstituteRequest;
use Modules\Educa\Models\EducaTimetable;
use Modules\Educa\Services\TimetableService;

final class TimetableController extends Controller
{
    public function __construct(
        private readonly TimetableService $service,
    ) {}

    private function getTenantId(Request $request): int
    {
        return (int) (app(TenantContext::class)->id() ?? $request->user()?->tenant_id ?? 0);
    }

    /**
     * Retorna o quadro de horários ativo da turma.
     */
    public function obterQuadro(Request $request, string $turmaId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $quadro = $this->service->obterQuadroTurma($turmaId, $tenantId);

        if ($quadro === null) {
            return response()->json(['data' => null], Response::HTTP_OK);
        }

        // Formata os dados no formato esperado pelo contrato
        $slots = $quadro->slots->map(function ($s): array {
            return [
                'id' => $s->id,
                'timetable_id' => $s->timetable_id,
                'numero_tempo' => $s->numero_tempo,
                'hora_inicio' => (string) $s->hora_inicio,
                'hora_fim' => (string) $s->hora_fim,
                'tipo' => $s->tipo,
                'descricao' => $s->descricao,
            ];
        })->values();

        $aulas = [];
        foreach ($quadro->slots as $s) {
            foreach ($s->lessons as $l) {
                $aulas[] = [
                    'id' => $l->id,
                    'timetable_slot_id' => $l->timetable_slot_id,
                    'dia_semana' => $l->dia_semana,
                    'curriculum_component_id' => $l->curriculum_component_id,
                    'componente_nome' => $l->curriculumComponent?->nome,
                    'teacher_employee_id' => $l->teacher_employee_id,
                    'professor_titular_nome' => $l->teacher?->pessoa?->nome,
                    'substitute_employee_id' => $l->substitute_employee_id,
                    'professor_substituto_nome' => $l->substitute?->pessoa?->nome,
                    'substituicao_inicio' => $l->substituicao_inicio ? $l->substituicao_inicio->format('Y-m-d') : null,
                    'substituicao_fim' => $l->substituicao_fim ? $l->substituicao_fim->format('Y-m-d') : null,
                    'substituicao_motivo' => $l->substituicao_motivo,
                ];
            }
        }

        return response()->json([
            'data' => [
                'id' => $quadro->id,
                'tenant_id' => $quadro->tenant_id,
                'school_class_id' => $quadro->school_class_id,
                'academic_year_id' => $quadro->academic_year_id,
                'nome' => $quadro->nome,
                'turno' => $quadro->turno,
                'ativo' => (bool) $quadro->ativo,
                'data_inicio_vigencia' => $quadro->data_inicio_vigencia ? $quadro->data_inicio_vigencia->format('Y-m-d') : null,
                'data_fim_vigencia' => $quadro->data_fim_vigencia ? $quadro->data_fim_vigencia->format('Y-m-d') : null,
                'slots' => $slots,
                'aulas' => $aulas,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Cria ou atualiza o quadro da turma.
     */
    public function salvarQuadro(TimetableCreateRequest $request, string $turmaId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $quadro = $this->service->salvarQuadro($turmaId, $request->validated(), $tenantId);

        return response()->json(['data' => $quadro], Response::HTTP_CREATED);
    }

    /**
     * Sincroniza a matriz de tempos do quadro.
     */
    public function sincronizarSlots(TimetableSlotsSyncRequest $request, string $turmaId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $slots = $this->service->sincronizarSlots($turmaId, $request->validated()['slots'], $tenantId);

        return response()->json(['data' => $slots], Response::HTTP_OK);
    }

    /**
     * Aloca uma aula em um slot com trava anti-choque.
     */
    public function alocarAula(TimetableLessonAllocateRequest $request, string $turmaId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $aula = $this->service->alocarAula($turmaId, $request->validated(), $tenantId);
        $aula->load(['curriculumComponent', 'teacher.pessoa', 'substitute.pessoa']);

        return response()->json([
            'data' => [
                'id' => $aula->id,
                'timetable_slot_id' => $aula->timetable_slot_id,
                'dia_semana' => $aula->dia_semana,
                'curriculum_component_id' => $aula->curriculum_component_id,
                'componente_nome' => $aula->curriculumComponent?->nome,
                'teacher_employee_id' => $aula->teacher_employee_id,
                'professor_titular_nome' => $aula->teacher?->pessoa?->nome,
                'substitute_employee_id' => $aula->substitute_employee_id,
                'professor_substituto_nome' => $aula->substitute?->pessoa?->nome,
                'substituicao_inicio' => $aula->substituicao_inicio ? $aula->substituicao_inicio->format('Y-m-d') : null,
                'substituicao_fim' => $aula->substituicao_fim ? $aula->substituicao_fim->format('Y-m-d') : null,
                'substituicao_motivo' => $aula->substituicao_motivo,
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * Remove uma aula alocada.
     */
    public function removerAula(Request $request, string $turmaId, string $aulaId): Response
    {
        $tenantId = $this->getTenantId($request);
        $this->service->removerAula($aulaId, $tenantId);

        return response()->noContent();
    }

    /**
     * Registra professor substituto com vigência formal.
     */
    public function registrarSubstituto(TimetableSubstituteRequest $request, string $turmaId, string $aulaId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $aula = $this->service->registrarSubstituto($aulaId, $request->validated(), $tenantId);
        $aula->load(['curriculumComponent', 'teacher.pessoa', 'substitute.pessoa']);

        return response()->json([
            'data' => [
                'id' => $aula->id,
                'timetable_slot_id' => $aula->timetable_slot_id,
                'dia_semana' => $aula->dia_semana,
                'curriculum_component_id' => $aula->curriculum_component_id,
                'componente_nome' => $aula->curriculumComponent?->nome,
                'teacher_employee_id' => $aula->teacher_employee_id,
                'professor_titular_nome' => $aula->teacher?->pessoa?->nome,
                'substitute_employee_id' => $aula->substitute_employee_id,
                'professor_substituto_nome' => $aula->substitute?->pessoa?->nome,
                'substituicao_inicio' => $aula->substituicao_inicio ? $aula->substituicao_inicio->format('Y-m-d') : null,
                'substituicao_fim' => $aula->substituicao_fim ? $aula->substituicao_fim->format('Y-m-d') : null,
                'substituicao_motivo' => $aula->substituicao_motivo,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Retorna a grade consolidada do professor em toda a rede.
     */
    public function gradeDocente(Request $request, string $servidorId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $grade = $this->service->obterGradeSemanalDocente($servidorId, $tenantId);

        return response()->json(['data' => $grade], Response::HTTP_OK);
    }
}
