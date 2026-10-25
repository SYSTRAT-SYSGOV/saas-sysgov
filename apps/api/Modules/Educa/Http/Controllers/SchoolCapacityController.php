<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\SchoolCapacityCreateRequest;
use Modules\Educa\Models\EducaSchoolCapacity;
use Modules\Educa\Services\SchoolCapacityService;

final class SchoolCapacityController extends Controller
{
    public function __construct(
        private readonly SchoolCapacityService $capacityService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaSchoolCapacity::class);

        $tenantId = app(TenantContext::class)->id();
        $query = EducaSchoolCapacity::query()
            ->where('tenant_id', $tenantId)
            ->with(['school', 'course', 'grade', 'academicYear']);

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->input('academic_year_id'));
        }

        if ($request->filled('grade_id')) {
            $query->where('grade_id', $request->input('grade_id'));
        }

        if ($request->filled('turno')) {
            $query->where('turno', $request->input('turno'));
        }

        $capacidades = $query->orderBy('created_at', 'desc')->get()->map(function (EducaSchoolCapacity $cap) {
            $remanescentes = $this->capacityService->calcularVagasRemanescentes($cap);
            return array_merge($cap->toArray(), [
                'vagas_remanescentes' => $remanescentes,
                'taxa_ocupacao' => $cap->vagas_totais > 0
                    ? round((($cap->vagas_ocupadas + $cap->vagas_reservadas) / $cap->vagas_totais) * 100, 1)
                    : 0,
            ]);
        });

        return response()->json([
            'data' => $capacidades,
        ]);
    }

    public function store(SchoolCapacityCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaSchoolCapacity::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        if (isset($dados['vagas_totais']) && !isset($dados['capacidade_maxima_alunos'])) {
            $dados['capacidade_maxima_alunos'] = (int) $dados['vagas_totais'];
        }

        $capacidade = EducaSchoolCapacity::create($dados);
        $capacidade->load(['school', 'course', 'grade', 'academicYear']);


        return response()->json([
            'data' => array_merge($capacidade->toArray(), [
                'vagas_remanescentes' => $this->capacityService->calcularVagasRemanescentes($capacidade),
            ]),
            'message' => 'Capacidade de vagas cadastrada com sucesso.',
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $capacidade = EducaSchoolCapacity::where('tenant_id', $tenantId)
            ->with(['school', 'course', 'grade', 'academicYear'])
            ->findOrFail($id);

        $this->authorize('view', $capacidade);

        return response()->json([
            'data' => array_merge($capacidade->toArray(), [
                'vagas_remanescentes' => $this->capacityService->calcularVagasRemanescentes($capacidade),
            ]),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $capacidade = EducaSchoolCapacity::where('tenant_id', $tenantId)->findOrFail($id);

        $this->authorize('manage', $capacidade);

        $validated = $request->validate([
            'vagas_totais' => ['sometimes', 'integer', 'min:0'],
            'vagas_reservadas' => ['sometimes', 'integer', 'min:0'],
            'vagas_ocupadas' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (isset($validated['vagas_totais']) && !isset($validated['capacidade_maxima_alunos'])) {
            $validated['capacidade_maxima_alunos'] = (int) $validated['vagas_totais'];
        }

        $capacidade->update($validated);
        $capacidade->load(['school', 'course', 'grade', 'academicYear']);



        return response()->json([
            'data' => array_merge($capacidade->toArray(), [
                'vagas_remanescentes' => $this->capacityService->calcularVagasRemanescentes($capacidade),
            ]),
            'message' => 'Capacidade atualizada com sucesso.',
        ]);
    }
}
