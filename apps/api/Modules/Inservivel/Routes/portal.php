<?php

declare(strict_types=1);

/* Portal da entidade — prefixo api/inservivel/portal (D7). A entidade vem sempre do usuário logado. */

use Illuminate\Support\Facades\Route;
use Modules\Inservivel\Http\Controllers\Portal\PortalController;

Route::get('/me', [PortalController::class, 'me']);
Route::put('/me', [PortalController::class, 'atualizar']);
Route::post('/documentos', [PortalController::class, 'enviarDocumento']);
Route::get('/documentos/{documento}', [PortalController::class, 'documento']);
Route::get('/lotes', [PortalController::class, 'lotes']);
Route::get('/lotes/{lote}', [PortalController::class, 'lote']);
Route::post('/lotes/{lote}/participacao', [PortalController::class, 'participar']);
Route::delete('/lotes/{lote}/participacao', [PortalController::class, 'desistir']);
Route::get('/lotes/{lote}/bens/{bem}/fotos/{foto}', [PortalController::class, 'fotoBem']);
Route::get('/lotes/{lote}/termos/{tipo}', [PortalController::class, 'termo']);
