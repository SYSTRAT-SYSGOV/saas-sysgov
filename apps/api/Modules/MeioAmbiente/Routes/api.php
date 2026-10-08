<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Http\Controllers\EmpreendimentoController;
use Modules\MeioAmbiente\Http\Controllers\ProcessoLicenciamentoController;

// Fases 2-3 — Empreendimentos e Licenciamento Ambiental. As demais capacidades
// (fiscalização ambiental, compensação, resíduos sólidos, áreas protegidas,
// queimadas, recursos hídricos, relatórios/indicadores, integrações e auditoria)
// são adicionadas incrementalmente — ver openspec/changes/criar-modulo-meio-ambiente/tasks.md.

Route::pattern('empreendimento', '[0-9]+');
Route::pattern('processoLicenciamento', '[0-9]+');
Route::pattern('condicionante', '[0-9]+');

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
