<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Http\Requests\AcademicStageReplaceRequest;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Services\AcademicYearService;

final class AcademicStageController extends Controller
{
    public function __construct(
        private readonly AcademicYearService $yearService,
        private readonly AuditLogger $audit,
    ) {}

    public function index(string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $this->authorize('view', $year);

        $stages = $year->etapas()->orderBy('sequencial')->get();

        return response()->json(['data' => $stages]);
    }

    public function replace(AcademicStageReplaceRequest $request, string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $this->authorize('update', $year);

        if ($year->is_immutable || $year->status === 'closed') {
            return response()->json([
                'message' => 'Anos letivos encerrados são estritamente imutáveis.',
                'code' => 'ACADEMIC_YEAR_IMMUTABLE',
            ], 409);
        }

        $validated = $request->validated();
        $tipoEtapaId = $validated['tipo_etapa_id'];
        $etapas = $validated['etapas'];

        $before = $year->etapas()->get()->toArray();

        try {
            $createdStages = $this->yearService->replaceStages($year, $tipoEtapaId, $etapas);

            $this->audit->record(
                module: 'educa',
                action: 'replace_stages',
                resource: "ano_letivo:{$year->id}:etapas",
                before: $before,
                after: $createdStages->toArray()
            );

            return response()->json(['data' => $createdStages]);
        } catch (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'STAGE_VALIDATION_FAILED',
            ], 409);
        }
    }
}
