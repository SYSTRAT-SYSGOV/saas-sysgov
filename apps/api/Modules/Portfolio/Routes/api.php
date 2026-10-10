<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Portfolio\Http\Controllers\ConsultaController;
use Modules\Portfolio\Http\Controllers\ImagemController;
use Modules\Portfolio\Http\Controllers\RelatorioController;
use Modules\Portfolio\Http\Controllers\TrabalhoController;

Route::get('turmas', [ConsultaController::class, 'turmas']);
Route::get('turmas/{turma}/alunos', [ConsultaController::class, 'alunos']);
Route::get('turmas/{turma}/materias', [ConsultaController::class, 'materias']);
Route::get('alunos/{aluno}/trabalhos', [ConsultaController::class, 'trabalhos']);
Route::get('alunos/{aluno}/desempenho', [ConsultaController::class, 'desempenho']);
Route::get('alunos/{aluno}/relatorio', [RelatorioController::class, 'show']);
Route::post('alunos/{aluno}/trabalhos', [TrabalhoController::class, 'store']);
Route::put('trabalhos/{trabalho}', [TrabalhoController::class, 'update']);
Route::delete('trabalhos/{trabalho}', [TrabalhoController::class, 'destroy']);
Route::post('trabalhos/{trabalho}/imagens', [ImagemController::class, 'store']);
Route::get('trabalhos/{trabalho}/imagens/{imagem}', [ImagemController::class, 'show']);
Route::delete('trabalhos/{trabalho}/imagens/{imagem}', [ImagemController::class, 'destroy']);
