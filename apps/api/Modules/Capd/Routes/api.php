<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Capd\Http\Controllers\AvaliacaoController;
use Modules\Capd\Http\Controllers\CapdController;
use Modules\Capd\Http\Controllers\ComissaoController;
use Modules\Capd\Http\Controllers\DashboardController;
use Modules\Capd\Http\Controllers\DeliberacaoController;
use Modules\Capd\Http\Controllers\DiarioBordoController;
use Modules\Capd\Http\Controllers\HomologacaoController;
use Modules\Capd\Http\Controllers\RecursoController;
use Modules\Capd\Http\Controllers\SessaoController;

/*
|--------------------------------------------------------------------------
| Rotas da API do Módulo CAPD
|--------------------------------------------------------------------------
|
| Todas as rotas são protegidas pelos middlewares:
| - 'api'
| - 'auth:sanctum'
| - 'resolve.tenant'
|
*/

// ── CRUD de Teste/Scaffold ────────────────────────────────────────────
Route::get('/', [CapdController::class, 'index'])->name('capd.index');
Route::post('/', [CapdController::class, 'store'])->name('capd.store');
Route::get('/items/{id}', [CapdController::class, 'show'])->name('capd.show');
Route::put('/items/{id}', [CapdController::class, 'update'])->name('capd.update');
Route::delete('/items/{id}', [CapdController::class, 'destroy'])->name('capd.destroy');

// ── Diário de Bordo Digital (CIT) ─────────────────────────────────────
Route::prefix('diario-bordo')->group(function (): void {
    Route::get('/', [DiarioBordoController::class, 'index'])->name('capd.diario-bordo.index');
    Route::post('/', [DiarioBordoController::class, 'store'])->name('capd.diario-bordo.store');
    Route::get('/{id}', [DiarioBordoController::class, 'show'])->name('capd.diario-bordo.show');
    Route::post('/{id}/evidencias', [DiarioBordoController::class, 'uploadEvidencia'])
        ->middleware('throttle:60,1')
        ->name('capd.diario-bordo.evidencias');
    Route::delete('/{id}', [DiarioBordoController::class, 'destroy'])->name('capd.diario-bordo.destroy');
});

// ── Avaliações de Desempenho ──────────────────────────────────────────
Route::prefix('avaliacoes')->group(function (): void {
    Route::get('/', [AvaliacaoController::class, 'index'])->name('capd.avaliacoes.index');
    Route::post('/', [AvaliacaoController::class, 'store'])->name('capd.avaliacoes.store');
    Route::get('/{id}', [AvaliacaoController::class, 'show'])->name('capd.avaliacoes.show');
    Route::put('/{id}', [AvaliacaoController::class, 'update'])->name('capd.avaliacoes.update');
    Route::post('/{id}/submeter', [AvaliacaoController::class, 'submeter'])->name('capd.avaliacoes.submeter');
    Route::post('/{id}/ciencia', [AvaliacaoController::class, 'registrarCiencia'])->name('capd.avaliacoes.ciencia');
    Route::post('/{id}/homologar', [AvaliacaoController::class, 'homologar'])->name('capd.avaliacoes.homologar');
    Route::get('/{id}/preview-nota', [AvaliacaoController::class, 'previewNota'])->name('capd.avaliacoes.preview-nota');
});

// ── Comissões CAPD (Colegiado) ────────────────────────────────────────
Route::prefix('comissoes')->group(function (): void {
    Route::get('/', [ComissaoController::class, 'index'])->name('capd.comissoes.index');
    Route::post('/', [ComissaoController::class, 'store'])->name('capd.comissoes.store');
    Route::get('/{id}', [ComissaoController::class, 'show'])->name('capd.comissoes.show');
    Route::post('/{id}/membros', [ComissaoController::class, 'adicionarMembro'])->name('capd.comissoes.membros.adicionar');
    Route::post('/membros/{id}/impedimentos', [ComissaoController::class, 'declararImpedimento'])->name('capd.comissoes.impedimentos.declarar');
});

// ── Recursos Administrativos ──────────────────────────────────────────
Route::prefix('recursos')->group(function (): void {
    Route::get('/', [RecursoController::class, 'index'])->name('capd.recursos.index');
    Route::post('/', [RecursoController::class, 'store'])->name('capd.recursos.store');
    Route::get('/{id}', [RecursoController::class, 'show'])->name('capd.recursos.show');
    Route::post('/{id}/documentos', [RecursoController::class, 'uploadDocumento'])->name('capd.recursos.documentos.upload');
    Route::post('/{id}/sortear-relator', [RecursoController::class, 'sortearRelator'])->name('capd.recursos.relator.sortear');
    Route::post('/{id}/contestar-chefia', [RecursoController::class, 'contestarChefia'])->name('capd.recursos.chefia.contestar');
});

// ── Sessões Deliberativas e Atas ──────────────────────────────────────
Route::prefix('sessoes')->group(function (): void {
    Route::get('/', [SessaoController::class, 'index'])->name('capd.sessoes.index');
    Route::post('/', [SessaoController::class, 'store'])->name('capd.sessoes.store');
    Route::get('/{id}', [SessaoController::class, 'show'])->name('capd.sessoes.show');
    Route::post('/{id}/pauta', [SessaoController::class, 'adicionarPauta'])->name('capd.sessoes.pauta.adicionar');
    Route::post('/{id}/presenca', [SessaoController::class, 'registrarPresenca'])->name('capd.sessoes.presenca.registrar');
    Route::post('/{id}/selar-ata', [SessaoController::class, 'selarAta'])->name('capd.sessoes.ata.selar');
});

// ── Deliberação e Votação ─────────────────────────────────────────────
Route::post('deliberacoes/votar', [DeliberacaoController::class, 'votar'])->name('capd.deliberacoes.votar');

// ── Homologação Final em Lote ─────────────────────────────────────────
Route::post('ciclos/{id}/homologar', [HomologacaoController::class, 'homologarCiclo'])->name('capd.ciclos.homologar');

// ── BI & Dashboard Analytics ──────────────────────────────────────────
Route::get('dashboard/metricas', [DashboardController::class, 'metricas'])->name('capd.dashboard.metricas');

// ── Gestão de Servidores Públicos (RH Universal) ──────────────────────
Route::prefix('servidores')->group(function (): void {
    Route::get('/', [\Modules\Capd\Http\Controllers\ServidorController::class, 'index'])->name('capd.servidores.index');
    Route::post('/', [\Modules\Capd\Http\Controllers\ServidorController::class, 'store'])->name('capd.servidores.store');
    Route::post('/importar-csv', [\Modules\Capd\Http\Controllers\ServidorController::class, 'importCsv'])->name('capd.servidores.import-csv');
    Route::get('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'show'])->name('capd.servidores.show');
    Route::put('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'update'])->name('capd.servidores.update');
    Route::delete('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'destroy'])->name('capd.servidores.destroy');
});

// ── Painel de Configurações de Integração de RH ───────────────────────
Route::prefix('integracoes-rh')->group(function (): void {
    Route::get('/', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'index'])->name('capd.integracoes-rh.index');
    Route::post('/', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'store'])->name('capd.integracoes-rh.store');
    Route::get('/logs', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'logs'])->name('capd.integracoes-rh.logs');
    Route::put('/{integracao}', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'update'])->name('capd.integracoes-rh.update');
    Route::post('/{integracao}/regenerate-key', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'regenerateKey'])->name('capd.integracoes-rh.regenerate-key');
});