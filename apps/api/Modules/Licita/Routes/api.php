<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Licita\Http\Controllers\CampoConfiguracaoController;
use Modules\Licita\Http\Controllers\DfdController;
use Modules\Licita\Http\Controllers\DfdIaController;
use Modules\Licita\Http\Controllers\LegalDocumentoController;
use Modules\Licita\Http\Controllers\LicitaIaController;
use Modules\Licita\Http\Controllers\ProcessoController;

Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:licita'])->prefix('api/licita')->group(function (): void {
    Route::get('/processos', [ProcessoController::class, 'index']);
    Route::post('/processos', [ProcessoController::class, 'store']);
    Route::get('/processos/{id}', [ProcessoController::class, 'show']);

    Route::post('/processos/{processoId}/dfd', [DfdController::class, 'store']);
    // Antes de '/dfds/{id}': "ia" não é um id numérico, mas fica explícito aqui
    // para não depender de precedência de rota caso isso mude no futuro.
    Route::post('/dfds/ia/sugerir-justificativa', [DfdIaController::class, 'sugerirJustificativa']);
    // Genérico: usado por QUALQUER campo de texto rico (TinyMCE) do Licita
    // que não tenha um prompt dedicado — ver RichTextEditorWithIa no front.
    Route::post('/ia/sugerir-texto', [LicitaIaController::class, 'sugerirTexto']);
    Route::get('/dfds/{id}', [DfdController::class, 'show']);
    Route::put('/dfds/{id}', [DfdController::class, 'update']);
    Route::post('/dfds/{id}/reabrir', [DfdController::class, 'reabrir']);
    Route::post('/dfds/{id}/enviar-revisao', [DfdController::class, 'enviarRevisao']);
    Route::post('/dfds/{id}/aprovar', [DfdController::class, 'aprovar']);
    Route::post('/dfds/{id}/rejeitar', [DfdController::class, 'rejeitar']);

    Route::get('/legislacao', [LegalDocumentoController::class, 'index']);
    Route::post('/legislacao', [LegalDocumentoController::class, 'store']);
    Route::get('/legislacao/{id}', [LegalDocumentoController::class, 'show']);
    Route::put('/legislacao/{id}', [LegalDocumentoController::class, 'update']);
    Route::delete('/legislacao/{id}', [LegalDocumentoController::class, 'destroy']);

    Route::get('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'show']);
    Route::put('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'update']);
});
