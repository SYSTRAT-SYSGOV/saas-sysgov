<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Http\Controllers\DocsController;
use Modules\MeioAmbiente\Http\Controllers\IntegracaoPublicaController;

// Fase 11 — rotas sem login humano: documentação OpenAPI (pública) e API M2M para
// órgãos de controle (credencial de integração própria, que define o tenant).

Route::get('/docs', [DocsController::class, 'ui'])->name('meio_ambiente.docs.ui');
Route::get('/docs/openapi.yaml', [DocsController::class, 'spec'])->name('meio_ambiente.docs.spec');

Route::get('/publico/licencas', [IntegracaoPublicaController::class, 'licencas']);
Route::get('/publico/autos-infracao', [IntegracaoPublicaController::class, 'autosInfracao']);
Route::get('/publico/relatorios-residuos', [IntegracaoPublicaController::class, 'relatoriosResiduos']);
