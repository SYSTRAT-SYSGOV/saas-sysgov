<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\OrgChart\Http\Resources\OrgUnitTreeResource;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgSeedService;
use Modules\OrgChart\Services\OrgTreeService;

final class AdminOrgChartController extends Controller
{
    public function __construct(
        private readonly OrgTreeService $treeService,
        private readonly TenantContext $tenantContext,
        private readonly OrgSeedService $seedService,
    ) {}

    /**
     * Semeia a estrutura organizacional mínima para um tenant durante o onboarding.
     * POST /admin/tenants/{tenant}/org-units/seed
     * RN-ORG-011: Exclusivo do web-admin (SYSTRAT)
     */
    public function seed(Request $request, Tenant|int|string $tenant): JsonResponse
    {
        $tenantInstance = $tenant instanceof Tenant ? $tenant : Tenant::findOrFail((int) $tenant);

        Gate::authorize('adminSeed', OrgUnit::class);

        if ($this->seedService->hasRoot()) {
            return response()->json([
                'message' => 'O tenant já possui um organograma inicial cadastrado.',
                'data' => $this->treeService->getTree(),
            ], 200);
        }

        $this->seedService->seedDefaultMunicipalStructure($tenantInstance);

        return response()->json([
            'message' => 'Estrutura organizacional inicial semeada com sucesso no tenant.',
            'data' => OrgUnitTreeResource::collection($this->treeService->getTree()),
        ], 201);
    }

    /**
     * Visualização read-only da árvore organizacional do tenant para suporte técnico.
     * GET /admin/tenants/{tenant}/org-units
     * RN-ORG-011: Exclusivo do web-admin (SYSTRAT)
     */
    public function index(Tenant|int|string $tenant): JsonResponse
    {
        $tenantInstance = $tenant instanceof Tenant ? $tenant : Tenant::findOrFail((int) $tenant);

        Gate::authorize('adminRead', OrgUnit::class);

        $this->tenantContext->set($tenantInstance);
        $tree = $this->treeService->getTree(onlyActive: false);

        return response()->json([
            'data' => OrgUnitTreeResource::collection($tree),
        ]);
    }
}
