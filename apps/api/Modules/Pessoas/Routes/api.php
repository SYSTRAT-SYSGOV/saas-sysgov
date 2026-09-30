<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Pessoas\Http\Controllers\ImportacaoController;
use Modules\Pessoas\Http\Controllers\PessoaController;
use Modules\Pessoas\Http\Controllers\PromocaoController;

/* Rotas do painel — api/pessoas, com auth:sanctum + resolve.tenant + module-access:pessoas. */

Route::pattern('pessoa', '[0-9]+');
Route::pattern('vinculo', '[0-9]+');

Route::get('/', [PessoaController::class, 'index']);
Route::get('/export', [PessoaController::class, 'export']);
Route::post('/', [PessoaController::class, 'store']);
Route::get('/{pessoa}', [PessoaController::class, 'show']);
Route::put('/{pessoa}', [PessoaController::class, 'update']);
Route::delete('/{pessoa}', [PessoaController::class, 'destroy']);

Route::post('/{pessoa}/vinculos', [PessoaController::class, 'storeVinculo']);
Route::post('/{pessoa}/vinculos/{vinculo}/encerrar', [PessoaController::class, 'encerrarVinculo']);
Route::post('/{pessoa}/documentos', [PessoaController::class, 'storeDocumento']);
Route::post('/{pessoa}/enderecos', [PessoaController::class, 'storeEndereco']);
Route::post('/{pessoa}/contatos', [PessoaController::class, 'storeContato']);

Route::post('/{pessoa}/promover', [PromocaoController::class, 'promover']);

Route::post('/importacoes', [ImportacaoController::class, 'importar']);
