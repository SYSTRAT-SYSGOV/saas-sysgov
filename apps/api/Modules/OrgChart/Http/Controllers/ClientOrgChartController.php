<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\ModuleAccessService;
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
        private readonly ModuleAccessService $access,
    ) {}

    /**
     * Retorna a árvore organizacional ou lista de unidades do tenant ativo.
     * GET /api/org-units
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', OrgUnit::class);
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();
        $rootId = $request->query('root_id') ? (int) $request->query('root_id') : null;
        $onlyActive = $request->boolean('active', true);
        $asFlat = $request->boolean('flat', false);

        if ($asFlat) {
            $query = OrgUnit::query()
                ->when($onlyActive, fn($q) => $q->where('is_active', true))
                ->with(['parent', 'responsibles'])
                ->orderBy('level')
                ->orderBy('order')
                ->orderBy('name');

            $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
            if ($allowedIds !== null && $allowedIds !== []) {
                $query->whereIn('id', $allowedIds);
            } elseif ($allowedIds === []) {
                return response()->json(['data' => []]);
            }

            $units = $query->get();
            return response()->json(['data' => OrgUnitResource::collection($units)]);
        }

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && $allowedIds !== []) {
            $tree = $this->treeService->getFilteredTree($rootId, $onlyActive, $allowedIds);
            return response()->json(['data' => OrgUnitTreeResource::collection($tree)]);
        }

        $tree = $this->treeService->getTree($rootId, $onlyActive);
        return response()->json(['data' => OrgUnitTreeResource::collection($tree)]);
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
    public function show(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::with(['parent', 'children', 'users', 'responsibles'])->findOrFail($id);

        Gate::authorize('view', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

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

        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();
        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);

        $parentId = $request->validated('parent_id');
        if ($parentId !== null && $allowedIds !== null && !in_array($parentId, $allowedIds, true)) {
            return response()->json(['error' => 'Não é permitido criar unidades sob esta unidade pai.'], 403);
        }

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
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('update', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

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
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('move', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null) {
            if (!in_array($unit->id, $allowedIds, true)) {
                return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
            }
            $newParentId = $request->input('new_parent_id');
            if ($newParentId !== null && !in_array((int) $newParentId, $allowedIds, true)) {
                return response()->json(['error' => 'Não é permitido mover para esta unidade.'], 403);
            }
        }

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
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('delete', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

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
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('linkUser', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

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
    public function unlinkUser(int $id, int $userId, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('unlinkUser', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

        $this->userService->unlinkUser($unit, $userId);

        return response()->json([
            'message' => 'Vínculo do usuário removido com sucesso.',
        ]);
    }

    /**
     * Define a unidade primária de um usuário.
     * POST /api/org-units/{id}/users/{userId}/primary
     */
    public function setPrimaryUnit(int $id, int $userId, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('linkUser', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

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

    /**
     * Lista os servidores vinculados a uma unidade organizacional.
     * GET /api/org-units/{id}/users
     *
     * @return JsonResponse
     */
    public function users(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        /** @var OrgUnit $unit */
        $unit = OrgUnit::findOrFail($id);

        Gate::authorize('view', $unit);

        $allowedIds = $this->access->allowedOrgUnitIds($user, 'org', $tenantId);
        if ($allowedIds !== null && !in_array($unit->id, $allowedIds, true)) {
            return response()->json(['error' => 'Acesso negado a esta unidade.'], 403);
        }

        $links = $unit->users()
            ->withPivot(['role', 'is_primary', 'valid_from', 'valid_to'])
            ->get();

        $data = $links->map(function (\App\Models\User $u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'matricula' => $u->matricula,
                'role' => $u->pivot->role,
                'is_primary' => (bool) $u->pivot->is_primary,
                'valid_from' => $u->pivot->valid_from,
                'valid_to' => $u->pivot->valid_to,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Busca usuários do tenant para vínculo (por nome, matrícula ou e-mail).
     * GET /api/org-units/users/search?q=...
     */
    public function searchUsers(Request $request): JsonResponse
    {
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();
        $q = trim((string) $request->query('q', ''));
        $excludeUnitId = $request->query('exclude_unit_id') ? (int) $request->query('exclude_unit_id') : null;

        if ($q === '') {
            return response()->json(['data' => []]);
        }

        $query = User::query()
            ->whereHas('tenants', fn ($tq) => $tq->where('tenants.id', $tenantId)->where('tenant_user.status', 'active'))
            ->where(function ($where) use ($q): void {
                $where->where('name', 'like', "%{$q}%")
                    ->orWhere('matricula', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            })
            ->orderBy('name')
            ->limit(20);

        if ($excludeUnitId !== null) {
            $query->whereNotIn('users.id', function ($sub) use ($excludeUnitId): void {
                $sub->select('user_id')
                    ->from('org_unit_user')
                    ->where('org_unit_id', $excludeUnitId);
            });
        }

        $users = $query->get(['id', 'name', 'email', 'matricula']);

        return response()->json([
            'data' => $users->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'matricula' => $u->matricula,
            ]),
        ]);
    }
}
