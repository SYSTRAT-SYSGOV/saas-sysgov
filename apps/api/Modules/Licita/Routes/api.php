<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Licita\Http\Controllers\DfdController;
use Modules\Licita\Http\Controllers\ProcessoController;

Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:licita'])->prefix('api/licita')->group(function (): void {
    Route::get('/processos', [ProcessoController::class, 'index']);
    Route::post('/processos', [ProcessoController::class, 'store']);
    Route::get('/processos/{id}', [ProcessoController::class, 'show']);

    Route::post('/processos/{processoId}/dfd', [DfdController::class, 'store']);
    Route::get('/dfds/{id}', [DfdController::class, 'show']);
    Route::put('/dfds/{id}', [DfdController::class, 'update']);
    Route::post('/dfds/{id}/enviar-revisao', [DfdController::class, 'enviarRevisao']);
    Route::post('/dfds/{id}/aprovar', [DfdController::class, 'aprovar']);
    Route::post('/dfds/{id}/rejeitar', [DfdController::class, 'rejeitar']);
});
