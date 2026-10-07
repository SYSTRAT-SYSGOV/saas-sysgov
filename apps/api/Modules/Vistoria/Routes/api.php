<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Vistoria\Http\Controllers\AssinaturaController;
use Modules\Vistoria\Http\Controllers\DocumentoController;
use Modules\Vistoria\Http\Controllers\EvidenciaController;
use Modules\Vistoria\Http\Controllers\ExecucaoVistoriaController;
use Modules\Vistoria\Http\Controllers\FormularioController;
use Modules\Vistoria\Http\Controllers\IntegracaoController;
use Modules\Vistoria\Http\Controllers\LocalFiscalizavelController;
use Modules\Vistoria\Http\Controllers\OrdemServicoController;
use Modules\Vistoria\Http\Controllers\PainelGerencialController;
use Modules\Vistoria\Http\Controllers\ProcessoSancionatorioController;
use Modules\Vistoria\Http\Controllers\ReinspecaoController;
use Modules\Vistoria\Http\Controllers\VistoriaAuditoriaController;

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
Route::patch('/ordens-servico/{id}/reatribuir', [OrdemServicoController::class, 'reatribuir'])->name('vistoria.ordens-servico.reatribuir');

// ── App de campo offline (seção 4) ─────────────────────────────────────────
Route::get('/pacote-do-dia', [ExecucaoVistoriaController::class, 'pacoteDoDia'])->name('vistoria.execucoes.pacote-do-dia');
Route::post('/execucoes/sincronizar', [ExecucaoVistoriaController::class, 'sincronizar'])->name('vistoria.execucoes.sincronizar');

// ── Formulários dinâmicos e checklist (seção 5) ─────────────────────────────
Route::get('/formularios', [FormularioController::class, 'index'])->name('vistoria.formularios.index');
Route::post('/formularios', [FormularioController::class, 'store'])->name('vistoria.formularios.store');

// ── Lavratura de documentos (seção 6) ───────────────────────────────────────
Route::post('/execucoes/{execucaoId}/documentos', [DocumentoController::class, 'store'])->name('vistoria.documentos.store');
Route::get('/documentos/{id}/pdf', [DocumentoController::class, 'pdf'])->name('vistoria.documentos.pdf');

// ── Assinatura e rubrica em tela (seção 7) ──────────────────────────────────
Route::post('/documentos/{documentoId}/assinaturas/sincronizar', [AssinaturaController::class, 'sincronizar'])->name('vistoria.assinaturas.sincronizar');

// ── Evidências fotográficas e anexos (seção 8) ──────────────────────────────
Route::post('/execucoes/{execucaoId}/evidencias', [EvidenciaController::class, 'store'])->name('vistoria.evidencias.store');
Route::get('/evidencias/{id}/arquivo', [EvidenciaController::class, 'arquivo'])->name('vistoria.evidencias.arquivo');

// ── Processo administrativo sancionatório (seção 9) ─────────────────────────
Route::get('/processos-sancionatorios/{id}', [ProcessoSancionatorioController::class, 'show'])->name('vistoria.processos.show');
Route::post('/processos-sancionatorios/{id}/defesa', [ProcessoSancionatorioController::class, 'defesa'])->name('vistoria.processos.defesa');
Route::post('/processos-sancionatorios/{id}/julgamento', [ProcessoSancionatorioController::class, 'julgamento'])->name('vistoria.processos.julgamento');
Route::post('/processos-sancionatorios/{id}/recurso', [ProcessoSancionatorioController::class, 'recurso'])->name('vistoria.processos.recurso');
Route::post('/processos-sancionatorios/{id}/julgamento-recurso', [ProcessoSancionatorioController::class, 'julgamentoRecurso'])->name('vistoria.processos.julgamento-recurso');

// ── Reinspeção e reincidência (seção 10) ────────────────────────────────────
Route::get('/reinspecoes/{id}', [ReinspecaoController::class, 'show'])->name('vistoria.reinspecoes.show');
Route::post('/reinspecoes/{id}/regularizacao', [ReinspecaoController::class, 'regularizacao'])->name('vistoria.reinspecoes.regularizacao');

// ── Painel gerencial e mapa (seção 11) ──────────────────────────────────────
Route::get('/painel/mapa', [PainelGerencialController::class, 'mapa'])->name('vistoria.painel.mapa');
Route::get('/painel/produtividade', [PainelGerencialController::class, 'produtividade'])->name('vistoria.painel.produtividade');
Route::get('/painel/indicadores', [PainelGerencialController::class, 'indicadores'])->name('vistoria.painel.indicadores');

// ── Trilha de auditoria (seção 13) ──────────────────────────────────────────
Route::get('/vistorias/{id}/auditoria', [VistoriaAuditoriaController::class, 'show'])->name('vistoria.vistorias.auditoria');

// ── Gestão de credenciais de integração M2M (seção 14.3) ────────────────────
// (autenticado/chefia — diferente do consumo da credencial em si, que é a rota pública
// registrada em Routes/integracao.php, sem auth:sanctum/resolve.tenant)
Route::get('/integracoes', [IntegracaoController::class, 'index'])->name('vistoria.integracoes.index');
Route::post('/integracoes', [IntegracaoController::class, 'store'])->name('vistoria.integracoes.store');
Route::delete('/integracoes/{id}', [IntegracaoController::class, 'destroy'])->name('vistoria.integracoes.destroy');

// Rotas das demais seções são adicionadas incrementalmente (ver tasks.md).
