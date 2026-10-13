<?php

declare(strict_types=1);

/*
 * Rotas sem campanha de trabalho (D2): escolher, cadastrar e configurar campanhas. Registradas sob
 * api/campanha com auth:sanctum, tenant, bindings e module-access:campanha.
 */

use Illuminate\Support\Facades\Route;
use Modules\Campanha\Http\Controllers\CampanhaController;

Route::get('/campanhas/minhas', [CampanhaController::class, 'minhas']);
Route::post('/campanhas', [CampanhaController::class, 'store']);
Route::get('/campanhas/{campanha}', [CampanhaController::class, 'show'])->whereNumber('campanha');
Route::put('/campanhas/{campanha}', [CampanhaController::class, 'update'])->whereNumber('campanha');
Route::delete('/campanhas/{campanha}', [CampanhaController::class, 'destroy'])->whereNumber('campanha');
Route::put('/campanhas/{campanha}/candidato', [CampanhaController::class, 'salvarCandidato'])->whereNumber('campanha');
Route::get('/campanhas/{campanha}/membros', [CampanhaController::class, 'membros'])->whereNumber('campanha');
Route::put('/campanhas/{campanha}/membros', [CampanhaController::class, 'definirMembros'])->whereNumber('campanha');
Route::get('/campanhas/{campanha}/usuarios', [CampanhaController::class, 'usuarios'])->whereNumber('campanha');

// Base territorial pública (IBGE/TSE), só leitura
Route::get('/referencia/{uf}/municipios', [\Modules\Campanha\Http\Controllers\ReferenciaController::class, 'municipios'])->where('uf', '[A-Za-z]{2}');
Route::get('/referencia/{uf}/malha', [\Modules\Campanha\Http\Controllers\ReferenciaController::class, 'malha'])->where('uf', '[A-Za-z]{2}');
