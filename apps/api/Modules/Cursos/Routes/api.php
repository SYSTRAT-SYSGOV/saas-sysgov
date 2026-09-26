<?php

declare(strict_types=1);

/*
 * Rotas autenticadas do módulo Cursos — registradas pelo RouteServiceProvider
 * do módulo sob api/cursos com auth:sanctum, tenant, bindings e
 * module-access:cursos. Os {parâmetros} resolvem models TenantAware: registro
 * de outro tenant vira 404.
 */

use Illuminate\Support\Facades\Route;
use Modules\Cursos\Http\Controllers\AulaController;
use Modules\Cursos\Http\Controllers\CatalogoController;
use Modules\Cursos\Http\Controllers\CertificadoController;
use Modules\Cursos\Http\Controllers\CursoController;
use Modules\Cursos\Http\Controllers\FormacaoController;
use Modules\Cursos\Http\Controllers\InscricaoController;
use Modules\Cursos\Http\Controllers\ModeloCertificadoController;
use Modules\Cursos\Http\Controllers\PresencaController;
use Modules\Cursos\Http\Controllers\TurmaController;
use Modules\Cursos\Http\Controllers\UsuarioOrgaoController;

// Participante
Route::get('/catalogo', [CatalogoController::class, 'index']);
Route::get('/minhas-inscricoes', [InscricaoController::class, 'minhas']);
Route::get('/meus-certificados', [CertificadoController::class, 'meus']);

// Instrutor
Route::get('/minhas-turmas', [TurmaController::class, 'minhas']);

// Usuários do órgão (instrutores e inscrição direta)
Route::get('/usuarios', UsuarioOrgaoController::class);

// Cursos e aulas
Route::get('/cursos', [CursoController::class, 'index']);
Route::post('/cursos', [CursoController::class, 'store']);
Route::get('/cursos/{curso}', [CursoController::class, 'show']);
Route::put('/cursos/{curso}', [CursoController::class, 'update']);
Route::delete('/cursos/{curso}', [CursoController::class, 'destroy']);
Route::post('/cursos/{curso}/status', [CursoController::class, 'alterarStatus']);
Route::post('/cursos/{curso}/capa', [CursoController::class, 'definirCapa']);
Route::delete('/cursos/{curso}/capa', [CursoController::class, 'removerCapa']);

Route::get('/cursos/{curso}/aulas', [AulaController::class, 'index']);
Route::post('/cursos/{curso}/aulas', [AulaController::class, 'store']);
Route::put('/aulas/{aula}', [AulaController::class, 'update']);
Route::delete('/aulas/{aula}', [AulaController::class, 'destroy']);

// Formações
Route::get('/formacoes', [FormacaoController::class, 'index']);
Route::post('/formacoes', [FormacaoController::class, 'store']);
Route::get('/formacoes/{formacao}', [FormacaoController::class, 'show']);
Route::put('/formacoes/{formacao}', [FormacaoController::class, 'update']);
Route::delete('/formacoes/{formacao}', [FormacaoController::class, 'destroy']);

// Turmas e agendamento de aulas
Route::get('/cursos/{curso}/turmas', [TurmaController::class, 'index']);
Route::post('/cursos/{curso}/turmas', [TurmaController::class, 'store']);
Route::get('/turmas/{turma}', [TurmaController::class, 'show']);
Route::put('/turmas/{turma}', [TurmaController::class, 'update']);
Route::post('/turmas/{turma}/cancelar', [TurmaController::class, 'cancelar']);
Route::post('/turmas/{turma}/agendamentos', [TurmaController::class, 'agendar']);
Route::delete('/agendamentos/{agendamento}', [TurmaController::class, 'desagendar']);

// Inscrições
Route::get('/turmas/{turma}/inscricoes', [InscricaoController::class, 'index']);
Route::get('/turmas/{turma}/inscricoes/exportar', [InscricaoController::class, 'exportar']);
Route::post('/turmas/{turma}/inscricoes', [InscricaoController::class, 'inscrever']);
Route::post('/turmas/{turma}/inscricoes/direta', [InscricaoController::class, 'inscreverDireto']);
Route::get('/inscricoes/{inscricao}', [InscricaoController::class, 'show']);
Route::post('/inscricoes/{inscricao}/aprovar', [InscricaoController::class, 'aprovar']);
Route::post('/inscricoes/{inscricao}/recusar', [InscricaoController::class, 'recusar']);
Route::post('/inscricoes/{inscricao}/cancelar', [InscricaoController::class, 'cancelar']);

// Presença: chamada manual e check-in por QR code
Route::get('/agendamentos/{agendamento}/chamada', [PresencaController::class, 'chamada']);
Route::put('/agendamentos/{agendamento}/chamada', [PresencaController::class, 'registrarChamada']);
Route::get('/agendamentos/{agendamento}/qr-token', [PresencaController::class, 'qrToken']);
Route::post('/check-in', [PresencaController::class, 'checkIn']);

// Encerramento e certificados
Route::post('/turmas/{turma}/encerrar', [CertificadoController::class, 'encerrarTurma']);
Route::post('/turmas/{turma}/certificados/emitir-pendentes', [CertificadoController::class, 'emitirPendentes']);
Route::get('/certificados', [CertificadoController::class, 'index']);
Route::get('/certificados/{certificado}/pdf', [CertificadoController::class, 'pdf']);
Route::post('/certificados/{certificado}/revogar', [CertificadoController::class, 'revogar']);

Route::get('/modelos-certificado', [ModeloCertificadoController::class, 'index']);
Route::post('/modelos-certificado', [ModeloCertificadoController::class, 'store']);
Route::put('/modelos-certificado/{modelo}', [ModeloCertificadoController::class, 'update']);
Route::delete('/modelos-certificado/{modelo}', [ModeloCertificadoController::class, 'destroy']);
Route::post('/modelos-certificado/{modelo}/logotipo', [ModeloCertificadoController::class, 'logotipo']);
Route::post('/modelos-certificado/{modelo}/assinaturas/{indice}/imagem', [ModeloCertificadoController::class, 'imagemAssinatura'])->whereNumber('indice');
