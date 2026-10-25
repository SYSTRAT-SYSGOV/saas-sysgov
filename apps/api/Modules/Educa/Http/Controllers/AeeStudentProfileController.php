<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\AeeLaudoCreateRequest;
use Modules\Educa\Http\Requests\AeeStudentProfileCreateRequest;
use Modules\Educa\Models\EducaAeeStudentProfile;
use Modules\Educa\Services\AeeStudentProfileService;

final class AeeStudentProfileController extends Controller
{
    public function __construct(
        private readonly AeeStudentProfileService $profileService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaAeeStudentProfile::class);

        $perfis = $this->profileService->listar([
            'school_id' => $request->input('school_id'),
            'status' => $request->input('status'),
            'tipo_condicao' => $request->input('tipo_condicao'),
        ]);

        return response()->json([
            'data' => $perfis,
        ]);
    }

    public function show(Request $request, string $perfilId): JsonResponse
    {
        $this->authorize('view', EducaAeeStudentProfile::class);

        $canViewSensitive = $request->user()?->can('viewLaudos', EducaAeeStudentProfile::class) ?? true;
        $perfil = $this->profileService->obter($perfilId, $canViewSensitive);

        return response()->json([
            'data' => $perfil,
        ]);
    }

    public function store(AeeStudentProfileCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaAeeStudentProfile::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $perfil = $this->profileService->criar($request->validated(), $userId);

        return response()->json([
            'data' => $perfil,
        ], 201);
    }

    public function update(Request $request, string $perfilId): JsonResponse
    {
        $this->authorize('manage', EducaAeeStudentProfile::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $perfil = $this->profileService->atualizar($perfilId, $request->all(), $userId);

        return response()->json([
            'data' => $perfil,
        ]);
    }

    public function anexarLaudo(AeeLaudoCreateRequest $request, string $perfilId): JsonResponse
    {
        $this->authorize('manage', EducaAeeStudentProfile::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $perfil = $this->profileService->anexarLaudo($perfilId, $request->validated(), $userId);

        return response()->json([
            'data' => $perfil,
        ], 201);
    }

    public function destroy(Request $request, string $perfilId): JsonResponse
    {
        $this->authorize('manage', EducaAeeStudentProfile::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $this->profileService->deletar($perfilId, $userId);

        return response()->json(null, 204);
    }
}
