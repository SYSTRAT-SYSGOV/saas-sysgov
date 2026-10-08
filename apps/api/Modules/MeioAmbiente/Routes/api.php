<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Http\Controllers\EmpreendimentoController;
use Modules\MeioAmbiente\Http\Controllers\FiscalizacaoAmbientalController;
use Modules\MeioAmbiente\Http\Controllers\ProcessoLicenciamentoController;

// Fases 2-4 — Empreendimentos, Licenciamento Ambiental e Fiscalização Ambiental. As
// demais capacidades (compensação, resíduos sólidos, áreas protegidas, queimadas,
// recursos hídricos, relatórios/indicadores, integrações e auditoria) são adicionadas
// incrementalmente — ver openspec/changes/criar-modulo-meio-ambiente/tasks.md.

Route::pattern('empreendimento', '[0-9]+');
Route::pattern('processoLicenciamento', '[0-9]+');
Route::pattern('condicionante', '[0-9]+');
Route::pattern('execucaoVistoria', '[0-9]+');
Route::pattern('autoInfracaoAmbiental', '[0-9]+');
Route::pattern('processoSancionatorio', '[0-9]+');

Route::get('/empreendimentos', [EmpreendimentoController::class, 'index']);
Route::get('/empreendimentos/mapa', [EmpreendimentoController::class, 'mapa']);
Route::post('/empreendimentos', [EmpreendimentoController::class, 'store']);
Route::get('/empreendimentos/{empreendimento}', [EmpreendimentoController::class, 'show']);
Route::post('/empreendimentos/{empreendimento}/responsavel-tecnico', [EmpreendimentoController::class, 'storeResponsavelTecnico']);

Route::get('/empreendimentos/{empreendimento}/processos-licenciamento', [ProcessoLicenciamentoController::class, 'index']);
Route::post('/empreendimentos/{empreendimento}/processos-licenciamento', [ProcessoLicenciamentoController::class, 'store']);
Route::get('/processos-licenciamento/{processoLicenciamento}', [ProcessoLicenciamentoController::class, 'show']);
Route::post('/processos-licenciamento/{processoLicenciamento}/documentos', [ProcessoLicenciamentoController::class, 'storeDocumento']);
Route::post('/processos-licenciamento/{processoLicenciamento}/condicionantes', [ProcessoLicenciamentoController::class, 'storeCondicionante']);
Route::post('/condicionantes/{condicionante}/cumprir', [ProcessoLicenciamentoController::class, 'cumprirCondicionante']);
Route::post('/processos-licenciamento/{processoLicenciamento}/vistoria-tecnica', [ProcessoLicenciamentoController::class, 'storeVistoriaTecnica']);
Route::post('/processos-licenciamento/{processoLicenciamento}/deferir', [ProcessoLicenciamentoController::class, 'deferir']);

Route::post('/execucoes-vistoria/{execucaoVistoria}/autos-infracao-ambiental', [FiscalizacaoAmbientalController::class, 'store']);
Route::get('/autos-infracao-ambiental/{autoInfracaoAmbiental}', [FiscalizacaoAmbientalController::class, 'show']);
Route::post('/processos-sancionatorios/{processoSancionatorio}/parcelamento', [FiscalizacaoAmbientalController::class, 'storeParcelamento']);
