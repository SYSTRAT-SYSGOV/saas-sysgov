<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Vistoria\Http\Controllers\AutuacoesPublicasController;

// ── Integração M2M (seção 14.3) — SEM auth:sanctum/resolve.tenant: a credencial de API
// (X-Vistoria-API-Key ou Bearer) mapeia direto pro tenant, não há usuário logado aqui.
Route::get('/autuacoes', [AutuacoesPublicasController::class, 'index'])->name('vistoria.integracao.autuacoes');
