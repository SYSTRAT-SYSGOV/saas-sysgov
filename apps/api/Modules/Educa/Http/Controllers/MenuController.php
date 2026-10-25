<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Http\Requests\MenuCreateRequest;
use Modules\Educa\Http\Requests\MenuHomologarRequest;
use Modules\Educa\Http\Requests\MenuItemCreateRequest;
use Modules\Educa\Models\EducaMenu;
use Modules\Educa\Services\NutritionCalculationService;

final class MenuController extends Controller
{
    public function __construct(
        private readonly NutritionCalculationService $nutritionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewCardapios', EducaMenu::class);

        $menus = $this->nutritionService->listar([
            'status' => $request->query('status'),
            'etapa_ensino' => $request->query('etapa_ensino'),
            'tipo_refeicao' => $request->query('tipo_refeicao'),
            'data_inicio' => $request->query('data_inicio'),
            'data_fim' => $request->query('data_fim'),
            'school_id' => $request->query('school_id'),
        ]);

        return response()->json([
            'data' => $menus,
        ]);
    }

    public function store(MenuCreateRequest $request): JsonResponse
    {
        $this->authorize('manageCardapios', EducaMenu::class);

        $tenantId = app(TenantContext::class)->id();
        $userId = (int) $request->user()->id;

        try {
            $menu = $this->nutritionService->criarCardapio($request->validated(), $tenantId, $userId);

            return response()->json([
                'data' => $menu,
            ], 201);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $id): JsonResponse
    {
        $this->authorize('viewCardapios', EducaMenu::class);

        $menu = $this->nutritionService->obter($id);
        $conformidade = $this->nutritionService->verificarConformidadePnae($menu);

        return response()->json([
            'data' => $menu,
            'conformidade_pnae' => $conformidade,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorize('manageCardapios', EducaMenu::class);

        try {
            $menu = $this->nutritionService->atualizarCardapio($id, $request->all());

            return response()->json([
                'data' => $menu,
            ]);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function storeItem(MenuItemCreateRequest $request, string $id): JsonResponse
    {
        $this->authorize('manageCardapios', EducaMenu::class);

        try {
            $item = $this->nutritionService->adicionarItem($id, $request->validated());

            return response()->json([
                'data' => $item,
            ], 201);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroyItem(string $itemId): JsonResponse
    {
        $this->authorize('manageCardapios', EducaMenu::class);

        try {
            $this->nutritionService->removerItem($itemId);

            return response()->json(null, 204);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function homologar(MenuHomologarRequest $request, string $id): JsonResponse
    {
        $this->authorize('homologarCardapios', EducaMenu::class);

        $userId = (int) $request->user()->id;

        try {
            $menu = $this->nutritionService->homologarCardapio(
                $id,
                (string) $request->input('responsavel_tecnico_nome'),
                (string) $request->input('responsavel_tecnico_crn'),
                $userId
            );

            return response()->json([
                'data' => $menu,
                'message' => 'Cardápio homologado com sucesso pelo responsável técnico.',
            ]);
        } catch (LogicException|InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function revogar(Request $request, string $id): JsonResponse
    {
        $this->authorize('homologarCardapios', EducaMenu::class);

        $motivo = (string) $request->input('motivo', 'Revisão técnica solicitada');
        $userId = (int) $request->user()->id;

        try {
            $menu = $this->nutritionService->revogarHomologacao($id, $motivo, $userId);

            return response()->json([
                'data' => $menu,
                'message' => 'Homologação do cardápio revogada para correção.',
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function conformidade(string $id): JsonResponse
    {
        $this->authorize('viewCardapios', EducaMenu::class);

        $menu = $this->nutritionService->obter($id);
        $conformidade = $this->nutritionService->verificarConformidadePnae($menu);

        return response()->json([
            'data' => $conformidade,
        ]);
    }
}
