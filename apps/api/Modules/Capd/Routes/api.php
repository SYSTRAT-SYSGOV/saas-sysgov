<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Capd\Http\Controllers\AvaliacaoController;
use Modules\Capd\Http\Controllers\AvaliacaoUsuarioController;
use Modules\Capd\Http\Controllers\CapdController;
use Modules\Capd\Http\Controllers\CicloController;
use Modules\Capd\Http\Controllers\ComissaoController;
use Modules\Capd\Http\Controllers\ConsolidacaoController;
use Modules\Capd\Http\Controllers\DashboardController;
use Modules\Capd\Http\Controllers\DeliberacaoController;
use Modules\Capd\Http\Controllers\DiarioBordoController;
use Modules\Capd\Http\Controllers\EscalaGraficaController;
use Modules\Capd\Http\Controllers\FatorController;
use Modules\Capd\Http\Controllers\HomologacaoController;
use Modules\Capd\Http\Controllers\ModeloFatorPesoController;
use Modules\Capd\Http\Controllers\NivelHierarquiaController;
use Modules\Capd\Http\Controllers\PainelGerencialController;
use Modules\Capd\Http\Controllers\PendenciaHierarquiaController;
use Modules\Capd\Http\Controllers\PerguntaController;
use Modules\Capd\Http\Controllers\PmdController;
use Modules\Capd\Http\Controllers\QuinquenioController;
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
    Route::get('/kpis-equipe', [AvaliacaoController::class, 'kpisEquipe'])->name('capd.avaliacoes.kpis-equipe');
    Route::get('/{id}', [AvaliacaoController::class, 'show'])->name('capd.avaliacoes.show');
    Route::put('/{id}', [AvaliacaoController::class, 'update'])->name('capd.avaliacoes.update');
    Route::post('/{id}/submeter', [AvaliacaoController::class, 'submeter'])->name('capd.avaliacoes.submeter');
    Route::post('/{id}/ciencia', [AvaliacaoController::class, 'registrarCiencia'])->name('capd.avaliacoes.ciencia');
    Route::post('/{id}/devolutiva', [AvaliacaoController::class, 'registrarDevolutiva'])->name('capd.avaliacoes.devolutiva');
    Route::get('/{id}/espelho', [AvaliacaoController::class, 'obterEspelho'])->name('capd.avaliacoes.espelho');
    Route::get('/{id}/espelho/exportar-pdf', [AvaliacaoController::class, 'exportarEspelhoPdf'])->name('capd.avaliacoes.espelho.pdf');
    Route::post('/{id}/homologar', [AvaliacaoController::class, 'homologar'])->name('capd.avaliacoes.homologar');
    Route::get('/{id}/preview-nota', [AvaliacaoController::class, 'previewNota'])->name('capd.avaliacoes.preview-nota');
});

