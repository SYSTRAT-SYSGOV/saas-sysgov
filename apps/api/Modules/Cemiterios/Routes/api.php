<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Controllers\AuditoriaController;
use Modules\Cemiterios\Http\Controllers\CemiterioController;
use Modules\Cemiterios\Http\Controllers\ConcessaoController;
use Modules\Cemiterios\Http\Controllers\EmpreiteiroController;
use Modules\Cemiterios\Http\Controllers\FalecidoController;
use Modules\Cemiterios\Http\Controllers\FinanceiroController;
use Modules\Cemiterios\Http\Controllers\GisController;
use Modules\Cemiterios\Http\Controllers\JazigoController;
use Modules\Cemiterios\Http\Controllers\OperadorCemiterioController;
use Modules\Cemiterios\Http\Controllers\OperacaoController;
use Modules\Cemiterios\Http\Controllers\OrdemServicoController;
use Modules\Cemiterios\Http\Controllers\ParametroController;
use Modules\Cemiterios\Http\Controllers\ProcessoSucessaoController;
use Modules\Cemiterios\Http\Controllers\VistoriaController;

/*
| Rotas do painel do órgão — prefixo api/cemiterios, com auth:sanctum,
| resolve.tenant e module-access:cemiterios (RouteServiceProvider).
*/

Route::pattern('id', '[0-9]+');

Route::get('/auditoria', [AuditoriaController::class, 'index']);
Route::get('/auditoria/verificar', [AuditoriaController::class, 'verificar']);

Route::get('/parametros', [ParametroController::class, 'index']);
Route::post('/parametros', [ParametroController::class, 'store']);

// Inventário
Route::get('/parques', [CemiterioController::class, 'index']);
Route::post('/parques', [CemiterioController::class, 'store']);
Route::get('/parques/{parque}', [CemiterioController::class, 'show'])->whereNumber('parque');
Route::put('/parques/{parque}', [CemiterioController::class, 'update'])->whereNumber('parque');
Route::delete('/parques/{parque}', [CemiterioController::class, 'destroy'])->whereNumber('parque');
Route::post('/parques/{parque}/setores', [CemiterioController::class, 'storeSetor'])->whereNumber('parque');
Route::put('/parques/{parque}/setores/{setor}', [CemiterioController::class, 'updateSetor'])->whereNumber(['parque', 'setor']);

Route::get('/jazigos', [JazigoController::class, 'index']);
Route::post('/jazigos', [JazigoController::class, 'store']);
Route::get('/jazigos/{jazigo}', [JazigoController::class, 'show'])->whereNumber('jazigo');
Route::put('/jazigos/{jazigo}', [JazigoController::class, 'update'])->whereNumber('jazigo');
Route::post('/jazigos/{jazigo}/estado', [JazigoController::class, 'estado'])->whereNumber('jazigo');
Route::get('/jazigos/{jazigo}/historico', [JazigoController::class, 'historico'])->whereNumber('jazigo');

// GIS
Route::get('/gis/camadas', [GisController::class, 'camadas']);
Route::put('/gis/geometrias/{tipo}/{id}', [GisController::class, 'salvarGeometria'])->whereIn('tipo', ['parque', 'setor', 'jazigo']);
Route::post('/gis/setores/{id}/gerar-grade', [GisController::class, 'gerarGrade']);
Route::get('/gis/mapa-base/sessao', [GisController::class, 'sessaoMapaBase']);
Route::get('/gis/exportar', [GisController::class, 'exportar']);
Route::get('/busca', [GisController::class, 'buscar']);

// Falecidos e operações
Route::get('/falecidos', [FalecidoController::class, 'index']);
Route::post('/falecidos', [FalecidoController::class, 'store']);
Route::get('/falecidos/{id}', [FalecidoController::class, 'show']);
Route::put('/falecidos/{id}', [FalecidoController::class, 'update']);
Route::get('/falecidos/{id}/dados-restritos', [FalecidoController::class, 'dadosRestritos']);

Route::get('/inumacoes', [OperacaoController::class, 'inumacoes']);
Route::post('/inumacoes', [OperacaoController::class, 'inumar']);
Route::post('/inumacoes/historicas', [OperacaoController::class, 'inumarHistorica']);
Route::put('/inumacoes/{id}', [OperacaoController::class, 'update']);
Route::post('/inumacoes/{id}/revisar', [OperacaoController::class, 'revisar']);
Route::post('/inumacoes/{id}/cancelar', [OperacaoController::class, 'cancelarInumacao']);

Route::get('/exumacoes', [OperacaoController::class, 'exumacoes']);
Route::post('/exumacoes', [OperacaoController::class, 'exumar']);
Route::get('/trasladacoes', [OperacaoController::class, 'trasladacoes']);
Route::post('/trasladacoes', [OperacaoController::class, 'trasladar']);

