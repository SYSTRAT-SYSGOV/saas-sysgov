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
use Modules\OrgChart\Services\OrgTreeService;

final class AdminOrgChartController extends Controller
{
    public function __construct(
        private readonly OrgTreeService $treeService,
        private readonly TenantContext $tenantContext,
        private readonly AuditLogger $audit
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

        $this->tenantContext->set($tenantInstance);

        // Verifica se o tenant já possui raiz
        $existingRoot = OrgUnit::roots()->first();
        if ($existingRoot !== null) {
            return response()->json([
                'message' => 'O tenant já possui um organograma inicial cadastrado.',
                'data' => $this->treeService->getTree(),
            ], 200);
        }

        // 1. Cria a Raiz Municipal (Gabinete do Prefeito)
        $root = $this->treeService->createUnit([
            'name' => "Gabinete do Prefeito — {$tenantInstance->name}",
            'code' => 'GAB',
            'acronym' => 'GAB',
            'type' => 'raiz',
            'metadata' => [
                'description' => 'Órgão executivo superior da administração municipal.',
                'seeded_by' => 'SYSTRAT Onboarding Engine',
            ],
        ]);

        // 2. Cria Secretaria de Administração & Recursos Humanos
        $secAdmin = $this->treeService->createUnit([
            'name' => 'Secretaria Municipal de Administração',
            'code' => 'SMA',
            'acronym' => 'SMA',
            'type' => 'secretaria',
            'parent_id' => $root->id,
            'metadata' => [
                'description' => 'Gestão administrativa, patrimônio e compras públicas.',
            ],
        ]);

        // 3. Cria Secretaria de Finanças & Orçamento
        $secFinancas = $this->treeService->createUnit([
            'name' => 'Secretaria Municipal de Finanças & Planejamento',
            'code' => 'SMF',
            'acronym' => 'SMF',
            'type' => 'secretaria',
            'parent_id' => $root->id,
            'metadata' => [
                'description' => 'Execução orçamentária, contabilidade e arrecadação.',
            ],
        ]);

        $this->audit->record(
            'org',
            'onboarding.seeded',
            "Tenant #{$tenantInstance->id} ({$tenantInstance->name})",
            null,
            ['root_id' => $root->id, 'sec_admin_id' => $secAdmin->id, 'sec_financas_id' => $secFinancas->id]
        );

        $tree = $this->treeService->getTree();

        return response()->json([
            'message' => 'Estrutura organizacional inicial semeada com sucesso no tenant.',
            'data' => OrgUnitTreeResource::collection($tree),
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
