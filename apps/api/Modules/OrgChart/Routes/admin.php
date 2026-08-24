<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\OrgChart\Http\Controllers\AdminOrgChartController;

Route::prefix('admin/tenants/{tenant}/org-units')
    ->middleware(['auth:sanctum', 'platform-admin'])
    ->group(function (): void {
        Route::post('/seed', [AdminOrgChartController::class, 'seed']);
        Route::get('/', [AdminOrgChartController::class, 'index']);
    });
