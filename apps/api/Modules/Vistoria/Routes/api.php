<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Vistoria\Http\Controllers\LocalFiscalizavelController;
use Modules\Vistoria\Http\Controllers\OrdemServicoController;

// ── Locais fiscalizáveis ──────────────────────────────────────────────────
Route::get('/locais', [LocalFiscalizavelController::class, 'index'])->name('vistoria.locais.index');
Route::post('/locais', [LocalFiscalizavelController::class, 'store'])->name('vistoria.locais.store');
Route::get('/locais/{id}/historico', [LocalFiscalizavelController::class, 'historico'])->name('vistoria.locais.historico');
Route::get('/locais/{id}', [LocalFiscalizavelController::class, 'show'])->name('vistoria.locais.show');
Route::patch('/locais/{id}', [LocalFiscalizavelController::class, 'update'])->name('vistoria.locais.update');
Route::delete('/locais/{id}', [LocalFiscalizavelController::class, 'destroy'])->name('vistoria.locais.destroy');

// ── Ordens de serviço de vistoria ─────────────────────────────────────────
Route::get('/ordens-servico', [OrdemServicoController::class, 'index'])->name('vistoria.ordens-servico.index');
Route::post('/ordens-servico', [OrdemServicoController::class, 'store'])->name('vistoria.ordens-servico.store');
Route::get('/ordens-servico/minha-agenda', [OrdemServicoController::class, 'minhaAgenda'])->name('vistoria.ordens-servico.minha-agenda');
Route::get('/ordens-servico/{id}', [OrdemServicoController::class, 'show'])->name('vistoria.ordens-servico.show');

// Rotas das demais seções são adicionadas incrementalmente (ver tasks.md).
