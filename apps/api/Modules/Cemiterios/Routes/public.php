<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Controllers\Portal\PublicoController;

/* Portal público (sem autenticação) — prefixo api/public/cemiterios/{tenantSlug}. */

Route::get('/identidade', [PublicoController::class, 'identidade']);
Route::get('/falecidos', [PublicoController::class, 'busca']);
Route::get('/jazigos/{codigo}/mapa', [PublicoController::class, 'mapa']);
