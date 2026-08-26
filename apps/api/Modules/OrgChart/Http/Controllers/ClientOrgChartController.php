<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Modules\OrgChart\Http\Requests\CreateOrgUnitRequest;
use Modules\OrgChart\Http\Requests\LinkUserOrgUnitRequest;
use Modules\OrgChart\Http\Requests\MoveOrgUnitRequest;
use Modules\OrgChart\Http\Requests\UpdateOrgUnitRequest;
use Modules\OrgChart\Http\Resources\OrgUnitResource;
use Modules\OrgChart\Http\Resources\OrgUnitTreeResource;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgExportService;
use Modules\OrgChart\Services\OrgScopeService;
use Modules\OrgChart\Services\OrgSeedService;
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Services\OrgUserService;

final class ClientOrgChartController extends Controller
{
    public function __construct(
        private readonly OrgTreeService $treeService,
        private readonly OrgUserService $userService,
        private readonly OrgScopeService $scopeService,
        private readonly OrgExportService $exportService,
        private readonly OrgSeedService $seedService,
    ) {}

    /**
     * Retorna a árvore organizacional ou lista de unidades do tenant ativo.
     * GET /api/org-units
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', OrgUnit::class);
        $rootId = $request->query('root_id') ? (int) $request->query('root_id') : null;
        $onlyActive = $request->boolean('active', true);
        $asFlat = $request->boolean('flat', false);

        if ($asFlat) {
            $units = OrgUnit::query()
                ->when($onlyActive, fn($q) => $q->where('is_active', true))
                ->with(['parent', 'responsibles'])
                ->orderBy('level')
                ->orderBy('order')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => OrgUnitResource::collection($units),
            ]);
        }

        $tree = $this->treeService->getTree($rootId, $onlyActive);

        return response()->json([
            'data' => OrgUnitTreeResource::collection($tree),
        ]);
    }

    /**
     * Semeia a estrutura organizacional mínima do município (Gabinete + Secretarias).
     * POST /api/org-units/seed
     * Autorizado para admin_tenant, super_admin ou quem tem permissão org.admin.seed.
     */
    public function seed(): JsonResponse
    {
        $user = request()->user();
        $tenant = app(\App\Support\TenantContext::class)->get();

        abort_unless($user !== null, 401);

        if (!$user->is_platform_admin && !$user->hasRole('admin_tenant') && !$user->hasPermission('org.admin.seed')) {
            abort(403, 'Somente o administrador do município pode inicializar o organograma.');
        }

        if ($this->seedService->hasRoot()) {
            return response()->json([
                'message' => 'O município já possui um organograma.',
                'data' => OrgUnitTreeResource::collection($this->treeService->getTree()),
            ]);
        }

        $this->seedService->seedDefaultMunicipalStructure($tenant);

        $tree = $this->treeService->getTree();

        return response()->json([
            'message' => 'Estrutura organizacional inicial semeada com sucesso.',
            'data' => OrgUnitTreeResource::collection($tree),
        ], 201);
    }

    /**
     * Retorna detalhes de uma unidade organizacional específica.
     * GET /api/org-units/{id}
     */
    public function show(int $id): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::with(['parent', 'children', 'users', 'responsibles'])->findOrFail($id);

        Gate::authorize('view', $unit);

        return response()->json([
            'data' => new OrgUnitResource($unit),
        ]);
    }

    /**
     * Retorna o escopo organizacional do usuário logado (ABAC).
     * GET /api/org-units/scope
     */
    public function scope(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['error' => 'Não autenticado.'], 401);
        }

        $scope = $this->scopeService->getUserScopeSummary($user);

        return response()->json([
            'data' => $scope,
        ]);
    }

    /**
     * Cria uma nova unidade organizacional.
     * POST /api/org-units
     */
    public function store(CreateOrgUnitRequest $request): JsonResponse
    {
        Gate::authorize('create', OrgUnit::class);

        $unit = $this->treeService->createUnit($request->validated());

        return response()->json([
            'message' => 'Unidade organizacional criada com sucesso.',
            'data' => new OrgUnitResource($unit),
        ], 201);
    }

    /**
     * Atualiza dados de uma unidade organizacional.
     * PUT /api/org-units/{id}
     */
    public function update(UpdateOrgUnitRequest $request, int $id): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('update', $unit);

        $updated = $this->treeService->updateUnit($unit, $request->validated());

        return response()->json([
            'message' => 'Unidade organizacional atualizada com sucesso.',
            'data' => new OrgUnitResource($updated),
        ]);
    }

    /**
     * Move uma unidade para um novo pai hierárquico.
     * POST /api/org-units/{id}/move
     */
    public function move(MoveOrgUnitRequest $request, int $id): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('move', $unit);

        $newParentId = $request->input('new_parent_id');
        $newOrder = $request->input('new_order');

        $moved = $this->treeService->moveUnit($unit, $newParentId, $newOrder);

        return response()->json([
            'message' => 'Unidade movida com sucesso e subárvore recalculada.',
            'data' => new OrgUnitResource($moved),
        ]);
    }

    /**
     * Remove ou inativa uma unidade organizacional.
     * DELETE /api/org-units/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('delete', $unit);

        $reason = $request->input('reason');
        $this->treeService->deleteUnit($unit, $reason);

        return response()->json([
            'message' => 'Unidade processada com sucesso.',
        ]);
    }

    /**
     * Vincula um usuário a uma unidade organizacional.
     * POST /api/org-units/{id}/users
     */
    public function linkUser(LinkUserOrgUnitRequest $request, int $id): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('linkUser', $unit);

        $link = $this->userService->linkUser(
            $unit,
            (int) $request->input('user_id'),
            $request->validated()
        );

        return response()->json([
            'message' => 'Usuário vinculado à unidade com sucesso.',
            'data' => $link,
        ], 201);
    }

    /**
     * Remove o vínculo de um usuário com uma unidade organizacional.
     * DELETE /api/org-units/{id}/users/{userId}
     */
    public function unlinkUser(int $id, int $userId): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('unlinkUser', $unit);

        $this->userService->unlinkUser($unit, $userId);

        return response()->json([
            'message' => 'Vínculo do usuário removido com sucesso.',
        ]);
    }

    /**
     * Define a unidade primária de um usuário.
     * POST /api/org-units/{id}/users/{userId}/primary
     */
    public function setPrimaryUnit(int $id, int $userId): JsonResponse
    {
        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('linkUser', $unit);

        $link = $this->userService->setPrimaryUnit($userId, $unit->id);

        return response()->json([
            'message' => 'Unidade definida como primária para o usuário.',
            'data' => $link,
        ]);
    }

    /**
     * Exporta o organograma completo em formato JSON ou CSV com manifest versionado (RN-ORG-010).
     * POST /api/org-units/export
     */
    public function export(Request $request): JsonResponse|Response
    {
        Gate::authorize('viewAny', OrgUnit::class);

        $format = strtolower((string) $request->input('format', 'json'));

        if ($format === 'csv') {
            $csv = $this->exportService->exportCsv();
            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="organograma.csv"',
            ]);
        }

        $json = $this->exportService->exportJson();
        return response()->json([
            'data' => $json,
        ]);
    }
}
