<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Multiprofissional\Http\Controllers\AcompanhadoController;
use Modules\Multiprofissional\Http\Controllers\AtendimentoController;
use Modules\Multiprofissional\Http\Controllers\AuditoriaController;
use Modules\Multiprofissional\Http\Controllers\CadastroController;
use Modules\Multiprofissional\Http\Controllers\EquipeController;
use Modules\Multiprofissional\Http\Controllers\ProfissionalController;

/* Rotas do módulo Multiprofissional — prefixo api/multiprofissional (auth:sanctum + tenant + module-access). */

Route::pattern('id', '[0-9]+');
Route::pattern('laudo', '[0-9]+');
Route::pattern('profissional', '[0-9]+');
Route::pattern('equipe', '[0-9]+');
Route::pattern('acompanhado', '[0-9]+');
Route::pattern('atendimento', '[0-9]+');
Route::pattern('tipo', 'cargos|condicoes|tipos-atendimento');

Route::get('/opcoes', [CadastroController::class, 'opcoes']);
Route::get('/alunos', [CadastroController::class, 'alunos']);
Route::get('/usuarios', [CadastroController::class, 'usuarios']);
Route::get('/auditoria', AuditoriaController::class);

// Cadastros simples (cargos, condições, tipos de atendimento)
Route::post('/cadastros/padroes', [CadastroController::class, 'padroes']);
Route::get('/cadastros/{tipo}', [CadastroController::class, 'listar']);
Route::post('/cadastros/{tipo}', [CadastroController::class, 'salvar']);
Route::put('/cadastros/{tipo}/{id}', [CadastroController::class, 'salvar']);
Route::delete('/cadastros/{tipo}/{id}', [CadastroController::class, 'excluir']);

Route::get('/profissionais', [ProfissionalController::class, 'index']);
Route::post('/profissionais', [ProfissionalController::class, 'store']);
Route::put('/profissionais/{profissional}', [ProfissionalController::class, 'update']);
Route::delete('/profissionais/{profissional}', [ProfissionalController::class, 'destroy']);

Route::get('/equipes', [EquipeController::class, 'index']);
Route::post('/equipes', [EquipeController::class, 'store']);
Route::put('/equipes/{equipe}', [EquipeController::class, 'update']);
Route::delete('/equipes/{equipe}', [EquipeController::class, 'destroy']);

Route::get('/acompanhados', [AcompanhadoController::class, 'index']);
Route::post('/acompanhados', [AcompanhadoController::class, 'store']);
Route::get('/acompanhados/{acompanhado}', [AcompanhadoController::class, 'show']);
Route::put('/acompanhados/{acompanhado}', [AcompanhadoController::class, 'update']);
Route::post('/acompanhados/{acompanhado}/laudos', [AcompanhadoController::class, 'anexarLaudo']);
Route::get('/acompanhados/{acompanhado}/laudos/{laudo}', [AcompanhadoController::class, 'arquivoLaudo']);
Route::delete('/acompanhados/{acompanhado}/laudos/{laudo}', [AcompanhadoController::class, 'removerLaudo']);

Route::get('/indicadores', [AtendimentoController::class, 'indicadores']);
Route::get('/atendimentos', [AtendimentoController::class, 'index']);
Route::post('/atendimentos', [AtendimentoController::class, 'store']);
Route::get('/atendimentos/{atendimento}', [AtendimentoController::class, 'show']);
Route::put('/atendimentos/{atendimento}', [AtendimentoController::class, 'update']);
Route::delete('/atendimentos/{atendimento}', [AtendimentoController::class, 'destroy']);
