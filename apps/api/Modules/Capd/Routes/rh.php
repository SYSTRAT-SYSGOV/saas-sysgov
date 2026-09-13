<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Capd\Http\Controllers\Api\RhApiController;

// APIs Abertas para Sistemas de RH Externos (Autenticação via X-RH-API-Key)
Route::post('/servidores/sync', [RhApiController::class, 'syncServidores'])->name('capd.rh.servidores.sync');
Route::post('/frequencia/sync', [RhApiController::class, 'syncFrequencia'])->name('capd.rh.frequencia.sync');
Route::post('/afastamentos/sync', [RhApiController::class, 'syncAfastamentos'])->name('capd.rh.afastamentos.sync');
Route::get('/avaliacoes/export', [RhApiController::class, 'exportAvaliacoes'])->name('capd.rh.avaliacoes.export');
Route::post('/webhooks/test', [RhApiController::class, 'testWebhook'])->name('capd.rh.webhooks.test');
