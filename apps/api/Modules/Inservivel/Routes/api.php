<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Inservivel\Http\Controllers\BemController;
use Modules\Inservivel\Http\Controllers\ConfiguracaoController;
use Modules\Inservivel\Http\Controllers\DashboardController;
use Modules\Inservivel\Http\Controllers\TransferenciaController;
use Modules\Inservivel\Http\Controllers\EntidadeController;
use Modules\Inservivel\Http\Controllers\ImportacaoController;
use Modules\Inservivel\Http\Controllers\LoteController;
use Modules\Inservivel\Http\Controllers\ParametroController;

/* Rotas internas do módulo Inservível — prefixo api/inservivel (auth:sanctum + tenant + module-access). */

Route::get('/dashboard', DashboardController::class);

// Parâmetros e opções dos formulários
Route::get('/opcoes', [ParametroController::class, 'opcoes']);
Route::post('/parametros/substituir', [ParametroController::class, 'substituir']);
Route::get('/parametros/{tipo}', [ParametroController::class, 'index']);
Route::post('/parametros/{tipo}', [ParametroController::class, 'store']);
Route::put('/parametros/{tipo}/{id}', [ParametroController::class, 'update'])->whereNumber('id');
Route::delete('/parametros/{tipo}/{id}', [ParametroController::class, 'destroy'])->whereNumber('id');

// Configurações
Route::get('/configuracoes', [ConfiguracaoController::class, 'show']);
Route::put('/configuracoes', [ConfiguracaoController::class, 'update']);
Route::post('/importacao', ImportacaoController::class);

// Bens (sem exclusão)
Route::get('/bens', [BemController::class, 'index']);
Route::post('/bens', [BemController::class, 'store']);
Route::get('/bens/{bem}', [BemController::class, 'show']);
Route::put('/bens/{bem}', [BemController::class, 'update']);
Route::post('/bens/{bem}/fotos', [BemController::class, 'adicionarFoto']);
Route::post('/bens/{bem}/fotos/{foto}/principal', [BemController::class, 'definirPrincipal']);
Route::delete('/bens/{bem}/fotos/{foto}', [BemController::class, 'removerFoto']);
Route::get('/bens/{bem}/fotos/{foto}', [BemController::class, 'foto']);

// Lotes
Route::get('/lotes', [LoteController::class, 'index']);
Route::post('/lotes', [LoteController::class, 'store']);
Route::get('/lotes/{lote}', [LoteController::class, 'show']);
Route::put('/lotes/{lote}', [LoteController::class, 'update']);
Route::delete('/lotes/{lote}', [LoteController::class, 'destroy']);
Route::post('/lotes/{lote}/bens', [LoteController::class, 'adicionarBens']);
Route::delete('/lotes/{lote}/bens/{bem}', [LoteController::class, 'retirarBem']);
Route::post('/lotes/{lote}/status', [LoteController::class, 'alterarStatus']);
Route::post('/lotes/{lote}/documentos', [LoteController::class, 'anexar']);
Route::get('/lotes/{lote}/documentos/{documento}', [LoteController::class, 'documento']);
Route::post('/lotes/{lote}/sorteio', [LoteController::class, 'sortear']);
Route::get('/lotes/{lote}/termos/{tipo}', [LoteController::class, 'termo']);

// Entidades sem fins lucrativos
Route::get('/entidades', [EntidadeController::class, 'index']);
Route::post('/entidades', [EntidadeController::class, 'store']);
Route::get('/entidades/{entidade}', [EntidadeController::class, 'show']);
Route::put('/entidades/{entidade}', [EntidadeController::class, 'update']);
Route::delete('/entidades/{entidade}', [EntidadeController::class, 'destroy']);
Route::post('/entidades/{entidade}/status', [EntidadeController::class, 'alterarStatus']);
Route::post('/entidades/{entidade}/senha', [EntidadeController::class, 'redefinirSenha']);
Route::put('/entidades/{entidade}/documentos/{documento}', [EntidadeController::class, 'analisarDocumento']);
Route::get('/entidades/{entidade}/documentos/{documento}', [EntidadeController::class, 'documento']);

// Transferência interna
Route::get('/transferencias', [TransferenciaController::class, 'index']);
Route::get('/transferencias/anunciaveis', [TransferenciaController::class, 'anunciaveis']);
Route::post('/transferencias', [TransferenciaController::class, 'store']);
Route::post('/transferencias/{transferencia}/solicitar', [TransferenciaController::class, 'solicitar']);
Route::post('/transferencias/{transferencia}/aprovar', [TransferenciaController::class, 'aprovar']);
Route::post('/transferencias/{transferencia}/recusar', [TransferenciaController::class, 'recusar']);
Route::post('/transferencias/{transferencia}/cancelar', [TransferenciaController::class, 'cancelar']);
Route::get('/transferencias/{transferencia}/termo', [TransferenciaController::class, 'termo']);
