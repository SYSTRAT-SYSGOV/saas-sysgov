<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Http\Controllers\AreaProtegidaController;
use Modules\MeioAmbiente\Http\Controllers\CompensacaoAmbientalController;
use Modules\MeioAmbiente\Http\Controllers\EmpreendimentoController;
use Modules\MeioAmbiente\Http\Controllers\FiscalizacaoAmbientalController;
use Modules\MeioAmbiente\Http\Controllers\OcorrenciaQueimadaController;
use Modules\MeioAmbiente\Http\Controllers\ProcessoLicenciamentoController;
use Modules\MeioAmbiente\Http\Controllers\RecursosHidricosController;
use Modules\MeioAmbiente\Http\Controllers\ResiduosSolidosController;

// Fases 2-9 — Empreendimentos, Licenciamento Ambiental, Fiscalização Ambiental,
// Compensação Ambiental, Resíduos Sólidos, Áreas Protegidas, Queimadas e Recursos
// Hídricos. As demais capacidades (relatórios/indicadores, integrações e auditoria)
// são adicionadas incrementalmente — ver openspec/changes/criar-modulo-meio-ambiente/tasks.md.

Route::pattern('empreendimento', '[0-9]+');
Route::pattern('processoLicenciamento', '[0-9]+');
Route::pattern('condicionante', '[0-9]+');
Route::pattern('execucaoVistoria', '[0-9]+');
Route::pattern('autoInfracaoAmbiental', '[0-9]+');
Route::pattern('processoSancionatorio', '[0-9]+');
Route::pattern('compensacaoAmbiental', '[0-9]+');
Route::pattern('geradorResiduo', '[0-9]+');
Route::pattern('pontoLogisticaReversa', '[0-9]+');
Route::pattern('ocorrenciaQueimada', '[0-9]+');
Route::pattern('parametroQualidadeEfluente', '[0-9]+');

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

Route::get('/empreendimentos/{empreendimento}/compensacoes-ambientais', [CompensacaoAmbientalController::class, 'index']);
Route::get('/compensacoes-ambientais/{compensacaoAmbiental}', [CompensacaoAmbientalController::class, 'show']);
Route::post('/compensacoes-ambientais/{compensacaoAmbiental}/pagamentos', [CompensacaoAmbientalController::class, 'storePagamento']);
Route::post('/compensacoes-ambientais/{compensacaoAmbiental}/destinacoes', [CompensacaoAmbientalController::class, 'storeDestinacao']);

Route::get('/geradores-residuo', [ResiduosSolidosController::class, 'indexGeradores']);
Route::post('/geradores-residuo', [ResiduosSolidosController::class, 'storeGerador']);
Route::post('/geradores-residuo/{geradorResiduo}/coletas', [ResiduosSolidosController::class, 'storeColeta']);
Route::get('/pontos-logistica-reversa', [ResiduosSolidosController::class, 'indexPontosLogisticaReversa']);
Route::post('/pontos-logistica-reversa', [ResiduosSolidosController::class, 'storePontoLogisticaReversa']);
Route::post('/pontos-logistica-reversa/{pontoLogisticaReversa}/entregas', [ResiduosSolidosController::class, 'storeEntregaLogisticaReversa']);

Route::get('/areas-protegidas', [AreaProtegidaController::class, 'index']);
Route::get('/areas-protegidas/mapa', [AreaProtegidaController::class, 'mapa']);
Route::post('/areas-protegidas', [AreaProtegidaController::class, 'store']);
Route::get('/empreendimentos/{empreendimento}/areas-protegidas-sobrepostas', [AreaProtegidaController::class, 'sobreposicao']);

Route::get('/ocorrencias-queimada', [OcorrenciaQueimadaController::class, 'index']);
Route::get('/ocorrencias-queimada/mapa', [OcorrenciaQueimadaController::class, 'mapa']);
Route::post('/ocorrencias-queimada', [OcorrenciaQueimadaController::class, 'store']);
Route::post('/ocorrencias-queimada/{ocorrenciaQueimada}/responsavel', [OcorrenciaQueimadaController::class, 'storeResponsavel']);

Route::get('/empreendimentos/{empreendimento}/outorgas-agua', [RecursosHidricosController::class, 'indexOutorgas']);
Route::post('/empreendimentos/{empreendimento}/outorgas-agua', [RecursosHidricosController::class, 'storeOutorga']);
Route::get('/empreendimentos/{empreendimento}/licencas-efluente', [RecursosHidricosController::class, 'indexLicencasEfluente']);
Route::post('/empreendimentos/{empreendimento}/licencas-efluente', [RecursosHidricosController::class, 'storeLicencaEfluente']);
Route::post('/parametros-qualidade-efluente/{parametroQualidadeEfluente}/medicoes', [RecursosHidricosController::class, 'storeMedicao']);
