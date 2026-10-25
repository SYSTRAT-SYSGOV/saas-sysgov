<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\CalendarDaysSaveRequest;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Services\CalendarService;
use Modules\Educa\Services\LdbComplianceService;

final class CalendarDayController extends Controller
{
    public function __construct(
        private readonly CalendarService $calendarService,
        private readonly LdbComplianceService $ldbService,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request, string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('view', $calendar);

        $query = EducaCalendarDay::query()
            ->where('calendario_id', $calendar->id)
            ->with('motivo');

        if ($request->filled('de')) {
            $query->where('data', '>=', $request->input('de'));
        }

        if ($request->filled('ate')) {
            $query->where('data', '<=', $request->input('ate'));
        }

        if ($request->boolean('apenas_letivos')) {
            $query->where('is_school_day', true);
        }

        $dias = $query->orderBy('data')->get();

        return response()->json(['data' => $dias]);
    }

    public function save(CalendarDaysSaveRequest $request, string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('manage', $calendar);

        if ($calendar->isLocked()) {
            return response()->json([
                'message' => 'O calendário escolar está bloqueado para edições.',
                'code' => 'CALENDAR_LOCKED',
            ], 409);
        }

        $diasInput = $request->input('dias');

        try {
            $this->calendarService->salvarDias($calendar, $diasInput);

            $calendarFresh = $calendar->fresh();
            $diasAtualizados = EducaCalendarDay::query()
                ->where('calendario_id', $calendar->id)
                ->with('motivo')
                ->orderBy('data')
                ->get();

            $ldbCheck = $this->ldbService->verificarConformidade($calendarFresh);

            $this->audit->record(
                module: 'educa',
                action: 'save_days',
                resource: "calendario:{$calendar->id}:dias",
                before: null,
                after: [
                    'total_dias_salvos' => count($diasInput),
                    'total_school_days' => $calendarFresh->total_school_days,
                    'total_school_hours' => $calendarFresh->total_school_hours,
                ]
            );

            return response()->json([
                'data' => $diasAtualizados,
                'totais' => [
                    'total_school_days' => $calendarFresh->total_school_days,
                    'total_school_hours' => (float) $calendarFresh->total_school_hours,
                    'atende_ldb' => (bool) $ldbCheck['atende_ldb'],
                ],
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CALENDAR_LOCKED',
            ], 409);
        }
    }
}
