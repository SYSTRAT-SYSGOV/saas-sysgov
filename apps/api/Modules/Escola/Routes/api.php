<?php

declare(strict_types=1);

/*
 * Rotas do módulo Escola — registradas pelo RouteServiceProvider do módulo sob api/escola com
 * auth:sanctum, tenant, bindings e module-access:escola. Os {parâmetros} resolvem models TenantAware:
 * registro de outro tenant vira 404.
 */

use Illuminate\Support\Facades\Route;
use Modules\Escola\Http\Controllers\AlunoController;
use Modules\Escola\Http\Controllers\CategoriaOcorrenciaController;
use Modules\Escola\Http\Controllers\EquipeController;
use Modules\Escola\Http\Controllers\MateriaController;
use Modules\Escola\Http\Controllers\ProfessorController;
use Modules\Escola\Http\Controllers\TrimestreController;
use Modules\Escola\Http\Controllers\TurmaController;
use Modules\Escola\Http\Controllers\TurnoController;
use Modules\Escola\Http\Controllers\UnidadeController;

// Unidade
Route::get('/unidade', [UnidadeController::class, 'show']);
Route::put('/unidade', [UnidadeController::class, 'update']);
Route::post('/unidade/logo', [UnidadeController::class, 'enviarLogo']);
Route::get('/unidade/logo', [UnidadeController::class, 'logo']);

// Turnos
Route::get('/turnos', [TurnoController::class, 'index']);
Route::post('/turnos', [TurnoController::class, 'store']);
Route::put('/turnos/{turno}', [TurnoController::class, 'update']);
Route::delete('/turnos/{turno}', [TurnoController::class, 'destroy']);

// Turmas e vínculos turma × matéria × professor
Route::get('/professores', ProfessorController::class);
Route::get('/turmas', [TurmaController::class, 'index']);
Route::post('/turmas', [TurmaController::class, 'store']);
Route::get('/turmas/{turma}', [TurmaController::class, 'show']);
Route::put('/turmas/{turma}', [TurmaController::class, 'update']);
Route::delete('/turmas/{turma}', [TurmaController::class, 'destroy']);
Route::post('/turmas/{turma}/duplicar', [TurmaController::class, 'duplicar']);
Route::put('/turmas/{turma}/materias', [TurmaController::class, 'sincronizarMaterias']);
Route::post('/turmas/{turma}/limpar', [AlunoController::class, 'limparTurma']);

// Alunos
Route::get('/alunos', [AlunoController::class, 'index']);
Route::post('/alunos', [AlunoController::class, 'store']);
Route::post('/alunos/importar', [AlunoController::class, 'importar']);
Route::post('/alunos/excluir', [AlunoController::class, 'excluirVarios']);
Route::get('/alunos/{aluno}', [AlunoController::class, 'show']);
Route::put('/alunos/{aluno}', [AlunoController::class, 'update']);
Route::delete('/alunos/{aluno}', [AlunoController::class, 'destroy']);
Route::post('/alunos/{aluno}/foto', [AlunoController::class, 'enviarFoto']);
Route::get('/alunos/{aluno}/foto', [AlunoController::class, 'foto']);

// Matérias
Route::get('/materias', [MateriaController::class, 'index']);
Route::post('/materias', [MateriaController::class, 'store']);
Route::get('/materias/exportar', [MateriaController::class, 'exportar']);
Route::post('/materias/importar', [MateriaController::class, 'importar']);
Route::put('/materias/{materia}', [MateriaController::class, 'update']);
Route::delete('/materias/{materia}', [MateriaController::class, 'destroy']);

// Trimestres
Route::get('/trimestres', [TrimestreController::class, 'index']);
Route::post('/trimestres', [TrimestreController::class, 'store']);
Route::put('/trimestres/{trimestre}', [TrimestreController::class, 'update']);
Route::delete('/trimestres/{trimestre}', [TrimestreController::class, 'destroy']);

// Categorias de ocorrência
Route::get('/categorias', [CategoriaOcorrenciaController::class, 'index']);
Route::post('/categorias', [CategoriaOcorrenciaController::class, 'store']);
Route::put('/categorias/{categoria}', [CategoriaOcorrenciaController::class, 'update']);
Route::delete('/categorias/{categoria}', [CategoriaOcorrenciaController::class, 'destroy']);

// Equipe gestora (design D17)
Route::get('/equipe', [EquipeController::class, 'index']);
Route::get('/pessoas', \Modules\Escola\Http\Controllers\PessoaBuscaController::class);
Route::post('/equipe', [EquipeController::class, 'store']);
Route::put('/equipe/{membro}', [EquipeController::class, 'update']);
Route::delete('/equipe/{membro}', [EquipeController::class, 'destroy']);