Route::get('/ordens-servico', [OrdemServicoController::class, 'index']);
Route::get('/ordens-servico/{id}', [OrdemServicoController::class, 'show']);
Route::get('/ordens-servico/{id}/pdf', [OrdemServicoController::class, 'pdf']);
Route::post('/ordens-servico/{id}/{acao}', [OrdemServicoController::class, 'transicao'])
    ->whereIn('acao', ['iniciar', 'concluir', 'suspender', 'cancelar']);

// Concessões
Route::get('/concessionarios', [ConcessaoController::class, 'titulares']);
Route::post('/concessionarios', [ConcessaoController::class, 'storeTitular']);
Route::get('/concessionarios/{id}', [ConcessaoController::class, 'showTitular']);
Route::put('/concessionarios/{id}', [ConcessaoController::class, 'updateTitular']);

Route::get('/concessoes', [ConcessaoController::class, 'index']);
Route::post('/concessoes', [ConcessaoController::class, 'store']);
Route::get('/concessoes/{id}', [ConcessaoController::class, 'show']);
Route::post('/concessoes/{id}/renovar', [ConcessaoController::class, 'renovar']);

// Financeiro
Route::get('/precos', [FinanceiroController::class, 'precos']);
Route::post('/precos', [FinanceiroController::class, 'storePreco']);
Route::get('/precos/reajustes', [FinanceiroController::class, 'reajustes']);
Route::post('/precos/reajustes', [FinanceiroController::class, 'reajusteManual']);

Route::get('/guias', [FinanceiroController::class, 'guias']);
Route::post('/guias/lote-anual', [FinanceiroController::class, 'loteAnual']);
Route::get('/guias/{id}/pdf', [FinanceiroController::class, 'pdf']);
Route::post('/guias/{id}/segunda-via', [FinanceiroController::class, 'segundaVia']);
Route::post('/guias/{id}/baixa', [FinanceiroController::class, 'baixa']);
Route::get('/relatorios/inadimplencia', [FinanceiroController::class, 'inadimplencia']);

// Empreiteiros e obras
Route::get('/empreiteiros', [EmpreiteiroController::class, 'index']);
Route::post('/empreiteiros', [EmpreiteiroController::class, 'store']);
Route::get('/empreiteiros/{id}', [EmpreiteiroController::class, 'show']);
Route::post('/empreiteiros/{id}/alvaras', [EmpreiteiroController::class, 'alvara']);
Route::post('/empreiteiros/{id}/penalidades', [EmpreiteiroController::class, 'penalidade']);
Route::get('/alvaras-obra', [EmpreiteiroController::class, 'obras']);
Route::post('/alvaras-obra', [EmpreiteiroController::class, 'storeObra']);
Route::put('/alvaras-obra/{id}', [EmpreiteiroController::class, 'updateObra']);

// Vistoria e abandono
Route::get('/vistorias', [VistoriaController::class, 'index']);
Route::post('/vistorias', [VistoriaController::class, 'store']);
Route::get('/vistorias/{id}/fotos/{foto}', [VistoriaController::class, 'foto'])->whereNumber('foto');

Route::get('/processos-abandono', [VistoriaController::class, 'processos']);
Route::post('/processos-abandono', [VistoriaController::class, 'instaurar']);
Route::get('/processos-abandono/{id}', [VistoriaController::class, 'processo']);
Route::post('/processos-abandono/{id}/{etapa}', [VistoriaController::class, 'etapa'])
    ->whereIn('etapa', ['edital', 'manifestacao', 'decisao']);

// Regularização de Sucessão Hereditária
Route::get('/sucessoes/pendencias', [ProcessoSucessaoController::class, 'pendencias']);
Route::get('/sucessoes', [ProcessoSucessaoController::class, 'index']);
Route::post('/sucessoes', [ProcessoSucessaoController::class, 'store']);
Route::get('/sucessoes/{id}', [ProcessoSucessaoController::class, 'show']);
Route::post('/sucessoes/{id}/herdeiros', [ProcessoSucessaoController::class, 'adicionarHerdeiro']);
Route::post('/sucessoes/{id}/deferir', [ProcessoSucessaoController::class, 'deferir']);
Route::post('/sucessoes/{id}/indeferir', [ProcessoSucessaoController::class, 'indeferir']);
Route::get('/sucessoes/{id}/termo', [ProcessoSucessaoController::class, 'termoDados']);

// Gestão de Operadores (Coveiros e Pedreiros Credenciados)
Route::get('/operadores', [OperadorCemiterioController::class, 'index']);
Route::post('/operadores', [OperadorCemiterioController::class, 'store']);
Route::get('/operadores/{id}', [OperadorCemiterioController::class, 'show']);
Route::put('/operadores/{id}', [OperadorCemiterioController::class, 'update']);
Route::get('/operadores/{id}/historico', [OperadorCemiterioController::class, 'historico']);

