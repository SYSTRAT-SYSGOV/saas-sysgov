<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class MonitoringController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\Tenant::class);

        return response()->json([
            'generated_at' => now()->toISOString(),
            'database' => ['status' => 'ok'],
            'counts' => [
                'tenants_active' => DB::table('tenants')->where('status', 'active')->count(),
                'tenants_total' => DB::table('tenants')->count(),
                'users' => DB::table('users')->count(),
                'modules_enabled' => DB::table('modules')->where('enabled', true)->count(),
                'contracts_active' => DB::table('contracts')->where('status', 'active')->count(),
                'saas_contracts_active' => DB::table('saas_contracts')->where('status', 'active')->count(),
                'saas_invoices_overdue' => DB::table('saas_invoices')->where('status', 'overdue')->count(),
            ],
            'outbox' => [
                'pending' => DB::table('outbox_events')->where('status', 'pending')->count(),
                'processing' => DB::table('outbox_events')->where('status', 'processing')->count(),
                'failed' => DB::table('outbox_events')->where('status', 'failed')->count(),
            ],
            'queues' => [
                'size' => DB::table('jobs')->count(),
                'failed' => DB::table('failed_jobs')->count(),
            ],
        ]);
    }

    public function tenantUsage(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\Tenant::class);

        $rows = DB::table('tenants')
            ->leftJoin('users', 'users.tenant_id', '=', 'tenants.id')
            ->leftJoin('saas_contracts', 'saas_contracts.tenant_id', '=', 'tenants.id')
            ->leftJoin('audit_logs', 'audit_logs.tenant_id', '=', 'tenants.id')
            ->select(
                'tenants.id',
                'tenants.name',
                'tenants.status',
                DB::raw('COUNT(DISTINCT users.id) AS users_count'),
                DB::raw('COUNT(DISTINCT saas_contracts.id) AS contracts_count'),
                DB::raw('COUNT(DISTINCT audit_logs.id) AS audit_events_count')
            )
            ->groupBy('tenants.id', 'tenants.name', 'tenants.status')
            ->orderByDesc('audit_events_count')
            ->limit(50)
            ->get();

        return response()->json($rows);
    }
}

