<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Controllers\Portal\ConcessionarioPortalController;

/* Painel do concessionário (RF-28) — guard concessionario, filtrado pelo titular autenticado. */

Route::pattern('id', '[0-9]+');

Route::get('/me', [ConcessionarioPortalController::class, 'me']);
Route::post('/logout', [ConcessionarioPortalController::class, 'logout']);
Route::get('/concessoes', [ConcessionarioPortalController::class, 'concessoes']);
Route::get('/concessoes/{id}', [ConcessionarioPortalController::class, 'concessao']);
Route::get('/guias', [ConcessionarioPortalController::class, 'guias']);
Route::get('/guias/{id}/pdf', [ConcessionarioPortalController::class, 'guiaPdf']);
Route::post('/guias/{id}/segunda-via', [ConcessionarioPortalController::class, 'segundaVia']);
Route::get('/sepultados', [ConcessionarioPortalController::class, 'sepultados']);
Route::get('/solicitacoes', [ConcessionarioPortalController::class, 'solicitacoes']);
Route::post('/solicitacoes', [ConcessionarioPortalController::class, 'solicitar']);
