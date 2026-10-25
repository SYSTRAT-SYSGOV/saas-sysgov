<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\CalendarDayReasonRequest;
use Modules\Educa\Models\EducaCalendarDayReason;

final class CalendarDayReasonController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaCalendarDayReason::class);

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginated = EducaCalendarDayReason::query()
            ->orderBy('nome')
            ->paginate($perPage);

        return response()->json($paginated);
    }

    public function store(CalendarDayReasonRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaCalendarDayReason::class);

        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();

        $codigo = $validated['codigo'];
        $schoolId = $validated['school_id'] ?? null;

        $existe = EducaCalendarDayReason::query()
            ->where('tenant_id', $tenantId)
            ->where('school_id', $schoolId)
            ->where('codigo', $codigo)
            ->exists();

        if ($existe) {
            return response()->json([
                'message' => "Já existe um motivo cadastrado com o código '{$codigo}' nesta unidade/rede.",
                'code' => 'DUPLICATE_REASON_CODE',
            ], 409);
        }

        $reason = EducaCalendarDayReason::create([
            'tenant_id' => $tenantId,
            'school_id' => $schoolId,
            'codigo' => $codigo,
            'nome' => $validated['nome'],
            'tipo' => $validated['tipo'],
            'is_school_day' => (bool) $validated['is_school_day'],
            'color_hex' => $validated['color_hex'],
        ]);

        $this->audit->record(
            module: 'educa',
            action: 'create',
            resource: "motivo_dia:{$reason->id}",
            before: null,
            after: $reason->toArray()
        );

        return response()->json($reason, 201);
    }

    public function update(CalendarDayReasonRequest $request, string $motivoId): JsonResponse
    {
        $reason = EducaCalendarDayReason::query()->findOrFail($motivoId);

        $this->authorize('manage', $reason);

        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();
        $codigo = $validated['codigo'];
        $schoolId = $validated['school_id'] ?? null;

        $conflito = EducaCalendarDayReason::query()
            ->where('tenant_id', $tenantId)
            ->where('school_id', $schoolId)
            ->where('codigo', $codigo)
            ->where('id', '!=', $reason->id)
            ->exists();

        if ($conflito) {
            return response()->json([
                'message' => "Já existe outro motivo cadastrado com o código '{$codigo}'.",
                'code' => 'DUPLICATE_REASON_CODE',
            ], 409);
        }

        $before = $reason->toArray();
        $reason->update([
            'school_id' => $schoolId,
            'codigo' => $codigo,
            'nome' => $validated['nome'],
            'tipo' => $validated['tipo'],
            'is_school_day' => (bool) $validated['is_school_day'],
            'color_hex' => $validated['color_hex'],
        ]);

        $this->audit->record(
            module: 'educa',
            action: 'update',
            resource: "motivo_dia:{$reason->id}",
            before: $before,
            after: $reason->fresh()->toArray()
        );

        return response()->json($reason->fresh());
    }
}
