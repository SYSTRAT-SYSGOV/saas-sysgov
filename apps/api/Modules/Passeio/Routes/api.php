<?php

declare(strict_types=1);

/*
 * Rotas do módulo Passeio — registradas pelo RouteServiceProvider do módulo sob api/passeio com
 * auth:sanctum, tenant, bindings e module-access:passeio. Valores em centavos.
 */

use Illuminate\Support\Facades\Route;
use Modules\Passeio\Http\Controllers\FrotaController;
use Modules\Passeio\Http\Controllers\PasseioController;

Route::get('/indicadores', [PasseioController::class, 'indicadoresGerais']);

// Passeios
Route::get('/passeios', [PasseioController::class, 'index']);
Route::post('/passeios', [PasseioController::class, 'store']);
Route::get('/passeios/{passeio}', [PasseioController::class, 'show']);
Route::put('/passeios/{passeio}', [PasseioController::class, 'update']);
Route::delete('/passeios/{passeio}', [PasseioController::class, 'destroy']);
Route::get('/passeios/{passeio}/indicadores', [PasseioController::class, 'indicadores']);

// Inscrições e autorizações
Route::get('/passeios/{passeio}/inscricoes', [PasseioController::class, 'inscricoes']);
Route::post('/passeios/{passeio}/inscricoes', [PasseioController::class, 'inscrever']);
Route::put('/passeios/{passeio}/inscricoes/lote', [PasseioController::class, 'inscricoesEmLote']);
Route::put('/inscricoes/{inscricao}', [PasseioController::class, 'atualizarInscricao']);
Route::delete('/inscricoes/{inscricao}', [PasseioController::class, 'excluirInscricao']);

// Frota e mapa de assentos
Route::get('/passeios/{passeio}/veiculos', [FrotaController::class, 'index']);
Route::post('/passeios/{passeio}/veiculos', [FrotaController::class, 'store']);
Route::put('/veiculos/{veiculo}', [FrotaController::class, 'update']);
Route::delete('/veiculos/{veiculo}', [FrotaController::class, 'destroy']);
Route::get('/veiculos/{veiculo}/assentos', [FrotaController::class, 'assentos']);
Route::put('/veiculos/{veiculo}/assentos/{numero}', [FrotaController::class, 'ocupar'])->whereNumber('numero');
Route::delete('/veiculos/{veiculo}/assentos/{numero}', [FrotaController::class, 'liberar'])->whereNumber('numero');
