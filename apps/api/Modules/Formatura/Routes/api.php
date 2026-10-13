<?php

declare(strict_types=1);

/*
 * Rotas do módulo Formatura — registradas pelo RouteServiceProvider do módulo sob api/formatura com
 * auth:sanctum, tenant, bindings e module-access:formatura. Todos os valores monetários em centavos.
 * O ano letivo vem em ?ano_letivo (padrão: ano atual) ou no corpo.
 */

use Illuminate\Support\Facades\Route;
use Modules\Formatura\Http\Controllers\FormaturaController;

Route::get('/configuracao', [FormaturaController::class, 'configuracao']);
Route::put('/configuracao', [FormaturaController::class, 'salvarConfiguracao']);

Route::get('/formandos', [FormaturaController::class, 'formandos']);
Route::put('/formandos/participacao-em-lote', [FormaturaController::class, 'participacaoEmLote']);
Route::put('/formandos/{aluno}', [FormaturaController::class, 'salvarParticipacao']);
Route::get('/formandos/{aluno}/pagamentos', [FormaturaController::class, 'pagamentosDoFormando']);

Route::get('/pagamentos', [FormaturaController::class, 'pagamentos']);
Route::post('/pagamentos', [FormaturaController::class, 'registrarPagamento']);
Route::delete('/pagamentos/{pagamento}', [FormaturaController::class, 'estornarPagamento']);

Route::get('/relatorio', [FormaturaController::class, 'relatorio']);
