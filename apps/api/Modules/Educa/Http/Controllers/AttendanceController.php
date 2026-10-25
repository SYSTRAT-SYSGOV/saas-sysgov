<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\AttendanceSaveRequest;
use Modules\Educa\Models\EducaAttendanceRecord;
use Modules\Educa\Services\AttendanceService;

final class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {}

    public function store(string $diarioId, AttendanceSaveRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaAttendanceRecord::class);

        $computados = $this->attendanceService->salvarFrequencia(
            $diarioId,
            $request->input('registros')
        );

        return response()->json([
            'message' => 'Frequência gravada com sucesso.',
            'total_computados' => $computados,
        ]);
    }

    public function excuse(string $attendanceRecordId, Request $request): JsonResponse
    {
        $this->authorize('manage', EducaAttendanceRecord::class);

        $request->validate([
            'justificativa' => ['required', 'string', 'max:255'],
        ]);

        $registro = $this->attendanceService->abonarFalta(
            $attendanceRecordId,
            (string) $request->input('justificativa')
        );

        return response()->json([
            'message' => 'Falta abonada com sucesso.',
            'data' => $registro,
        ]);
    }
}
