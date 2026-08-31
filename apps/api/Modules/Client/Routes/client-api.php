<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Client\Http\Controllers\ClientNavigationController;
use Modules\Client\Http\Controllers\ClientGranularityController;

Route::prefix('api/client')
    ->middleware(['auth:sanctum', 'tenant', 'bindings', 'admin-tenant'])
    ->group(function (): void {
        Route::get('/menus', [ClientNavigationController::class, 'index']);
        Route::post('/menus/groups', [ClientNavigationController::class, 'storeGroup']);
        Route::put('/menus/groups/{group}', [ClientNavigationController::class, 'updateGroup']);
        Route::delete('/menus/groups/{group}', [ClientNavigationController::class, 'destroyGroup']);
        Route::post('/menus/items', [ClientNavigationController::class, 'storeItem']);
        Route::put('/menus/items/{item}', [ClientNavigationController::class, 'updateItem']);
        Route::delete('/menus/items/{item}', [ClientNavigationController::class, 'destroyItem']);
        Route::put('/menus/reorder', [ClientNavigationController::class, 'reorder']);
        Route::get('/modules', [ClientNavigationController::class, 'modules']);

        // Granularidade de módulos por unidade organizacional
        Route::get('/granularity/modules', [ClientGranularityController::class, 'modules']);
        Route::get('/granularity/{module}/units', [ClientGranularityController::class, 'units']);
        Route::put('/granularity/{module}/units/{orgUnit}', [ClientGranularityController::class, 'set']);
        Route::delete('/granularity/{module}/units/{orgUnit}', [ClientGranularityController::class, 'clear']);
    });
