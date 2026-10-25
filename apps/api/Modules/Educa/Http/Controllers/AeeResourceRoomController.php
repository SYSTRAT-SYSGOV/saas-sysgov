<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\AeeEnrollmentRequest;
use Modules\Educa\Http\Requests\AeeResourceRoomCreateRequest;
use Modules\Educa\Models\EducaAeeResourceRoom;
use Modules\Educa\Services\AeeResourceRoomService;

final class AeeResourceRoomController extends Controller
{
    public function __construct(
        private readonly AeeResourceRoomService $roomService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAeeResourceRoom::class);

        $salas = $this->roomService->listarSalas([
            'school_id' => $request->input('school_id'),
            'tipo_sala' => $request->input('tipo_sala'),
            'is_polo' => $request->has('is_polo') ? $request->boolean('is_polo') : null,
        ]);

        return response()->json([
            'data' => $salas,
        ]);
    }

    public function show(string $salaId): JsonResponse
    {
        $this->authorize('view', EducaAeeResourceRoom::class);

        $sala = $this->roomService->obterSala($salaId);

        return response()->json([
            'data' => $sala,
        ]);
    }

    public function store(AeeResourceRoomCreateRequest $request): JsonResponse
    {
        $this->authorize('manageSalas', EducaAeeResourceRoom::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $sala = $this->roomService->criarSala($request->validated(), $userId);

        return response()->json([
            'data' => $sala,
        ], 201);
    }

    public function update(Request $request, string $salaId): JsonResponse
    {
        $this->authorize('manageSalas', EducaAeeResourceRoom::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $sala = $this->roomService->atualizarSala($salaId, $request->all(), $userId);

        return response()->json([
            'data' => $sala,
        ]);
    }

    public function enturmar(AeeEnrollmentRequest $request, string $salaId): JsonResponse
    {
        $this->authorize('manageSalas', EducaAeeResourceRoom::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $matriculaAee = $this->roomService->enturmarContraturno($salaId, $request->validated(), $userId);

            return response()->json([
                'data' => $matriculaAee,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'conflito_contraturno_ou_capacidade',
            ], 422);
        }
    }

    public function encerrarMatricula(Request $request, string $matriculaId): JsonResponse
    {
        $this->authorize('manageSalas', EducaAeeResourceRoom::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $this->roomService->encerrarMatriculaAee($matriculaId, $userId);

        return response()->json(null, 204);
    }
}
