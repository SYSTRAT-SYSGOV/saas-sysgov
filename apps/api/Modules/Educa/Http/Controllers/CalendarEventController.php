<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\CalendarDaySyncClassesRequest;
use Modules\Educa\Http\Requests\CalendarEventCreateRequest;
use Modules\Educa\Http\Requests\CalendarEventUpdateRequest;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaCalendarEvent;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Services\CalendarEventService;

final class CalendarEventController extends Controller
{
    public function __construct(
        private readonly CalendarEventService $eventService,
    ) {}

    public function index(string $calendarioId, Request $request): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('view', $calendario);

        $eventos = $this->eventService->listarEventos($calendario, [
            'mes' => $request->filled('mes') ? (int) $request->input('mes') : null,
            'data' => $request->input('data'),
        ]);

        return response()->json([
            'data' => $eventos,
        ]);
    }

    public function store(string $calendarioId, CalendarEventCreateRequest $request): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('update', $calendario);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        $evento = $this->eventService->criarEvento($calendario, $dados);

        return response()->json([
            'data' => $evento,
        ], 201);
    }

    public function show(string $calendarioId, string $eventoId): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('view', $calendario);

        $evento = EducaCalendarEvent::where('calendario_id', $calendarioId)->findOrFail($eventoId);

        return response()->json([
            'data' => $evento,
        ]);
    }

    public function update(string $calendarioId, string $eventoId, CalendarEventUpdateRequest $request): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('update', $calendario);

        $evento = EducaCalendarEvent::where('calendario_id', $calendarioId)->findOrFail($eventoId);
        $atualizado = $this->eventService->atualizarEvento($evento, $request->validated());

        return response()->json([
            'data' => $atualizado,
        ]);
    }

    public function destroy(string $calendarioId, string $eventoId): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('update', $calendario);

        $evento = EducaCalendarEvent::where('calendario_id', $calendarioId)->findOrFail($eventoId);
        $this->eventService->excluirEvento($evento);

        return response()->json(null, 204);
    }

    public function turmasDoDia(string $calendarioId, string $diaId): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('view', $calendario);

        $dia = EducaCalendarDay::where('calendario_id', $calendarioId)->findOrFail($diaId);
        $turmaIds = $this->eventService->listarTurmasDoDia($dia);

        return response()->json([
            'calendar_day_id' => $dia->id,
            'turma_ids' => $turmaIds,
        ]);
    }

    public function sincronizarTurmasDoDia(string $calendarioId, string $diaId, CalendarDaySyncClassesRequest $request): JsonResponse
    {
        $calendario = EducaAcademicCalendar::findOrFail($calendarioId);
        $this->authorize('update', $calendario);

        $dia = EducaCalendarDay::where('calendario_id', $calendarioId)->findOrFail($diaId);
        $turmaIds = $this->eventService->sincronizarTurmasDoDia($dia, $request->validated('turma_ids'));

        return response()->json([
            'calendar_day_id' => $dia->id,
            'turma_ids' => $turmaIds,
        ]);
    }

    public function calendarioTurma(string $turmaId, Request $request): JsonResponse
    {
        $turma = EducaSchoolClass::findOrFail($turmaId);
        $this->authorize('view', $turma);

        $mes = $request->filled('mes') ? (int) $request->input('mes') : null;
        $dados = $this->eventService->obterCalendarioTurma($turma, $mes);

        return response()->json($dados);
    }
}
