<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Services\ModuleAccessService;
use App\Support\TenantContext;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Http\Requests\StoreExpenseRequest;
use Modules\Finance\Http\Requests\StoreRevenueRequest;
use Modules\Finance\Models\Expense;
use Modules\Finance\Models\Revenue;
use Modules\Finance\Services\FinanceService;
use Modules\OrgChart\Models\OrgUnitUser;
use Throwable;

final class FinanceEntryController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly FinanceService $service,
        private readonly ModuleAccessService $access,
    ) {}

    public function indexRevenues(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Revenue::class);
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();

        $query = Revenue::query();

        if (!$this->isGlobalAdmin($user, $tenantId)) {
            $this->access->scopeQuery($query, $user, 'finance', $tenantId, 'org_unit_id');
        }

        return response()->json($query->latest('occurred_at')->paginate(25));
    }

    public function storeRevenue(StoreRevenueRequest $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $data = $request->validated();

        if (!$this->isGlobalAdmin($user, $tenantId)) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            $data['org_unit_id'] = $this->resolveOrgUnitId($data['org_unit_id'] ?? null, $user, $tenantId, $allowedIds);
        }

        return response()->json($this->service->createRevenue($data), 201);
    }

    public function updateRevenue(StoreRevenueRequest $request, Revenue $revenue): JsonResponse
    {
        $this->authorize('update', $revenue);
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $data = $request->validated();

        if (!$this->isGlobalAdmin($user, $tenantId) && array_key_exists('org_unit_id', $data)) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            $data['org_unit_id'] = $this->resolveOrgUnitId($data['org_unit_id'], $user, $tenantId, $allowedIds);
        }

        return response()->json($this->service->updateRevenue($revenue, $data));
    }

    public function indexExpenses(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Expense::class);
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();

        $query = Expense::query();

        if (!$this->isGlobalAdmin($user, $tenantId)) {
            $this->access->scopeQuery($query, $user, 'finance', $tenantId, 'org_unit_id');
        }

        return response()->json($query->latest('occurred_at')->paginate(25));
    }

    public function storeExpense(StoreExpenseRequest $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $data = $request->validated();

        if (!$this->isGlobalAdmin($user, $tenantId)) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            $data['org_unit_id'] = $this->resolveOrgUnitId($data['org_unit_id'] ?? null, $user, $tenantId, $allowedIds);
        }

        return response()->json($this->service->createExpense($data), 201);
    }

    public function updateExpense(StoreExpenseRequest $request, Expense $expense): JsonResponse
    {
        $this->authorize('update', $expense);
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $data = $request->validated();

        if (!$this->isGlobalAdmin($user, $tenantId) && array_key_exists('org_unit_id', $data)) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            $data['org_unit_id'] = $this->resolveOrgUnitId($data['org_unit_id'], $user, $tenantId, $allowedIds);
        }

        return response()->json($this->service->updateExpense($expense, $data));
    }

    private function isGlobalAdmin($user, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }

    private function resolveOrgUnitId(?int $providedId, $user, int $tenantId, ?array $allowedIds): int
    {
        if ($allowedIds === null) {
            if ($providedId === null) {
                $firstLinked = OrgUnitUser::query()
                    ->where('user_id', $user->id)
                    ->where('tenant_id', $tenantId)
                    ->value('org_unit_id');
                return (int) $firstLinked;
            }
            return $providedId;
        }

        if (!in_array($providedId, $allowedIds, true)) {
            abort(403, 'Org unit não autorizada.');
        }
        return $providedId;
    }
}
