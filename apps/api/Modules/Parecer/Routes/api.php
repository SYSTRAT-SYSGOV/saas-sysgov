<?php

declare(strict_types=1);

/*
 * Rotas do módulo Parecer Descritivo — registradas pelo RouteServiceProvider sob api/parecer com
 * auth:sanctum, tenant, escola:parecer, bindings e module-access:parecer. Os {parâmetros} resolvem
 * models TenantAware/EscolaAware (inclusive os do Escola): registro de outro tenant ou escola vira 404.
 */

use Illuminate\Support\Facades\Route;
use Modules\Parecer\Http\Controllers\ArquivoController;
use Modules\Parecer\Http\Controllers\AuditoriaController;
use Modules\Parecer\Http\Controllers\AvaliacaoController;
use Modules\Parecer\Http\Controllers\FrequenciaController;
use Modules\Parecer\Http\Controllers\HabilidadeController;
use Modules\Parecer\Http\Controllers\ImpressaoController;
use Modules\Parecer\Http\Controllers\NotaController;
use Modules\Parecer\Http\Controllers\OcorrenciaController;
use Modules\Parecer\Http\Controllers\RelatorioController;
use Modules\Parecer\Http\Controllers\TurmaController;

Route::get('/catalogo', [TurmaController::class, 'catalogo']);

// Turmas (início, alunos com progresso, configuração de série e funções)
Route::get('/turmas', [TurmaController::class, 'index']);
Route::get('/turmas/configuracoes', [TurmaController::class, 'configuracoes']);
Route::get('/turmas/{turma}/alunos', [TurmaController::class, 'alunos']);
Route::put('/turmas/{turma}/configuracao', [TurmaController::class, 'configurar']);
Route::delete('/turmas/{turma}/configuracao', [TurmaController::class, 'remover']);

// Avaliar
Route::get('/alunos/{aluno}/avaliacao', [AvaliacaoController::class, 'show']);
Route::put('/alunos/{aluno}/avaliacao', [AvaliacaoController::class, 'salvar']);
Route::get('/alunos/{aluno}/foto', [ArquivoController::class, 'foto']);
Route::get('/escola/logo', [ArquivoController::class, 'logo']);

// Conteúdos (habilidades) e BNCC
Route::get('/habilidades', [HabilidadeController::class, 'index']);
Route::post('/habilidades', [HabilidadeController::class, 'store']);
Route::put('/habilidades/trimestres', [HabilidadeController::class, 'trimestres']);
Route::post('/habilidades/copiar', [HabilidadeController::class, 'copiar']);
Route::put('/habilidades/{habilidade}', [HabilidadeController::class, 'update']);
Route::post('/habilidades/{habilidade}/ativo', [HabilidadeController::class, 'ativo']);
Route::post('/habilidades/{habilidade}/mover', [HabilidadeController::class, 'mover']);
Route::delete('/habilidades/{habilidade}', [HabilidadeController::class, 'destroy']);
Route::get('/bncc', [HabilidadeController::class, 'bncc']);
Route::post('/bncc', [HabilidadeController::class, 'adicionarBncc']);

// Notas
Route::get('/notas', [NotaController::class, 'index']);
Route::put('/notas', [NotaController::class, 'lancar']);
Route::post('/notas/importar', [NotaController::class, 'importar']);
Route::get('/notas/planilha', [NotaController::class, 'planilha']);

// Frequência diária
Route::get('/frequencias', [FrequenciaController::class, 'grade']);
Route::get('/frequencias/dia', [FrequenciaController::class, 'dia']);
Route::put('/frequencias', [FrequenciaController::class, 'registrar']);
Route::delete('/frequencias', [FrequenciaController::class, 'apagar']);

// Ocorrências
Route::get('/ocorrencias', [OcorrenciaController::class, 'index']);
Route::get('/ocorrencias/planilha', [OcorrenciaController::class, 'planilha']);
Route::post('/ocorrencias', [OcorrenciaController::class, 'store']);
Route::post('/ocorrencias/{ocorrencia}', [OcorrenciaController::class, 'update']);
Route::delete('/ocorrencias/{ocorrencia}', [OcorrenciaController::class, 'destroy']);
Route::get('/ocorrencias/{ocorrencia}/anexo', [OcorrenciaController::class, 'anexo']);

// Impressão, relatórios e auditoria
Route::get('/impressao', ImpressaoController::class);
Route::get('/relatorios', RelatorioController::class);
Route::get('/auditoria', AuditoriaController::class);
