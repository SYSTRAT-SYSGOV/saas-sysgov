<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use App\Models\Tenant;
use Modules\Admin\Http\Requests\StoreHierarchyNodeRequest;
use App\Models\Department;
use App\Models\ManagementUnit;
use App\Models\BudgetUnit;

final class HierarchyController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->integer('tenant_id');
        if ($tenantId && !DB::table('tenants')->whereKey($tenantId)->exists()) abort(404, 'Tenant não encontrado.');
        $query = Organization::query()->with('departments.managementUnits.budgetUnits')->orderBy('name');
        if ($tenantId) $query->where('tenant_id', $tenantId);
        return response()->json($query->get());
    }

    public function storeOrganization(StoreHierarchyNodeRequest $request, AuditLogger $audit): JsonResponse { return $this->createNode($request, $audit, Organization::class); }
    public function storeDepartment(StoreHierarchyNodeRequest $request, AuditLogger $audit): JsonResponse { return $this->createNode($request, $audit, Department::class, Organization::class, 'organization_id'); }
    public function storeManagementUnit(StoreHierarchyNodeRequest $request, AuditLogger $audit): JsonResponse { return $this->createNode($request, $audit, ManagementUnit::class, Department::class, 'department_id'); }
    public function storeBudgetUnit(StoreHierarchyNodeRequest $request, AuditLogger $audit): JsonResponse { return $this->createNode($request, $audit, BudgetUnit::class, ManagementUnit::class, 'management_unit_id'); }

    private function createNode(StoreHierarchyNodeRequest $request, AuditLogger $audit, string $modelClass, ?string $parentClass = null, ?string $parentKey = null): JsonResponse
    {
        $data = $request->validated(); $tenantId = $data['tenant_id']; $parentId = $data['parent_id'] ?? null; unset($data['tenant_id'], $data['parent_id']);
        $context = app(TenantContext::class);
        $context->set(Tenant::query()->findOrFail($tenantId));
        try {
            if ($parentClass && (!$parentId || !$parentClass::query()->whereKey($parentId)->exists())) abort(422, 'O nível pai não pertence ao tenant informado.');
            if ($parentKey) $data[$parentKey] = $parentId;
            $node = $modelClass::create($data);
            $audit->record('admin', 'hierarchy.created', strtolower(class_basename($modelClass)).':'.$node->getKey(), null, $node->toArray());
            return response()->json($node, 201);
        } finally { $context->clear(); }
    }
}
