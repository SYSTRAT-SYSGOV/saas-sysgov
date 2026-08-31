<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\ModuleAccessService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Models\BudgetCommitment;
use Modules\Finance\Models\BudgetSettlement;
use Modules\Finance\Services\BudgetExecutionService;
use Modules\OrgChart\Models\OrgUnitUser;

final class BudgetExecutionController extends Controller
{
    public function __construct(
        private readonly BudgetExecutionService $budgetService,
        private readonly ModuleAccessService $access,
    ) {}

    public function commitments(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $query = BudgetCommitment::query();

        if (!$isAdmin) {
            $this->access->scopeQuery($query, $user, 'finance', $tenantId, 'org_unit_id');
        }

        $commitments = $query
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), fn ($q, $term) => $q->where(function ($sub) use ($term) {
                $sub->where('commitment_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            }))
            ->latest('commitment_date')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($commitments);
    }

    public function storeCommitment(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $validated = $request->validate([
            'org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'commitment_date' => ['required', 'date'],
            'supplier_name' => ['required', 'string', 'max:255'],
            'supplier_cnpj' => ['nullable', 'string', 'max:18'],
            'expense_nature' => ['required', 'string', 'max:20'],
            'function_code' => ['nullable', 'string', 'max:10'],
            'description' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:1'],
        ]);

        if (!$isAdmin) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            $validated['org_unit_id'] = $this->resolveOrgUnitId($validated['org_unit_id'] ?? null, $user, $tenantId, $allowedIds);
        }

        $commitment = $this->budgetService->createCommitment($validated);
        return response()->json($commitment, 201);
    }

    public function showCommitment(int $id): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = request()->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $commitment = BudgetCommitment::with(['settlements.payments'])->findOrFail($id);

        if (!$isAdmin) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            if ($allowedIds !== null && !in_array($commitment->org_unit_id, $allowedIds, true)) {
                abort(403);
            }
        }

        return response()->json($commitment);
    }

    public function storeSettlement(Request $request, int $commitmentId): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $commitment = BudgetCommitment::findOrFail($commitmentId);

        if (!$isAdmin) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            if ($allowedIds !== null && !in_array($commitment->org_unit_id, $allowedIds, true)) {
                abort(403);
            }
        }

        $validated = $request->validate([
            'settlement_date' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'amount_cents' => ['required', 'integer', 'min:1'],
        ]);

        $settlement = $this->budgetService->createSettlement($commitment, $validated);
        return response()->json($settlement, 201);
    }

    public function storePayment(Request $request, int $settlementId): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $settlement = BudgetSettlement::with('commitment')->findOrFail($settlementId);

        if (!$isAdmin) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            if ($allowedIds !== null && !in_array($settlement->org_unit_id, $allowedIds, true)) {
                abort(403);
            }
        }

        $validated = $request->validate([
            'payment_date' => ['required', 'date'],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'bank_account' => ['nullable', 'string', 'max:50'],
        ]);

        $payment = $this->budgetService->createPayment($settlement, $validated);
        return response()->json($payment, 201);
    }

    public function budgetSummary(): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = request()->user();
        $isAdmin = $this->isGlobalAdmin($user, $tenantId);

        $query = BudgetCommitment::query();

        if (!$isAdmin) {
            $this->access->scopeQuery($query, $user, 'finance', $tenantId, 'org_unit_id');
        }

        $totalCommittedCents = (int) (clone $query)->sum('amount_cents');
        $totalSettledCents = (int) (clone $query)->sum('settled_amount_cents');
        $totalPaidCents = (int) (clone $query)->sum('paid_amount_cents');
        $restosAPagarCents = max(0, $totalCommittedCents - $totalPaidCents);

        return response()->json([
            'total_committed_cents' => $totalCommittedCents,
            'total_settled_cents' => $totalSettledCents,
            'total_paid_cents' => $totalPaidCents,
            'restos_a_pagar_cents' => $restosAPagarCents,
            'execution_rate_percent' => $totalCommittedCents > 0
                ? round(($totalPaidCents / $totalCommittedCents) * 100, 2)
                : 0,
        ]);
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
