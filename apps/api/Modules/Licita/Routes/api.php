<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Licita\Http\Controllers\CampoConfiguracaoController;
use Modules\Licita\Http\Controllers\DfdController;
use Modules\Licita\Http\Controllers\DfdIaController;
use Modules\Licita\Http\Controllers\AprovacaoFinalController;
use Modules\Licita\Http\Controllers\EditalController;
use Modules\Licita\Http\Controllers\EtpController;
use Modules\Licita\Http\Controllers\LegalDocumentoController;
use Modules\Licita\Http\Controllers\LicitaIaController;
use Modules\Licita\Http\Controllers\MapaRiscoController;
use Modules\Licita\Http\Controllers\MapaRiscoIaController;
use Modules\Licita\Http\Controllers\PesquisaPrecoController;
use Modules\Licita\Http\Controllers\PesquisaPrecoIaController;
use Modules\Licita\Http\Controllers\ProcessoController;
use Modules\Licita\Http\Controllers\TrController;

Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:licita'])->prefix('api/licita')->group(function (): void {
    Route::get('/processos', [ProcessoController::class, 'index']);
    Route::post('/processos', [ProcessoController::class, 'store']);
    Route::get('/processos/{id}', [ProcessoController::class, 'show']);

    Route::post('/processos/{processoId}/dfd', [DfdController::class, 'store']);
    // Antes de '/dfds/{id}': "ia" não é um id numérico, mas fica explícito aqui
    // para não depender de precedência de rota caso isso mude no futuro.
    Route::post('/dfds/ia/sugerir-justificativa', [DfdIaController::class, 'sugerirJustificativa']);
    Route::post('/dfds/ia/sugerir-itens', [DfdIaController::class, 'sugerirItens']);
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

    Route::post('/processos/{processoId}/mapa-riscos', [MapaRiscoController::class, 'store']);
    // Antes de '/mapas-riscos/{id}': "ia" não é um id numérico, mas fica
    // explícito aqui para não depender de precedência de rota (mesmo
    // padrão de '/dfds/ia/sugerir-justificativa').
    Route::post('/processos/{processoId}/mapa-riscos/ia/sugerir-riscos', [MapaRiscoIaController::class, 'sugerirRiscos']);
    Route::get('/mapas-riscos/{id}', [MapaRiscoController::class, 'show']);
    Route::put('/mapas-riscos/{id}', [MapaRiscoController::class, 'update']);

    Route::post('/processos/{processoId}/pesquisas-precos', [PesquisaPrecoController::class, 'store']);
    // Antes de '/pesquisas-precos/{id}': mesmo cuidado de precedência de
    // rota do '/mapa-riscos/ia/...' acima.
    Route::post('/processos/{processoId}/pesquisas-precos/ia/sugerir-cotacoes', [PesquisaPrecoIaController::class, 'sugerirCotacoes']);
    Route::get('/pesquisas-precos/{id}', [PesquisaPrecoController::class, 'show']);
    Route::put('/pesquisas-precos/{id}', [PesquisaPrecoController::class, 'update']);

    Route::post('/processos/{processoId}/tr', [TrController::class, 'store']);
    Route::get('/trs/{id}', [TrController::class, 'show']);
    Route::put('/trs/{id}', [TrController::class, 'update']);

    Route::post('/processos/{processoId}/edital', [EditalController::class, 'store']);
    Route::get('/editais/{id}', [EditalController::class, 'show']);
    Route::put('/editais/{id}', [EditalController::class, 'update']);

    Route::post('/processos/{id}/aprovacao-final/solicitar', [AprovacaoFinalController::class, 'solicitar']);
    Route::post('/processos/{id}/aprovacao-final/aprovar', [AprovacaoFinalController::class, 'aprovar']);
    Route::post('/processos/{id}/aprovacao-final/rejeitar', [AprovacaoFinalController::class, 'rejeitar']);

    Route::get('/legislacao', [LegalDocumentoController::class, 'index']);
    Route::post('/legislacao', [LegalDocumentoController::class, 'store']);
    Route::get('/legislacao/{id}', [LegalDocumentoController::class, 'show']);
    Route::put('/legislacao/{id}', [LegalDocumentoController::class, 'update']);
    Route::delete('/legislacao/{id}', [LegalDocumentoController::class, 'destroy']);

    Route::get('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'show']);
    Route::put('/campos-configuracao/{tipoDocumento}', [CampoConfiguracaoController::class, 'update']);
});
