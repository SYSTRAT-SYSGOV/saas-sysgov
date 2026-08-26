<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class MonitoringController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\Tenant::class);

        $queueSize = Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0;
        $failedJobs = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;

        return response()->json([
            'generated_at' => now()->toISOString(),
            'database' => ['status' => 'ok'],
            'counts' => [
                'tenants_active' => DB::table('tenants')->where('status', 'active')->count(),
                'tenants_total' => DB::table('tenants')->count(),
                'users' => DB::table('users')->count(),
                'modules_enabled' => Schema::hasTable('modules') ? DB::table('modules')->where('enabled', true)->count() : 0,
                'contracts_active' => Schema::hasTable('contracts') ? DB::table('contracts')->where('status', 'active')->count() : 0,
                'saas_contracts_active' => Schema::hasTable('saas_contracts') ? DB::table('saas_contracts')->where('status', 'active')->count() : 0,
                'saas_invoices_overdue' => Schema::hasTable('saas_invoices') ? DB::table('saas_invoices')->where('status', 'overdue')->count() : 0,
            ],
            'outbox' => [
                'pending' => DB::table('outbox_events')->where('status', 'pending')->count(),
                'processing' => DB::table('outbox_events')->where('status', 'processing')->count(),
                'failed' => DB::table('outbox_events')->where('status', 'failed')->count(),
            ],
            'queues' => [
                'size' => $queueSize,
                'failed' => $failedJobs,
            ],
        ]);
    }

    public function tenantUsage(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\Tenant::class);

        $rows = DB::table('tenants')
            ->leftJoin('tenant_user', 'tenant_user.tenant_id', '=', 'tenants.id')
            ->leftJoin('saas_contracts', 'saas_contracts.tenant_id', '=', 'tenants.id')
            ->leftJoin('audit_logs', 'audit_logs.tenant_id', '=', 'tenants.id')
            ->select(
                'tenants.id',
                'tenants.name',
                'tenants.status',
                DB::raw('COUNT(DISTINCT tenant_user.user_id) AS users_count'),
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

