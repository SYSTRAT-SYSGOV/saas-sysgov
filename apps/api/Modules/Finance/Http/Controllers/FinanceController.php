<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Services\ModuleAccessService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class FinanceController
{
    public function __construct(private readonly ModuleAccessService $access) {}

    public function summary(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user = $request->user();
        $isAdmin = $user->is_platform_admin || $user->isSupportAnalyst() || $user->hasRole('admin_tenant', $tenantId);

        $expensesQuery = DB::table('expenses')->where('tenant_id', $tenantId);
        $revenuesQuery = DB::table('revenues')->where('tenant_id', $tenantId);
        $invoicesQuery = DB::table('invoices')->where('tenant_id', $tenantId);
        $transfersQuery = DB::table('transfers')->where('tenant_id', $tenantId);

        if (!$isAdmin) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'finance', $tenantId);
            if ($allowedIds !== null) {
                $expensesQuery->whereIn('org_unit_id', $allowedIds);
                $revenuesQuery->whereIn('org_unit_id', $allowedIds);
                $invoicesQuery->whereIn('org_unit_id', $allowedIds);
                $transfersQuery->whereIn('org_unit_id', $allowedIds);
            } else {
                $expensesQuery->whereRaw('1 = 0');
                $revenuesQuery->whereRaw('1 = 0');
                $invoicesQuery->whereRaw('1 = 0');
                $transfersQuery->whereRaw('1 = 0');
            }
        }

        return response()->json([
            'tenant_id' => $tenantId,
            'revenues_cents' => (int) $revenuesQuery->sum('amount_cents'),
            'expenses_cents' => (int) $expensesQuery->sum('amount_cents'),
            'invoices_cents' => (int) $invoicesQuery->sum('amount_cents'),
            'transfers_cents' => (int) $transfersQuery->sum('amount_cents'),
            'pending_reconciliations' => DB::table('reconciliations')->where('tenant_id', $tenantId)->where('status', 'pending')->count(),
        ]);
    }
}
