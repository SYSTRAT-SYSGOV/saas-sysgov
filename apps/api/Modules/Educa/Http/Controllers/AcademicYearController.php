<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Educa\Http\Requests\AcademicYearBatchRequest;
use Modules\Educa\Http\Requests\AcademicYearCreateRequest;
use Modules\Educa\Http\Requests\AcademicYearTransitionRequest;
use Modules\Educa\Http\Requests\AcademicYearUpdateRequest;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Services\AcademicYearService;

final class AcademicYearController extends Controller
{
    public function __construct(
        private readonly AcademicYearService $yearService,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAcademicYear::class);

        $query = EducaAcademicYear::query()->with('etapas');

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->input('ano'));
        }

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginated = $query->orderByDesc('ano')->paginate($perPage);

        return response()->json($paginated);
    }

    public function store(AcademicYearCreateRequest $request): JsonResponse
    {
        $this->authorize('create', EducaAcademicYear::class);

        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();

        $ano = (int) $validated['ano'];
        $schoolId = $validated['school_id'] ?? null;
        $copiar = (bool) ($validated['copiar_do_ano_anterior'] ?? false);
        $anoOrigemId = $validated['ano_origem_id'] ?? null;

        // Verifica unicidade (tenant_id, school_id, ano)
        $existe = EducaAcademicYear::query()
            ->where('tenant_id', $tenantId)
            ->where('school_id', $schoolId)
            ->where('ano', $ano)
            ->exists();

        if ($existe) {
            return response()->json([
                'message' => "Já existe um ano letivo cadastrado para o ano {$ano} nesta unidade/rede.",
                'code' => 'DUPLICATE_ACADEMIC_YEAR',
            ], 409);
        }

        try {
            if ($copiar && $anoOrigemId) {
                $anoOrigem = EducaAcademicYear::query()->findOrFail($anoOrigemId);
                $year = $this->yearService->copyFromPreviousYear($anoOrigem, $ano, $schoolId);
            } else {
                $year = $this->yearService->create([
                    'tenant_id' => $tenantId,
                    'school_id' => $schoolId,
                    'ano' => $ano,
                    'status' => 'planning',
                    'is_immutable' => false,
                    'observacoes' => $validated['observacoes'] ?? null,
                ]);
            }

            $year->load('etapas');

            $this->audit->record(
                module: 'educa',
                action: 'create',
                resource: "ano_letivo:{$year->id}",
                before: null,
                after: $year->toArray()
            );

            return response()->json(['data' => $year], 201);
        } catch (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'DOMAIN_RULE_VIOLATION',
            ], 409);
        }
    }

    public function show(string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->with('etapas')->findOrFail($anoLetivoId);

        $this->authorize('view', $year);

        return response()->json(['data' => $year]);
    }

    public function update(AcademicYearUpdateRequest $request, string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $this->authorize('update', $year);

        if ($year->is_immutable || $year->status === 'closed') {
            return response()->json([
                'message' => 'Anos letivos encerrados são estritamente imutáveis.',
                'code' => 'ACADEMIC_YEAR_IMMUTABLE',
            ], 409);
        }

        $before = $year->toArray();
        $year->update($request->validated());
        $year->load('etapas');

        $this->audit->record(
            module: 'educa',
            action: 'update',
            resource: "ano_letivo:{$year->id}",
            before: $before,
            after: $year->toArray()
        );

        return response()->json(['data' => $year]);
    }

    public function destroy(string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $this->authorize('delete', $year);

        if ($year->status !== 'planning') {
            return response()->json([
                'message' => 'Apenas anos letivos em planejamento podem ser excluídos.',
                'code' => 'INVALID_STATUS_FOR_DELETION',
            ], 409);
        }

        $before = $year->toArray();
        $year->delete();

        $this->audit->record(
            module: 'educa',
            action: 'delete',
            resource: "ano_letivo:{$year->id}",
            before: $before,
            after: null
        );

        return response()->json(null, 204);
    }

    public function transition(AcademicYearTransitionRequest $request, string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $evento = (string) $request->input('evento');
        $this->authorize('transition', [$year, $evento]);

        $motivo = $request->input('motivo');
        $before = $year->toArray();

        try {
            $this->yearService->transition($year, $evento, $motivo);
            $year->load('etapas');

            $this->audit->record(
                module: 'educa',
                action: "transition:{$evento}",
                resource: "ano_letivo:{$year->id}",
                before: $before,
                after: $year->toArray()
            );

            return response()->json(['data' => $year]);
        } catch (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'INVALID_TRANSITION',
            ], 409);
        }
    }

    public function batch(AcademicYearBatchRequest $request): JsonResponse
    {
        $this->authorize('batch', EducaAcademicYear::class);

        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();
        $acao = $validated['acao'];
        $ano = (int) $validated['ano'];
        $schoolIds = $validated['school_ids'];

        $results = [];

        DB::beginTransaction();
        try {
            foreach ($schoolIds as $schoolId) {
                if ($acao === 'create') {
                    $existe = EducaAcademicYear::query()
                        ->where('tenant_id', $tenantId)
                        ->where('school_id', $schoolId)
                        ->where('ano', $ano)
                        ->exists();

                    if ($existe) {
                        throw new DomainException("Escola {$schoolId} já possui ano {$ano} cadastrado.");
                    }

                    $created = $this->yearService->create([
                        'tenant_id' => $tenantId,
                        'school_id' => $schoolId,
                        'ano' => $ano,
                        'status' => 'planning',
                        'is_immutable' => false,
                    ]);

                    $results[] = [
                        'school_id' => $schoolId,
                        'status' => 'success',
                        'ano_letivo_id' => $created->id,
                    ];
                } elseif ($acao === 'open') {
                    $year = EducaAcademicYear::query()
                        ->where('tenant_id', $tenantId)
                        ->where('school_id', $schoolId)
                        ->where('ano', $ano)
                        ->first();

                    if (! $year) {
                        throw new DomainException("Escola {$schoolId} não possui ano {$ano} para abertura.");
                    }

                    $this->yearService->transition($year, 'start');
                    $results[] = [
                        'school_id' => $schoolId,
                        'status' => 'success',
                        'ano_letivo_id' => $year->id,
                    ];
                } elseif ($acao === 'close') {
                    $year = EducaAcademicYear::query()
                        ->where('tenant_id', $tenantId)
                        ->where('school_id', $schoolId)
                        ->where('ano', $ano)
                        ->first();

                    if (! $year) {
                        throw new DomainException("Escola {$schoolId} não possui ano {$ano} para encerramento.");
                    }

                    $this->yearService->transition($year, 'close');
                    $results[] = [
                        'school_id' => $schoolId,
                        'status' => 'success',
                        'ano_letivo_id' => $year->id,
                    ];
                }
            }

            DB::commit();

            $this->audit->record(
                module: 'educa',
                action: "batch:{$acao}",
                resource: "ano_letivo:lote:{$ano}",
                before: null,
                after: ['results' => $results]
            );

            return response()->json([
                'data' => [
                    'acao' => $acao,
                    'ano' => $ano,
                    'processados' => count($results),
                    'detalhes' => $results,
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'BATCH_PROCESSING_FAILED',
            ], 422);
        }
    }
}
