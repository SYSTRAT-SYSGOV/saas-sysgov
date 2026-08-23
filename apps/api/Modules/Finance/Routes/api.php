<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\FinanceController;
use Modules\Finance\Http\Controllers\FinanceEntryController;

Route::middleware(['auth:sanctum', 'tenant'])->prefix('api/finance')->group(function (): void {
    Route::get('/summary', [FinanceController::class, 'summary']);
    Route::get('/revenues', [FinanceEntryController::class, 'indexRevenues']);
    Route::post('/revenues', [FinanceEntryController::class, 'storeRevenue']);
    Route::put('/revenues/{revenue}', [FinanceEntryController::class, 'updateRevenue']);
    Route::get('/expenses', [FinanceEntryController::class, 'indexExpenses']);
    Route::post('/expenses', [FinanceEntryController::class, 'storeExpense']);
    Route::put('/expenses/{expense}', [FinanceEntryController::class, 'updateExpense']);
});
