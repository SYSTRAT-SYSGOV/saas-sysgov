<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\AeeParecerRequest;
use Modules\Educa\Http\Requests\AeePeiCreateRequest;
use Modules\Educa\Http\Requests\AeePeiGoalRequest;
use Modules\Educa\Models\EducaAeePei;
use Modules\Educa\Services\AeePeiService;

final class AeePeiController extends Controller
{
    public function __construct(
        private readonly AeePeiService $peiService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAeePei::class);

        $peis = $this->peiService->listar([
            'student_profile_id' => $request->input('student_profile_id'),
            'academic_year_id' => $request->input('academic_year_id'),
            'status' => $request->input('status'),
        ]);

        return response()->json([
            'data' => $peis,
        ]);
    }

    public function show(string $peiId): JsonResponse
    {
        $this->authorize('view', EducaAeePei::class);

        $pei = $this->peiService->obter($peiId);

        return response()->json([
            'data' => $pei,
        ]);
    }

    public function store(AeePeiCreateRequest $request): JsonResponse
    {
        $this->authorize('managePei', EducaAeePei::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $pei = $this->peiService->criar($request->validated(), $userId);

        return response()->json([
            'data' => $pei,
        ], 201);
    }

    public function update(Request $request, string $peiId): JsonResponse
    {
        $this->authorize('managePei', EducaAeePei::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $pei = $this->peiService->atualizar($peiId, $request->all(), $userId);

        return response()->json([
            'data' => $pei,
        ]);
    }

    public function salvarMeta(AeePeiGoalRequest $request, string $peiId): JsonResponse
    {
        $this->authorize('managePei', EducaAeePei::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $meta = $this->peiService->salvarMeta($peiId, $request->validated(), $userId);

        return response()->json([
            'data' => $meta,
        ], 201);
    }

    public function registrarParecer(AeeParecerRequest $request, string $peiId): JsonResponse
    {
        $this->authorize('managePei', EducaAeePei::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $status = $request->input('status', 'concluido');
        $pei = $this->peiService->registrarParecer($peiId, (string) $request->input('parecer_descritivo'), (string) $status, $userId);

        return response()->json([
            'data' => $pei,
        ]);
    }
}
