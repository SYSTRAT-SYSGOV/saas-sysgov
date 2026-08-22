<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class MonitoringController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'generated_at' => now()->toISOString(),
            'database' => ['status' => 'ok'],
            'counts' => [
                'tenants_active' => DB::table('tenants')->where('status', 'active')->count(),
                'users' => DB::table('users')->count(),
                'modules_enabled' => DB::table('modules')->where('enabled', true)->count(),
                'contracts_active' => DB::table('contracts')->where('status', 'active')->count(),
            ],
            'outbox' => [
                'pending' => DB::table('outbox_events')->where('status', 'pending')->count(),
                'processing' => DB::table('outbox_events')->where('status', 'processing')->count(),
                'failed' => DB::table('outbox_events')->where('status', 'failed')->count(),
            ],
        ]);
    }
}
