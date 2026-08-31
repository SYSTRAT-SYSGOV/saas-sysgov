<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\AccountingController;
use Modules\Finance\Http\Controllers\BudgetExecutionController;
use Modules\Finance\Http\Controllers\FinanceController;
use Modules\Finance\Http\Controllers\FinanceEntryController;

Route::middleware(['auth:sanctum', 'resolve.tenant', 'bindings', 'module-access:finance'])->prefix('api/finance')->group(function (): void {
    // 1. Resumo e Entradas Fiscais
    Route::get('/summary', [FinanceController::class, 'summary']);
    Route::get('/revenues', [FinanceEntryController::class, 'indexRevenues']);
    Route::post('/revenues', [FinanceEntryController::class, 'storeRevenue']);
    Route::put('/revenues/{revenue}', [FinanceEntryController::class, 'updateRevenue']);
    Route::get('/expenses', [FinanceEntryController::class, 'indexExpenses']);
    Route::post('/expenses', [FinanceEntryController::class, 'storeExpense']);
    Route::put('/expenses/{expense}', [FinanceEntryController::class, 'updateExpense']);

    // 2. Contabilidade Pública (PCASP & Partidas Dobradas)
    Route::prefix('accounting')->group(function (): void {
        Route::get('/chart-of-accounts', [AccountingController::class, 'chartOfAccounts']);
        Route::get('/entries', [AccountingController::class, 'entries']);
        Route::post('/entries', [AccountingController::class, 'storeEntry']);
        Route::get('/trial-balance', [AccountingController::class, 'trialBalance']);
    });

    // 3. Execução Orçamentária (Empenho, Liquidação, Pagamento)
    Route::prefix('budget')->group(function (): void {
        Route::get('/summary', [BudgetExecutionController::class, 'budgetSummary']);
        Route::get('/commitments', [BudgetExecutionController::class, 'commitments']);
        Route::post('/commitments', [BudgetExecutionController::class, 'storeCommitment']);
        Route::get('/commitments/{id}', [BudgetExecutionController::class, 'showCommitment']);
        Route::post('/commitments/{commitmentId}/settlements', [BudgetExecutionController::class, 'storeSettlement']);
        Route::post('/settlements/{settlementId}/payments', [BudgetExecutionController::class, 'storePayment']);
    });
});
