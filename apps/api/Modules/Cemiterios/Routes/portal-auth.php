<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Controllers\Portal\GovBrController;

/* Login Gov.br do concessionário (RF-27) — prefixo api/portal/cemiterios/{tenantSlug}. */

Route::get('/auth/govbr', [GovBrController::class, 'iniciar']);
Route::post('/auth/govbr/callback', [GovBrController::class, 'callback']);