Route::get('/servidores/{id}/simular-progressao', [AvaliacaoController::class, 'simularProgressao'])->name('capd.servidores.simular-progressao');
Route::get('/auditoria/impedimentos', function (\Modules\Capd\Services\ParentescoService $parentesco) {
    return response()->json($parentesco->listarImpedimentosAuditoria());
})->name('capd.auditoria.impedimentos');
Route::post('/impedimentos', function (\Illuminate\Http\Request $request, \Modules\Capd\Services\ParentescoService $parentesco) {
    $dados = $request->validate([
        'servidor_alvo_id' => ['required', 'integer'],
        'tipo_impedimento' => ['required', 'string'],
        'motivo'           => ['required', 'string', 'max:255'],
    ]);
    $imp = $parentesco->registrarImpedimento(
        $dados['servidor_alvo_id'],
        $dados['tipo_impedimento'],
        $dados['motivo'],
        $request->user()->id
    );
    return response()->json($imp, 201);
})->name('capd.impedimentos.store');

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
    Route::get('/meu-perfil', [\Modules\Capd\Http\Controllers\ServidorController::class, 'meuPerfil'])->name('capd.servidores.meu-perfil');
    Route::post('/', [\Modules\Capd\Http\Controllers\ServidorController::class, 'store'])->name('capd.servidores.store');
    Route::post('/importar-csv', [\Modules\Capd\Http\Controllers\ServidorController::class, 'importCsv'])->name('capd.servidores.import-csv');
    Route::get('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'show'])->name('capd.servidores.show');
    Route::put('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'update'])->name('capd.servidores.update');
    Route::delete('/{servidor}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'destroy'])->name('capd.servidores.destroy');
    Route::post('/{servidor}/afastamentos', [\Modules\Capd\Http\Controllers\ServidorController::class, 'storeAfastamento'])->name('capd.servidores.afastamentos.store');
    Route::put('/{servidor}/afastamentos/{afastamento}', [\Modules\Capd\Http\Controllers\ServidorController::class, 'updateAfastamento'])->name('capd.servidores.afastamentos.update');
    Route::get('/{servidor}/quinquenios', [QuinquenioController::class, 'index'])->name('capd.servidores.quinquenios.index');
    Route::post('/{servidor}/quinquenios/gerar', [QuinquenioController::class, 'gerar'])->name('capd.servidores.quinquenios.gerar');
});

// ── Hierarquia de Avaliação (resolução do superior imediato) ──────────
Route::prefix('niveis-hierarquia')->group(function (): void {
    Route::get('/', [NivelHierarquiaController::class, 'index'])->name('capd.niveis-hierarquia.index');
    Route::post('/', [NivelHierarquiaController::class, 'store'])->name('capd.niveis-hierarquia.store');
    Route::put('/{id}', [NivelHierarquiaController::class, 'update'])->name('capd.niveis-hierarquia.update');
    Route::delete('/{id}', [NivelHierarquiaController::class, 'destroy'])->name('capd.niveis-hierarquia.destroy');
});

Route::prefix('pendencias-hierarquia')->group(function (): void {
    Route::get('/', [PendenciaHierarquiaController::class, 'index'])->name('capd.pendencias-hierarquia.index');
    Route::post('/{id}/resolver', [PendenciaHierarquiaController::class, 'resolver'])->name('capd.pendencias-hierarquia.resolver');
});

// ── Painel de Configurações de Integração de RH ───────────────────────
Route::prefix('integracoes-rh')->group(function (): void {
    Route::get('/', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'index'])->name('capd.integracoes-rh.index');
    Route::post('/', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'store'])->name('capd.integracoes-rh.store');
    Route::get('/logs', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'logs'])->name('capd.integracoes-rh.logs');
    Route::put('/{integracao}', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'update'])->name('capd.integracoes-rh.update');
    Route::post('/{integracao}/regenerate-key', [\Modules\Capd\Http\Controllers\RhIntegrationController::class, 'regenerateKey'])->name('capd.integracoes-rh.regenerate-key');
});

// ── Painel Gerencial da Comissão (Filtros Avançados & KPIs) ────────────
Route::prefix('painel')->group(function (): void {
    Route::get('/servidores', [PainelGerencialController::class, 'servidores'])->name('capd.painel.servidores');
    Route::get('/kpis', [PainelGerencialController::class, 'kpis'])->name('capd.painel.kpis');
    Route::get('/visao/{perfil}', [PainelGerencialController::class, 'visaoPerfil'])->name('capd.painel.visao');
    Route::get('/export', [PainelGerencialController::class, 'exportar'])->name('capd.painel.export');
});

// ── Relatórios (RF-12) ────────────────────────────────────────────────
Route::prefix('relatorios')->group(function (): void {
    Route::get('/aderencia', [PainelGerencialController::class, 'relatorioAderencia'])->name('capd.relatorios.aderencia');
});

// ── Ciclos de Avaliação de 12 Meses (Cadência Anual de 3 Anos) ────────
Route::prefix('ciclos')->group(function (): void {
    Route::get('/', [CicloController::class, 'index'])->name('capd.ciclos.index');
    Route::post('/', [CicloController::class, 'store'])->name('capd.ciclos.store');
    Route::get('/{id}', [CicloController::class, 'show'])->name('capd.ciclos.show');
    Route::put('/{id}', [CicloController::class, 'update'])->name('capd.ciclos.update');
    Route::post('/{id}/encerrar', [CicloController::class, 'encerrar'])->name('capd.ciclos.encerrar');
    Route::post('/{id}/proximo', [CicloController::class, 'proximoCiclo'])->name('capd.ciclos.proximo');
    Route::get('/{id}/elegibilidade', [CicloController::class, 'elegibilidade'])->name('capd.ciclos.elegibilidade');
});

