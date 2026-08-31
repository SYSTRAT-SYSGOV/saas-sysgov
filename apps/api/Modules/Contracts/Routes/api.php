<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Contracts\Http\Controllers\ContractController;
use Modules\Contracts\Http\Controllers\SupportTicketController;

Route::middleware(['auth:sanctum', 'resolve.tenant', 'bindings', 'module-access:contracts'])->prefix('api/contracts')->group(function (): void {
    // KPIs & Lista
    Route::get('/kpis', [ContractController::class, 'summaryKPIs']);
    Route::get('/', [ContractController::class, 'index']);
    Route::post('/', [ContractController::class, 'store']);
    Route::get('/{id}', [ContractController::class, 'show']);
    Route::put('/{id}', [ContractController::class, 'update']);
    Route::post('/{id}/addenda', [ContractController::class, 'addAddendum']);
    Route::patch('/{id}/status', [ContractController::class, 'changeStatus']);

    // Suporte & Helpdesk
    Route::prefix('tickets')->group(function (): void {
        Route::get('/', [SupportTicketController::class, 'index']);
        Route::post('/', [SupportTicketController::class, 'store']);
        Route::get('/{id}', [SupportTicketController::class, 'show']);
        Route::post('/{id}/messages', [SupportTicketController::class, 'addMessage']);
        Route::patch('/{id}/resolve', [SupportTicketController::class, 'resolve']);
    });
});
