<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class FinanceController
{
    public function summary(): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $sum = static fn (string $table): int => (int) DB::table($table)->where('tenant_id', $tenantId)->sum('amount_cents');
        return response()->json(['tenant_id' => $tenantId, 'revenues_cents' => $sum('revenues'), 'expenses_cents' => $sum('expenses'), 'invoices_cents' => $sum('invoices'), 'transfers_cents' => $sum('transfers'), 'pending_reconciliations' => DB::table('reconciliations')->where('tenant_id', $tenantId)->where('status', 'pending')->count()]);
    }
}
