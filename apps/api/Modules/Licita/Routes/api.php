<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Licita\Http\Controllers\CampoConfiguracaoController;
use Modules\Licita\Http\Controllers\DfdController;
use Modules\Licita\Http\Controllers\DfdIaController;
use Modules\Licita\Http\Controllers\EtpController;
use Modules\Licita\Http\Controllers\LegalDocumentoController;
use Modules\Licita\Http\Controllers\LicitaIaController;
use Modules\Licita\Http\Controllers\MapaRiscoController;
use Modules\Licita\Http\Controllers\PesquisaPrecoController;
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
    Route::put('/dfds/{id}/equipe-planejamento', [DfdController::class, 'alterarEquipePlanejamento']);

    Route::post('/processos/{processoId}/etp', [EtpController::class, 'store']);
    Route::get('/etps/{id}', [EtpController::class, 'show']);
    Route::put('/etps/{id}', [EtpController::class, 'update']);
    Route::post('/etps/{id}/reabrir', [EtpController::class, 'reabrir']);
    Route::post('/etps/{id}/enviar-revisao', [EtpController::class, 'enviarRevisao']);
    Route::post('/etps/{id}/aprovar', [EtpController::class, 'aprovar']);
    Route::post('/etps/{id}/rejeitar', [EtpController::class, 'rejeitar']);

    Route::post('/processos/{processoId}/mapa-riscos', [MapaRiscoController::class, 'store']);
    Route::get('/mapas-riscos/{id}', [MapaRiscoController::class, 'show']);
    Route::put('/mapas-riscos/{id}', [MapaRiscoController::class, 'update']);
    Route::post('/mapas-riscos/{id}/reabrir', [MapaRiscoController::class, 'reabrir']);
    Route::post('/mapas-riscos/{id}/enviar-revisao', [MapaRiscoController::class, 'enviarRevisao']);
    Route::post('/mapas-riscos/{id}/aprovar', [MapaRiscoController::class, 'aprovar']);
    Route::post('/mapas-riscos/{id}/rejeitar', [MapaRiscoController::class, 'rejeitar']);

    Route::post('/processos/{processoId}/pesquisas-precos', [PesquisaPrecoController::class, 'store']);
    Route::get('/pesquisas-precos/{id}', [PesquisaPrecoController::class, 'show']);
    Route::put('/pesquisas-precos/{id}', [PesquisaPrecoController::class, 'update']);
    Route::post('/pesquisas-precos/{id}/reabrir', [PesquisaPrecoController::class, 'reabrir']);
    Route::post('/pesquisas-precos/{id}/enviar-revisao', [PesquisaPrecoController::class, 'enviarRevisao']);
    Route::post('/pesquisas-precos/{id}/aprovar', [PesquisaPrecoController::class, 'aprovar']);
    Route::post('/pesquisas-precos/{id}/rejeitar', [PesquisaPrecoController::class, 'rejeitar']);

    Route::get('/legislacao', [LegalDocumentoController::class, 'index']);
    Route::post('/legislacao', [LegalDocumentoController::class, 'store']);
    Route::get('/legislacao/{id}', [LegalDocumentoController::class, 'show']);
    Route::put('/legislacao/{id}', [LegalDocumentoController::class, 'update']);
    Route::delete('/legislacao/{id}', [LegalDocumentoController::class, 'destroy']);

    Route::get('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'show']);
    Route::put('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'update']);
});