// ── Modelos de Formulário e Cadastro de Perguntas (Escala Gráfica) ────
Route::prefix('modelos-formulario')->group(function (): void {
    Route::get('/', [PerguntaController::class, 'indexModelos'])->name('capd.modelos.index');
    Route::get('/vigente', [PerguntaController::class, 'modeloVigente'])->name('capd.modelos.vigente');
    Route::post('/', [PerguntaController::class, 'storeModelo'])->name('capd.modelos.store');
    Route::get('/{id}', [PerguntaController::class, 'showModelo'])->name('capd.modelos.show');
    Route::post('/{id}/perguntas', [PerguntaController::class, 'storePergunta'])->name('capd.modelos.perguntas.store');
    Route::post('/seed-padrao', [PerguntaController::class, 'seedPadrao'])->name('capd.modelos.seed-padrao');

    // RF-02: pesos por formulário
    Route::get('/{modeloId}/fatores-pesos', [ModeloFatorPesoController::class, 'index'])->name('capd.modelos.fatores-pesos.index');
    Route::post('/{modeloId}/fatores-pesos/sync', [ModeloFatorPesoController::class, 'sync'])->name('capd.modelos.fatores-pesos.sync');
    Route::get('/{modeloId}/fatores-pesos/disponiveis', [ModeloFatorPesoController::class, 'fatoresDisponiveis'])->name('capd.modelos.fatores-pesos.disponiveis');

    // RF-03: escalas gráficas
    Route::get('/{modeloId}/escalas-graficas', [EscalaGraficaController::class, 'index'])->name('capd.modelos.escalas.index');
    Route::post('/{modeloId}/escalas-graficas', [EscalaGraficaController::class, 'store'])->name('capd.modelos.escalas.store');
    Route::get('/{modeloId}/escalas-graficas/{escalaId}', [EscalaGraficaController::class, 'show'])->name('capd.modelos.escalas.show');
    Route::put('/{modeloId}/escalas-graficas/{escalaId}', [EscalaGraficaController::class, 'update'])->name('capd.modelos.escalas.update');
    Route::delete('/{modeloId}/escalas-graficas/{escalaId}', [EscalaGraficaController::class, 'destroy'])->name('capd.modelos.escalas.destroy');
});

Route::post('perguntas/seed-padrao', [PerguntaController::class, 'seedPadrao'])->name('capd.perguntas.seed-padrao');
Route::delete('perguntas/{id}', [PerguntaController::class, 'destroyPergunta'])->name('capd.perguntas.destroy');

// ── PMD — Planos de Melhoria de Desempenho (RF-09) ───────────────────
Route::prefix('pmd')->group(function (): void {
    Route::get('/', [PmdController::class, 'index'])->name('capd.pmd.index');
    Route::post('/', [PmdController::class, 'store'])->name('capd.pmd.store');
    Route::get('/{id}', [PmdController::class, 'show'])->name('capd.pmd.show');
    Route::put('/{id}', [PmdController::class, 'update'])->name('capd.pmd.update');
    Route::post('/{id}/concluir-acoes', [PmdController::class, 'concluirAcoes'])->name('capd.pmd.concluir-acoes');
    Route::post('/{id}/verificacao', [PmdController::class, 'registrarVerificacao'])->name('capd.pmd.verificacao');
});

// ── Consolidação NFC Trienal e Ranking de Progressão (RN-02, RN-04, RN-05, RF-12) ──
Route::prefix('consolidacao')->group(function (): void {
    Route::get('/{cicloId}/nfc', [ConsolidacaoController::class, 'nfc'])->name('capd.consolidacao.nfc');
    Route::get('/{cicloId}/ranking', [ConsolidacaoController::class, 'rankingProgressao'])->name('capd.consolidacao.ranking');
    Route::get('/{cicloId}/exportar-pdf', [ConsolidacaoController::class, 'exportarPdf'])->name('capd.consolidacao.pdf');
    Route::post('/{cicloId}/processar', [ConsolidacaoController::class, 'processar'])->name('capd.consolidacao.processar');
    Route::get('/{cicloId}/historico', [ConsolidacaoController::class, 'historico'])->name('capd.consolidacao.historico');
});

// ── CRUD dinâmico de Fatores de Avaliação (RF-02) ────────────────────
Route::prefix('fatores')->group(function (): void {
    Route::get('/', [FatorController::class, 'index'])->name('capd.fatores.index');
    Route::post('/', [FatorController::class, 'store'])->name('capd.fatores.store');
    Route::put('/{id}', [FatorController::class, 'update'])->name('capd.fatores.update');
    Route::delete('/{id}', [FatorController::class, 'destroy'])->name('capd.fatores.destroy');
});

// ── Avaliação pelo Usuário Externo (art. 25, RF-06) ──────────────────
Route::prefix('avaliacao-usuario')->group(function (): void {
    Route::get('/media', [AvaliacaoUsuarioController::class, 'media'])->name('capd.avaliacao-usuario.media');
    Route::post('/', [AvaliacaoUsuarioController::class, 'store'])->name('capd.avaliacao-usuario.store');
});