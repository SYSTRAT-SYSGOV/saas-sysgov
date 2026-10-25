<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Services\LdbComplianceService;

final class LdbComplianceController extends Controller
{
    public function __construct(
        private readonly LdbComplianceService $ldbService,
    ) {}

    public function show(string $anoLetivoId): JsonResponse
    {
        $year = EducaAcademicYear::query()->findOrFail($anoLetivoId);

        $this->authorize('view', $year);

        $diagnostico = $this->ldbService->evaluateAcademicYear($year);

        return response()->json($diagnostico);
    }
}
