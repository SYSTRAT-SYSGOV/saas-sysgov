<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Http\Controllers\EmpreendimentoController;

// Fase 2 — Empreendimentos (cadastro mestre). As demais capacidades (licenciamento,
// fiscalização ambiental, compensação, resíduos sólidos, áreas protegidas, queimadas,
// recursos hídricos, relatórios/indicadores, integrações e auditoria) são adicionadas
// incrementalmente — ver openspec/changes/criar-modulo-meio-ambiente/tasks.md.

Route::pattern('empreendimento', '[0-9]+');

Route::get('/empreendimentos', [EmpreendimentoController::class, 'index']);
Route::get('/empreendimentos/mapa', [EmpreendimentoController::class, 'mapa']);
Route::post('/empreendimentos', [EmpreendimentoController::class, 'store']);
Route::get('/empreendimentos/{empreendimento}', [EmpreendimentoController::class, 'show']);
Route::post('/empreendimentos/{empreendimento}/responsavel-tecnico', [EmpreendimentoController::class, 'storeResponsavelTecnico']);
