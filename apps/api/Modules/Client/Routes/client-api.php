<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Client\Http\Controllers\ClientNavigationController;

Route::prefix('api/client')
    ->middleware(['auth:sanctum', 'tenant', 'bindings'])
    ->group(function (): void {
        Route::get('/menus', [ClientNavigationController::class, 'index']);
        Route::post('/menus/groups', [ClientNavigationController::class, 'storeGroup']);
        Route::put('/menus/groups/{group}', [ClientNavigationController::class, 'updateGroup']);
        Route::delete('/menus/groups/{group}', [ClientNavigationController::class, 'destroyGroup']);
        Route::post('/menus/items', [ClientNavigationController::class, 'storeItem']);
        Route::put('/menus/items/{item}', [ClientNavigationController::class, 'updateItem']);
        Route::delete('/menus/items/{item}', [ClientNavigationController::class, 'destroyItem']);
    });
