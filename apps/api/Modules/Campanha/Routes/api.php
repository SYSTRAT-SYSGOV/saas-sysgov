<?php

declare(strict_types=1);

/*
 * Rotas da campanha de trabalho (cabeçalho X-Campanha-ID) — registradas sob api/campanha com
 * auth:sanctum, tenant, campanha, bindings e module-access:campanha.
 */

use Illuminate\Support\Facades\Route;
use Modules\Campanha\Http\Controllers\AgendaController;
use Modules\Campanha\Http\Controllers\ContextoController;
use Modules\Campanha\Http\Controllers\EquipeController;
use Modules\Campanha\Http\Controllers\FinanceiroController;
use Modules\Campanha\Http\Controllers\MaterialController;
use Modules\Campanha\Http\Controllers\PesquisaController;

Route::get('/atual', [ContextoController::class, 'atual']);

// Municípios na campanha, ficha, mapa e painel
Route::get('/municipios', [\Modules\Campanha\Http\Controllers\MunicipioController::class, 'index']);
Route::get('/municipios/{codigoIbge}', [\Modules\Campanha\Http\Controllers\MunicipioController::class, 'show'])->whereNumber('codigoIbge');
Route::put('/municipios/{codigoIbge}', [\Modules\Campanha\Http\Controllers\MunicipioController::class, 'update'])->whereNumber('codigoIbge');
Route::get('/mapa', [\Modules\Campanha\Http\Controllers\MunicipioController::class, 'mapa']);
Route::get('/painel', [\Modules\Campanha\Http\Controllers\MunicipioController::class, 'painel']);

// Equipes e relacionamento

Route::get('/coordenadores', [EquipeController::class, 'coordenadores']);
Route::post('/coordenadores', [EquipeController::class, 'salvarCoordenador']);
Route::put('/coordenadores/{coordenador}', [EquipeController::class, 'salvarCoordenador']);
Route::delete('/coordenadores/{coordenador}', [EquipeController::class, 'excluirCoordenador']);
Route::get('/cabos', [EquipeController::class, 'cabos']);
Route::post('/cabos', [EquipeController::class, 'salvarCabo']);
Route::put('/cabos/{cabo}', [EquipeController::class, 'salvarCabo']);
Route::delete('/cabos/{cabo}', [EquipeController::class, 'excluirCabo']);
Route::get('/prefeitos', [EquipeController::class, 'prefeitos']);
Route::put('/prefeitos/{codigoIbge}', [EquipeController::class, 'salvarPrefeito'])->whereNumber('codigoIbge');
Route::delete('/prefeitos/{codigoIbge}', [EquipeController::class, 'excluirPrefeito'])->whereNumber('codigoIbge');
Route::get('/vereadores', [EquipeController::class, 'vereadores']);
Route::post('/vereadores', [EquipeController::class, 'salvarVereador']);
Route::put('/vereadores/{vereador}', [EquipeController::class, 'salvarVereador']);
Route::delete('/vereadores/{vereador}', [EquipeController::class, 'excluirVereador']);
Route::put('/configuracao', [EquipeController::class, 'configurar']);

// Captação de eleitores (Fase 2A)
Route::get('/links', [\Modules\Campanha\Http\Controllers\LinkCaptacaoController::class, 'index']);
Route::post('/links', [\Modules\Campanha\Http\Controllers\LinkCaptacaoController::class, 'store']);
Route::put('/links/{link}', [\Modules\Campanha\Http\Controllers\LinkCaptacaoController::class, 'update']);
Route::delete('/links/{link}', [\Modules\Campanha\Http\Controllers\LinkCaptacaoController::class, 'destroy']);
Route::get('/links/{link}/qrcode', [\Modules\Campanha\Http\Controllers\LinkCaptacaoController::class, 'qrcode']);
Route::get('/eleitores', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'index']);
Route::get('/eleitores/indicadores', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'indicadores']);
Route::get('/eleitores/exportar', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'exportar']);
Route::get('/eleitores/{eleitor}', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'show'])->whereNumber('eleitor');
Route::delete('/eleitores/{eleitor}', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'destroy'])->whereNumber('eleitor');
Route::get('/mapa-calor', [\Modules\Campanha\Http\Controllers\EleitorController::class, 'mapaCalor']);

