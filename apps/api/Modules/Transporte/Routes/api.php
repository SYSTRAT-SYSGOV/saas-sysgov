<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Transporte\Http\Controllers\AlertaController;
use Modules\Transporte\Http\Controllers\AuditoriaController;
use Modules\Transporte\Http\Controllers\EmpresaController;
use Modules\Transporte\Http\Controllers\MotoristaController;
use Modules\Transporte\Http\Controllers\OpcoesController;
use Modules\Transporte\Http\Controllers\VeiculoController;
use Modules\Transporte\Http\Controllers\VistoriaController;

/* Rotas do módulo Transporte — prefixo api/transporte (auth:sanctum + tenant + module-access). */

Route::pattern('empresa', '[0-9]+');
Route::pattern('motorista', '[0-9]+');
Route::pattern('veiculo', '[0-9]+');

Route::get('/opcoes', OpcoesController::class);
Route::get('/alertas', AlertaController::class);
Route::get('/auditoria', AuditoriaController::class);

Route::get('/empresas', [EmpresaController::class, 'index']);
Route::post('/empresas', [EmpresaController::class, 'store']);
Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);
Route::delete('/empresas/{empresa}', [EmpresaController::class, 'destroy']);

Route::get('/motoristas', [MotoristaController::class, 'index']);
Route::post('/motoristas', [MotoristaController::class, 'store']);
Route::put('/motoristas/{motorista}', [MotoristaController::class, 'update']);
Route::delete('/motoristas/{motorista}', [MotoristaController::class, 'destroy']);

Route::get('/veiculos', [VeiculoController::class, 'index']);
Route::post('/veiculos', [VeiculoController::class, 'store']);
Route::put('/veiculos/{veiculo}', [VeiculoController::class, 'update']);
Route::delete('/veiculos/{veiculo}', [VeiculoController::class, 'destroy']);
Route::get('/veiculos/{veiculo}/vistorias', [VistoriaController::class, 'index']);
Route::post('/veiculos/{veiculo}/vistorias', [VistoriaController::class, 'store']);
