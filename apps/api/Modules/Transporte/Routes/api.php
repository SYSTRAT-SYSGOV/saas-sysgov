<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Transporte\Http\Controllers\AlertaController;
use Modules\Transporte\Http\Controllers\AlocacaoController;
use Modules\Transporte\Http\Controllers\AuditoriaController;
use Modules\Transporte\Http\Controllers\CensoController;
use Modules\Transporte\Http\Controllers\EmpresaController;
use Modules\Transporte\Http\Controllers\ItinerarioController;
use Modules\Transporte\Http\Controllers\MotoristaController;
use Modules\Transporte\Http\Controllers\ModeloExportacaoController;
use Modules\Transporte\Http\Controllers\OpcoesController;
use Modules\Transporte\Http\Controllers\PainelController;
use Modules\Transporte\Http\Controllers\ParadaController;
use Modules\Transporte\Http\Controllers\RotaController;
use Modules\Transporte\Http\Controllers\VeiculoController;
use Modules\Transporte\Http\Controllers\VistoriaController;

/* Rotas do módulo Transporte — prefixo api/transporte (auth:sanctum + tenant + module-access). */

Route::pattern('empresa', '[0-9]+');
Route::pattern('motorista', '[0-9]+');
Route::pattern('veiculo', '[0-9]+');
Route::pattern('parada', '[0-9]+');
Route::pattern('rota', '[0-9]+');
Route::pattern('alocacao', '[0-9]+');
Route::pattern('modelo', '[0-9]+');

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

Route::get('/paradas', [ParadaController::class, 'index']);
Route::post('/paradas', [ParadaController::class, 'store']);
Route::put('/paradas/{parada}', [ParadaController::class, 'update']);
Route::delete('/paradas/{parada}', [ParadaController::class, 'destroy']);

Route::get('/rotas', [RotaController::class, 'index']);
Route::post('/rotas', [RotaController::class, 'store']);
Route::get('/rotas/{rota}', [RotaController::class, 'show']);
Route::put('/rotas/{rota}', [RotaController::class, 'update']);
Route::delete('/rotas/{rota}', [RotaController::class, 'destroy']);

Route::get('/rotas/{rota}/itinerario', [ItinerarioController::class, 'index']);
Route::post('/rotas/{rota}/itinerario', [ItinerarioController::class, 'store']);
Route::put('/rotas/{rota}/itinerario', [ItinerarioController::class, 'reordenar']);
Route::put('/rotas/{rota}/itinerario/{parada}', [ItinerarioController::class, 'update']);
Route::delete('/rotas/{rota}/itinerario/{parada}', [ItinerarioController::class, 'destroy']);

Route::get('/rotas/{rota}/alunos', [AlocacaoController::class, 'index']);
Route::get('/rotas/{rota}/alunos/busca', [AlocacaoController::class, 'busca']);
Route::post('/rotas/{rota}/alunos', [AlocacaoController::class, 'store']);
Route::get('/rotas/{rota}/alunos/{alocacao}', [AlocacaoController::class, 'show']);
Route::put('/rotas/{rota}/alunos/{alocacao}', [AlocacaoController::class, 'update']);
Route::post('/rotas/{rota}/alunos/{alocacao}/encerrar', [AlocacaoController::class, 'encerrar']);

Route::get('/painel', PainelController::class);

Route::get('/censo/leiautes', [CensoController::class, 'leiautes']);
Route::post('/censo/pre-validacao', [CensoController::class, 'preValidar']);
Route::post('/censo/arquivo', [CensoController::class, 'arquivo']);
Route::post('/censo/conferencia', [CensoController::class, 'conferencia']);
Route::get('/censo/modelos', [ModeloExportacaoController::class, 'index']);
Route::post('/censo/modelos', [ModeloExportacaoController::class, 'store']);
Route::put('/censo/modelos/{modelo}', [ModeloExportacaoController::class, 'update']);
Route::delete('/censo/modelos/{modelo}', [ModeloExportacaoController::class, 'destroy']);
Route::get('/censo/modelos/{modelo}/aplicar', [ModeloExportacaoController::class, 'aplicar']);
