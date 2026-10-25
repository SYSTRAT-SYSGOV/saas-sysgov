<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Http\Requests\StudentProfileUpdateRequest;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Educa\Services\StudentProfileService;

final class StudentProfileController extends Controller
{
    public function __construct(
        private readonly StudentProfileService $profileService,
    ) {}

    public function show(int $pessoaId): JsonResponse
    {
        $this->authorize('view', EducaStudentProfile::class);

        $tenantId = app(TenantContext::class)->id();
        $perfil = $this->profileService->obterOuCriarPerfil($pessoaId, $tenantId);

        return response()->json([
            'data' => $perfil,
        ]);
    }

    public function update(int $pessoaId, StudentProfileUpdateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaStudentProfile::class);

        $tenantId = app(TenantContext::class)->id();
        $perfil = $this->profileService->atualizarPerfil($pessoaId, $tenantId, $request->validated());

        return response()->json([
            'data' => $perfil,
        ]);
    }
}
