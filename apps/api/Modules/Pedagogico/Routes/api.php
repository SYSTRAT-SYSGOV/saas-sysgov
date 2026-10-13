<?php

declare(strict_types=1);

/*
 * Rotas do módulo Pedagógico — registradas pelo RouteServiceProvider do módulo sob api/pedagogico com
 * auth:sanctum, tenant, bindings e module-access:pedagogico. Os {parâmetros} resolvem models TenantAware
 * (inclusive os do módulo Escola): registro de outro tenant vira 404.
 */

use Illuminate\Support\Facades\Route;
use Modules\Pedagogico\Http\Controllers\AtaController;
use Modules\Pedagogico\Http\Controllers\CronogramaController;
use Modules\Pedagogico\Http\Controllers\FrequenciaController;
use Modules\Pedagogico\Http\Controllers\NotaController;
use Modules\Pedagogico\Http\Controllers\OcorrenciaController;
use Modules\Pedagogico\Http\Controllers\PreConselhoController;
use Modules\Pedagogico\Http\Controllers\TurmaController;

// Turmas (com escopo do professor)
Route::get('/minhas-turmas', [TurmaController::class, 'minhas']);
Route::get('/turmas', [TurmaController::class, 'index']);
Route::get('/turmas/{turma}/alunos', [TurmaController::class, 'alunos']);

// Notas
Route::get('/notas', [NotaController::class, 'index']);
Route::get('/notas/medias', [NotaController::class, 'medias']);
Route::put('/notas', [NotaController::class, 'lancar']);
Route::post('/notas/importar', [NotaController::class, 'importar']);
Route::get('/alunos/{aluno}/notas', [NotaController::class, 'boletim']);

// Ocorrências
Route::get('/ocorrencias', [OcorrenciaController::class, 'index']);
Route::get('/ocorrencias/totais', [OcorrenciaController::class, 'totais']);
Route::post('/ocorrencias', [OcorrenciaController::class, 'store']);
Route::get('/ocorrencias/{ocorrencia}', [OcorrenciaController::class, 'show']);
Route::put('/ocorrencias/{ocorrencia}', [OcorrenciaController::class, 'update']);
Route::delete('/ocorrencias/{ocorrencia}', [OcorrenciaController::class, 'destroy']);
Route::get('/ocorrencias/{ocorrencia}/anexo', [OcorrenciaController::class, 'anexo']);

// Pré-conselho
Route::get('/pre-conselhos', [PreConselhoController::class, 'index']);
Route::get('/pre-conselhos/progresso', [PreConselhoController::class, 'progresso']);
Route::put('/pre-conselhos', [PreConselhoController::class, 'salvar']);
Route::get('/pre-conselhos/{preConselho}', [PreConselhoController::class, 'show']);
Route::delete('/pre-conselhos/{preConselho}', [PreConselhoController::class, 'destroy']);

// Cronograma do pré-conselho
Route::get('/cronogramas', [CronogramaController::class, 'index']);
Route::get('/cronogramas/vigente', [CronogramaController::class, 'vigente']);
Route::post('/cronogramas', [CronogramaController::class, 'store']);
Route::put('/cronogramas/{cronograma}', [CronogramaController::class, 'update']);
Route::delete('/cronogramas/{cronograma}', [CronogramaController::class, 'destroy']);

// Atas do conselho de classe
Route::get('/atas', [AtaController::class, 'index']);
Route::post('/atas', [AtaController::class, 'store']);
Route::get('/atas/{ata}', [AtaController::class, 'show']);
Route::put('/atas/{ata}', [AtaController::class, 'update']);
Route::post('/atas/{ata}/finalizar', [AtaController::class, 'finalizar']);
Route::post('/atas/{ata}/arquivar', [AtaController::class, 'arquivar']);
Route::delete('/atas/{ata}', [AtaController::class, 'destroy']);

// Frequência diária
Route::get('/frequencias', [FrequenciaController::class, 'index']);
Route::get('/frequencias/totais', [FrequenciaController::class, 'totais']);
Route::put('/frequencias', [FrequenciaController::class, 'registrar']);
