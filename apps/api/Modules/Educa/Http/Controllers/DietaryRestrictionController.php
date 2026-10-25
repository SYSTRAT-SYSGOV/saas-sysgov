<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Http\Requests\DietaryRestrictionCreateRequest;
use Modules\Educa\Models\EducaDietaryRestriction;
use Modules\Educa\Services\DietaryRestrictionService;

final class DietaryRestrictionController extends Controller
{
    public function __construct(
        private readonly DietaryRestrictionService $restrictionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewRestricoes', EducaDietaryRestriction::class);

        $restricoes = $this->restrictionService->listar([
            'pessoa_id' => $request->query('pessoa_id'),
            'status' => $request->query('status'),
            'tipo_restricao' => $request->query('tipo_restricao'),
            'severidade' => $request->query('severidade'),
            'school_id' => $request->query('school_id'),
        ]);

        return response()->json([
            'data' => $restricoes,
        ]);
    }

    public function store(DietaryRestrictionCreateRequest $request): JsonResponse
    {
        $this->authorize('manageRestricoes', EducaDietaryRestriction::class);

        $tenantId = app(TenantContext::class)->id();
        $userId = (int) $request->user()->id;

        try {
            $restricao = $this->restrictionService->cadastrar($request->validated(), $tenantId, $userId);

            return response()->json([
                'data' => $restricao,
            ], 201);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $id): JsonResponse
    {
        $this->authorize('viewRestricoes', EducaDietaryRestriction::class);

        $restricao = $this->restrictionService->obter($id);

        return response()->json([
            'data' => $restricao,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorize('manageRestricoes', EducaDietaryRestriction::class);

        try {
            $restricao = $this->restrictionService->atualizar($id, $request->all());

            return response()->json([
                'data' => $restricao,
            ]);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function inativar(Request $request, string $id): JsonResponse
    {
        $this->authorize('manageRestricoes', EducaDietaryRestriction::class);

        $motivo = (string) $request->input('motivo', 'Alta médica ou atualização de prontuário');

        try {
            $restricao = $this->restrictionService->inativar($id, $motivo);

            return response()->json([
                'data' => $restricao,
                'message' => 'Restrição alimentar inativada com sucesso.',
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function alertasEscola(string $schoolId): JsonResponse
    {
        $this->authorize('viewRestricoes', EducaDietaryRestriction::class);

        $alertas = $this->restrictionService->obterAlertasParaEscola($schoolId);

        return response()->json([
            'data' => $alertas,
        ]);
    }
}
