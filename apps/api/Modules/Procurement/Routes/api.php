<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Procurement\Http\Controllers\LicitacaoArtefatosController;
use Modules\Procurement\Http\Controllers\LicitacaoContratosController;
use Modules\Procurement\Http\Controllers\LicitacaoController;
use Modules\Procurement\Http\Controllers\LicitacaoLancesController;
use Modules\Procurement\Http\Controllers\LicitacaoLifecycleController;
use Modules\Procurement\Http\Controllers\LicitacaoPrecosController;

Route::prefix('api/licitacoes')
    ->middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:procurement'])
    ->group(function (): void {
        // CRUD Principal & Exportação
        Route::get('/export', [LicitacaoController::class, 'export']);
        Route::get('/', [LicitacaoController::class, 'index']);
        Route::post('/', [LicitacaoController::class, 'store']);
        Route::get('/{id}', [LicitacaoController::class, 'show']);
        Route::put('/{id}', [LicitacaoController::class, 'update']);
        Route::delete('/{id}', [LicitacaoController::class, 'destroy']);

        // Ciclo de Vida e Transições
        Route::post('/{id}/publicar', [LicitacaoLifecycleController::class, 'publicar']);
        Route::post('/{id}/iniciar-disputa', [LicitacaoLifecycleController::class, 'iniciarDisputa']);
        Route::post('/{id}/adjudicar', [LicitacaoLifecycleController::class, 'adjudicar']);
        Route::post('/{id}/homologar', [LicitacaoLifecycleController::class, 'homologar']);
        Route::post('/{id}/cancelar', [LicitacaoLifecycleController::class, 'cancelar']);

        // Artefatos da Fase Interna (DFD, ETP, Matriz de Riscos, TR)
        Route::post('/{id}/artefatos', [LicitacaoArtefatosController::class, 'store']);
        Route::post('/{id}/artefatos/{tipo}/enviar-analise', [LicitacaoArtefatosController::class, 'enviarParaAnalise']);
        Route::post('/{id}/artefatos/{tipo}/aprovar', [LicitacaoArtefatosController::class, 'aprovar']);
        Route::post('/{id}/artefatos/{tipo}/reprovar', [LicitacaoArtefatosController::class, 'reprovar']);

        // Pesquisa de Mercado e Preços (RN-004)
        Route::get('/{id}/precos', [LicitacaoPrecosController::class, 'index']);
        Route::post('/{id}/precos', [LicitacaoPrecosController::class, 'store']);
        Route::delete('/{id}/precos/{precoId}', [LicitacaoPrecosController::class, 'destroy']);

        // Participantes & Sala de Lances (RN-013)
        Route::get('/{id}/participantes', [LicitacaoLancesController::class, 'participantes']);
        Route::post('/{id}/participantes', [LicitacaoLancesController::class, 'credenciarParticipante']);
        Route::get('/{id}/lances', [LicitacaoLancesController::class, 'index']);
        Route::post('/{id}/lances', [LicitacaoLancesController::class, 'store']);
    });

// Rotas de Gestão Contratual Pós-Licitação
Route::prefix('api/contratos-licitacao')
    ->middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:procurement'])
    ->group(function (): void {
        Route::get('/', [LicitacaoContratosController::class, 'index']);
        Route::post('/', [LicitacaoContratosController::class, 'store']);
        Route::get('/{id}', [LicitacaoContratosController::class, 'show']);
        Route::post('/{id}/aditivos', [LicitacaoContratosController::class, 'storeAditivo']);
        Route::post('/{id}/medicoes', [LicitacaoContratosController::class, 'storeMedicao']);
        Route::post('/{id}/pagamentos', [LicitacaoContratosController::class, 'storePagamento']);
    });
