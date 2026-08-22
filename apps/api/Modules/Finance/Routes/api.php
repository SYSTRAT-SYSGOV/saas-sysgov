<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\FinanceController;

Route::middleware(['auth:sanctum', 'tenant'])->prefix('api/finance')->group(function (): void { Route::get('/summary', [FinanceController::class, 'summary']); });
