<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\OrgChart\Http\Controllers\ClientOrgChartController;

Route::prefix('api/org-units')
    ->middleware(['auth:sanctum', 'tenant'])
    ->group(function (): void {
        Route::get('/scope', [ClientOrgChartController::class, 'scope']);
        Route::post('/export', [ClientOrgChartController::class, 'export']);
        Route::get('/', [ClientOrgChartController::class, 'index']);
        Route::post('/', [ClientOrgChartController::class, 'store']);
        Route::get('/{id}', [ClientOrgChartController::class, 'show']);
        Route::put('/{id}', [ClientOrgChartController::class, 'update']);
        Route::delete('/{id}', [ClientOrgChartController::class, 'destroy']);
        Route::post('/{id}/move', [ClientOrgChartController::class, 'move']);
        
        // Gestão de Vínculos de Usuários
        Route::post('/{id}/users', [ClientOrgChartController::class, 'linkUser']);
        Route::delete('/{id}/users/{userId}', [ClientOrgChartController::class, 'unlinkUser']);
        Route::post('/{id}/users/{userId}/primary', [ClientOrgChartController::class, 'setPrimaryUnit']);
    });
