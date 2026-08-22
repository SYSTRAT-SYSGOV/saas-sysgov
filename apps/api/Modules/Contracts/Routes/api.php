<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'tenant'])->prefix('api/contracts')->group(function (): void {
    Route::get('/', [\Modules\Contracts\Http\Controllers\ContractController::class, 'index']);
    Route::post('/', [\Modules\Contracts\Http\Controllers\ContractController::class, 'store']);
    Route::put('/{contract}', [\Modules\Contracts\Http\Controllers\ContractController::class, 'update']);
});
