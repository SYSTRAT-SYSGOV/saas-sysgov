<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Requerimentos\Http\Controllers\AuditoriaController;
use Modules\Requerimentos\Http\Controllers\NotificacaoController;
use Modules\Requerimentos\Http\Controllers\ProposicaoController;
use Modules\Requerimentos\Http\Controllers\RelatorioController;
use Modules\Requerimentos\Http\Controllers\RespostaController;
use Modules\Requerimentos\Http\Controllers\TipoInstrumentoController;
use Modules\Requerimentos\Http\Controllers\TramitacaoPoderesController;

// ── Tipos de Instrumento ────────────────────────────────────────────
Route::get('/tipos-instrumento', [TipoInstrumentoController::class, 'index']);
Route::get('/tipos-instrumento/{slug}', [TipoInstrumentoController::class, 'show']);
Route::post('/tipos-instrumento', [TipoInstrumentoController::class, 'store']);
Route::put('/tipos-instrumento/{slug}', [TipoInstrumentoController::class, 'update']);

// ── Proposições ─────────────────────────────────────────────────────
Route::get('/proposicoes', [ProposicaoController::class, 'index']);
Route::post('/proposicoes', [ProposicaoController::class, 'store']);
Route::get('/proposicoes/{id}', [ProposicaoController::class, 'show']);
Route::get('/proposicoes/{id}/historico', [ProposicaoController::class, 'historico']);

// ── Minhas Proposições (Dashboard do Autor) ─────────────────────────
Route::get('/minhas-proposicoes', [ProposicaoController::class, 'minhasProposicoes']);

// ── Tramitação entre Poderes ────────────────────────────────────────
Route::get('/tramitacoes-poderes', [TramitacaoPoderesController::class, 'index']);
Route::post('/tramitacoes-poderes', [TramitacaoPoderesController::class, 'store']);
Route::patch('/tramitacoes-poderes/{id}/recebimento', [TramitacaoPoderesController::class, 'registrarRecebimento']);

// ── Respostas ───────────────────────────────────────────────────────
Route::post('/respostas', [RespostaController::class, 'store']);
Route::patch('/respostas/{id}/enviar', [RespostaController::class, 'enviar']);

// ── Notificações ────────────────────────────────────────────────────
Route::get('/notificacoes', [NotificacaoController::class, 'index']);
Route::patch('/notificacoes/{id}/lida', [NotificacaoController::class, 'marcarLida']);
Route::post('/notificacoes/marcar-todas-lidas', [NotificacaoController::class, 'marcarTodasLidas']);
Route::get('/notificacoes/preferencias', [NotificacaoController::class, 'preferencias']);
Route::put('/notificacoes/preferencias', [NotificacaoController::class, 'atualizarPreferencias']);

// ── Relatórios ──────────────────────────────────────────────────────
Route::get('/relatorios/quantitativo', [RelatorioController::class, 'quantitativo']);
Route::get('/relatorios/tempo-medio', [RelatorioController::class, 'tempoMedio']);
Route::get('/relatorios/cumprimento-prazos', [RelatorioController::class, 'cumprimentoPrazos']);

// ── Auditoria ───────────────────────────────────────────────────────
Route::get('/auditoria', [AuditoriaController::class, 'index']);
Route::get('/auditoria/proposicao/{id}', [AuditoriaController::class, 'proposicao']);