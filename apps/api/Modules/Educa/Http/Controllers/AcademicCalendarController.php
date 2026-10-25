<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Http\Requests\CalendarCreateRequest;
use Modules\Educa\Http\Requests\CalendarImportRequest;
use Modules\Educa\Http\Requests\CalendarUpdateRequest;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Services\CalendarService;
use Modules\Educa\Services\LdbComplianceService;

final class AcademicCalendarController extends Controller
{
    public function __construct(
        private readonly CalendarService $calendarService,
        private readonly LdbComplianceService $ldbService,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAcademicCalendar::class);

        $query = EducaAcademicCalendar::query();

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->input('ano'));
        }

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        if ($request->filled('escopo')) {
            $escopo = $request->input('escopo');
            if ($escopo === 'rede') {
                $query->whereNull('school_id');
            } elseif ($escopo === 'escola') {
                $query->whereNotNull('school_id');
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginated = $query->orderByDesc('ano')->orderBy('nome')->paginate($perPage);

        return response()->json($paginated);
    }

    public function store(CalendarCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaAcademicCalendar::class);

        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();

        $ano = (int) $validated['ano'];
        $schoolId = $validated['school_id'] ?? null;

        // Unicidade (tenant_id, ano, school_id)
        $existe = EducaAcademicCalendar::query()
            ->where('tenant_id', $tenantId)
            ->where('ano', $ano)
            ->where('school_id', $schoolId)
            ->exists();

        if ($existe) {
            return response()->json([
                'message' => 'Já existe um calendário cadastrado para este ano e unidade/rede.',
                'code' => 'DUPLICATE_CALENDAR',
            ], 409);
        }

        try {
            $calendar = $this->calendarService->criarCalendario([
                'tenant_id' => $tenantId,
                'school_id' => $schoolId,
                'ano' => $ano,
                'nome' => $validated['nome'],
                'carga_horaria_diaria_minutos' => (int) $validated['carga_horaria_diaria_minutos'],
            ]);

            return response()->json(['data' => $calendar], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'VALIDATION_FAILED',
            ], 422);
        }
    }

    public function show(string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('view', $calendar);

        return response()->json(['data' => $calendar]);
    }

    public function update(CalendarUpdateRequest $request, string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('manage', $calendar);

        if ($calendar->isLocked()) {
            return response()->json([
                'message' => 'O calendário escolar está bloqueado para edições.',
                'code' => 'CALENDAR_LOCKED',
            ], 409);
        }

        $validated = $request->validated();
        $forcarRepublicacao = (bool) ($validated['forcar_republicacao'] ?? false);

        if ($calendar->isPublished() && ! $forcarRepublicacao) {
            return response()->json([
                'message' => 'Calendário já publicado. Para editar, informe forcar_republicacao=true.',
                'code' => 'CALENDAR_ALREADY_PUBLISHED',
            ], 409);
        }

        $before = $calendar->toArray();
        $updateData = [];

        if (array_key_exists('nome', $validated)) {
            $updateData['nome'] = $validated['nome'];
        }

        if (array_key_exists('carga_horaria_diaria_minutos', $validated)) {
            $updateData['carga_horaria_diaria_minutos'] = (int) $validated['carga_horaria_diaria_minutos'];
        }

        if ($calendar->isPublished() && $forcarRepublicacao) {
            $updateData['status'] = EducaAcademicCalendar::STATUS_DRAFT;
            $updateData['published_at'] = null;
        }

        $calendar->update($updateData);

        if (isset($updateData['carga_horaria_diaria_minutos'])) {
            $this->calendarService->recalcularTotais($calendar);
        }

        $this->audit->record(
            module: 'educa',
            action: 'update',
            resource: "calendario:{$calendar->id}",
            before: $before,
            after: $calendar->fresh()->toArray()
        );

        return response()->json(['data' => $calendar->fresh()]);
    }

    public function destroy(string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('delete', $calendar);

        if (! $calendar->isDraft()) {
            return response()->json([
                'message' => 'Apenas calendários em rascunho podem ser removidos.',
                'code' => 'CALENDAR_NOT_DRAFT',
            ], 409);
        }

        $before = $calendar->toArray();
        $calendar->delete();

        $this->audit->record(
            module: 'educa',
            action: 'delete',
            resource: "calendario:{$calendar->id}",
            before: $before,
            after: null
        );

        return response()->json(null, 204);
    }

    public function publish(string $calendarioId): JsonResponse
    {
        $calendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('publish', $calendar);

        if ($calendar->isLocked()) {
            return response()->json([
                'message' => 'Calendário está bloqueado.',
                'code' => 'CALENDAR_LOCKED',
            ], 409);
        }

        try {
            $published = $this->calendarService->publicar($calendar);

            return response()->json(['data' => $published]);
        } catch (LogicException $e) {
            $diagnostico = $this->ldbService->verificarConformidade($calendar->fresh());

            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'LDB_MINIMUM_NOT_MET',
                'diagnostico' => $diagnostico,
            ], 422);
        }
    }

    public function importFromNetwork(CalendarImportRequest $request, string $calendarioId): JsonResponse
    {
        $escolaCalendar = EducaAcademicCalendar::query()->findOrFail($calendarioId);

        $this->authorize('manage', $escolaCalendar);

        $redeId = $request->input('calendario_rede_id');
        $redeCalendar = EducaAcademicCalendar::query()->findOrFail($redeId);

        $substituir = (bool) $request->input('substituir_existentes', false);

        try {
            $this->calendarService->importarDaRede($escolaCalendar, $redeCalendar, $substituir);

            return response()->json(['data' => $escolaCalendar->fresh()]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'IMPORT_NOT_ALLOWED',
            ], 409);
        }
    }
}