// Demandas
Route::get('/demandas', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'index']);
Route::get('/demandas/responsaveis', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'responsaveis']);
Route::post('/demandas', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'store']);
Route::put('/demandas/{demanda}', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'update'])->whereNumber('demanda');
Route::delete('/demandas/{demanda}', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'destroy'])->whereNumber('demanda');
Route::post('/eleitores/{eleitor}/demanda', [\Modules\Campanha\Http\Controllers\DemandaController::class, 'doEleitor'])->whereNumber('eleitor');

// Fase 2B — materiais e logística
Route::get('/materiais', [MaterialController::class, 'index']);
Route::post('/materiais', [MaterialController::class, 'store']);
Route::put('/materiais/{material}', [MaterialController::class, 'update'])->whereNumber('material');
Route::delete('/materiais/{material}', [MaterialController::class, 'destroy'])->whereNumber('material');
Route::get('/materiais/{material}/imagem', [MaterialController::class, 'imagem'])->whereNumber('material');
Route::post('/materiais/{material}/imagem', [MaterialController::class, 'enviarImagem'])->whereNumber('material');
Route::get('/remessas', [MaterialController::class, 'remessas']);
Route::post('/remessas', [MaterialController::class, 'salvarRemessa']);
Route::put('/remessas/{remessa}', [MaterialController::class, 'salvarRemessa'])->whereNumber('remessa');
Route::delete('/remessas/{remessa}', [MaterialController::class, 'excluirRemessa'])->whereNumber('remessa');
Route::get('/remessas/{remessa}/foto', [MaterialController::class, 'foto'])->whereNumber('remessa');
Route::post('/remessas/{remessa}/foto', [MaterialController::class, 'enviarFoto'])->whereNumber('remessa');

// Financeiro (livro-caixa + campos da prestação de contas)
Route::get('/financeiro/opcoes', [FinanceiroController::class, 'opcoes']);
Route::get('/financeiro/resumo', [FinanceiroController::class, 'resumo']);
Route::get('/financeiro/exportar', [FinanceiroController::class, 'exportar']);
Route::get('/lancamentos', [FinanceiroController::class, 'index']);
Route::post('/lancamentos', [FinanceiroController::class, 'store']);
Route::put('/lancamentos/{lancamento}', [FinanceiroController::class, 'update'])->whereNumber('lancamento');
Route::delete('/lancamentos/{lancamento}', [FinanceiroController::class, 'destroy'])->whereNumber('lancamento');
Route::get('/lancamentos/{lancamento}/comprovante', [FinanceiroController::class, 'comprovante'])->whereNumber('lancamento');
Route::post('/lancamentos/{lancamento}/comprovante', [FinanceiroController::class, 'enviarComprovante'])->whereNumber('lancamento');

// Agenda
Route::get('/agenda', [AgendaController::class, 'index']);
Route::get('/agenda/proximos', [AgendaController::class, 'proximos']);
Route::post('/eventos', [AgendaController::class, 'salvarEvento']);
Route::put('/eventos/{evento}', [AgendaController::class, 'salvarEvento'])->whereNumber('evento');
Route::delete('/eventos/{evento}', [AgendaController::class, 'excluirEvento'])->whereNumber('evento');
Route::post('/reunioes', [AgendaController::class, 'salvarReuniao']);
Route::put('/reunioes/{reuniao}', [AgendaController::class, 'salvarReuniao'])->whereNumber('reuniao');
Route::delete('/reunioes/{reuniao}', [AgendaController::class, 'excluirReuniao'])->whereNumber('reuniao');
Route::post('/visitas', [AgendaController::class, 'salvarVisita']);
Route::put('/visitas/{visita}', [AgendaController::class, 'salvarVisita'])->whereNumber('visita');
Route::delete('/visitas/{visita}', [AgendaController::class, 'excluirVisita'])->whereNumber('visita');
Route::post('/visitas/{visita}/demanda', [AgendaController::class, 'demandaDaVisita'])->whereNumber('visita');

// Pesquisas
Route::get('/pesquisas', [PesquisaController::class, 'index']);
Route::get('/pesquisas/evolucao', [PesquisaController::class, 'evolucao']);
Route::post('/pesquisas', [PesquisaController::class, 'store']);
Route::put('/pesquisas/{pesquisa}', [PesquisaController::class, 'update'])->whereNumber('pesquisa');
Route::delete('/pesquisas/{pesquisa}', [PesquisaController::class, 'destroy'])->whereNumber('pesquisa');
