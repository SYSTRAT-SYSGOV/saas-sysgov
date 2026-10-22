<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Protocolo\Http\Controllers\AtributoController;
use Modules\Protocolo\Http\Controllers\DashboardController;
use Modules\Protocolo\Http\Controllers\DocumentoController;
use Modules\Protocolo\Http\Controllers\ProcessoController;
use Modules\Protocolo\Http\Controllers\TipoTramitacaoController;
use Modules\Protocolo\Http\Controllers\TramitacaoController;
use Modules\Protocolo\Http\Controllers\VinculoController;

/*
|--------------------------------------------------------------------------
| Rotas do Módulo Protocolo
|--------------------------------------------------------------------------
|
| Prefixado com 'api/protocolo' via RouteServiceProvider
| Protegido por ['api', 'auth:sanctum', 'resolve.tenant']
|
*/

// Rota de promoção de requerimento (antes do wildcard {processo})
Route::post('processos/promover-requerimento', [VinculoController::class, 'promoverRequerimento'])
    ->name('protocolo.processos.promover-requerimento');

// Consulta reversa de vínculos por entidade
Route::get('vinculos', [VinculoController::class, 'consultaReversa'])
    ->name('protocolo.vinculos.consulta-reversa');

Route::prefix('processos')->group(function (): void {
    // Exportação e consulta pública (antes dos wildcards)
    Route::get('/export', [ProcessoController::class, 'export'])->name('protocolo.processos.export');
    Route::get('/consulta-publica', [ProcessoController::class, 'rastrearPublico'])
        ->withoutMiddleware(['auth:sanctum'])
        ->name('protocolo.processos.consulta-publica');

    Route::get('/', [ProcessoController::class, 'index'])->name('protocolo.processos.index');
    Route::post('/', [ProcessoController::class, 'store'])->name('protocolo.processos.store');
    Route::get('/{processo}', [ProcessoController::class, 'show'])->name('protocolo.processos.show');
    Route::put('/{processo}', [ProcessoController::class, 'update'])->name('protocolo.processos.update');
    Route::delete('/{processo}', [ProcessoController::class, 'destroy'])->name('protocolo.processos.destroy');
    Route::get('/{processo}/filhos', [ProcessoController::class, 'filhos'])->name('protocolo.processos.filhos');

    // Ações de ciclo de vida
    Route::post('/{processo}/concluir', [ProcessoController::class, 'concluir'])->name('protocolo.processos.concluir');
    Route::post('/{processo}/arquivar', [ProcessoController::class, 'arquivar'])->name('protocolo.processos.arquivar');
    Route::post('/{processo}/desarquivar', [ProcessoController::class, 'desarquivar'])->name('protocolo.processos.desarquivar');
    Route::post('/{processo}/reabrir', [ProcessoController::class, 'reabrir'])->name('protocolo.processos.reabrir');

    // Andamentos, tramitação, localização e tempo de permanência
    Route::get('/{processo}/andamentos', [TramitacaoController::class, 'index'])->name('protocolo.processos.andamentos.index');
    Route::post('/{processo}/andamentos', [TramitacaoController::class, 'store'])->name('protocolo.processos.andamentos.store');
    Route::post('/{processo}/andamentos/atual/receber', [TramitacaoController::class, 'receber'])->name('protocolo.processos.andamentos.receber');
    Route::get('/{processo}/localizacao', [TramitacaoController::class, 'localizacao'])->name('protocolo.processos.localizacao');
    Route::get('/{processo}/permanencia', [TramitacaoController::class, 'permanencia'])->name('protocolo.processos.permanencia');

    // Documentos do processo
    Route::get('/{processo}/documentos', [DocumentoController::class, 'index'])->name('protocolo.processos.documentos.index');
    Route::post('/{processo}/documentos', [DocumentoController::class, 'store'])->name('protocolo.processos.documentos.store');
    Route::delete('/{processo}/documentos/{documento}', [DocumentoController::class, 'destroy'])->name('protocolo.processos.documentos.destroy');

    // Atributos dinâmicos do processo
    Route::get('/{processo}/atributos', [AtributoController::class, 'index'])->name('protocolo.processos.atributos.index');
    Route::post('/{processo}/atributos', [AtributoController::class, 'store'])->name('protocolo.processos.atributos.store');
    Route::delete('/{processo}/atributos/{chave}', [AtributoController::class, 'destroy'])->name('protocolo.processos.atributos.destroy');

    // Vínculos polimórficos do processo
    Route::get('/{processo}/vinculos', [VinculoController::class, 'index'])->name('protocolo.processos.vinculos.index');
    Route::post('/{processo}/vinculos', [VinculoController::class, 'store'])->name('protocolo.processos.vinculos.store');
    Route::delete('/{processo}/vinculos/{vinculo}', [VinculoController::class, 'destroy'])->name('protocolo.processos.vinculos.destroy');
});

// Download de documento com verificação de integridade
Route::get('documentos/{documento}/download', [DocumentoController::class, 'download'])->name('protocolo.documentos.download');

// Prazos excedidos
Route::get('prazos/excedidos', [TramitacaoController::class, 'prazosExcedidos'])->name('protocolo.prazos.excedidos');

// Dashboard de indicadores
Route::get('dashboard', [DashboardController::class, 'index'])->name('protocolo.dashboard');

// Tipos de tramitação
Route::apiResource('tipos-tramitacao', TipoTramitacaoController::class)
    ->parameters(['tipos-tramitacao' => 'tipoTramitacao'])
    ->names('protocolo.tipos-tramitacao');