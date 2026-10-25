<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Educa\Http\Controllers\AcademicCalendarController;
use Modules\Educa\Http\Controllers\AcademicStageController;
use Modules\Educa\Http\Controllers\AcademicYearController;
use Modules\Educa\Http\Controllers\CalendarDayController;
use Modules\Educa\Http\Controllers\CalendarDayReasonController;
use Modules\Educa\Http\Controllers\EducaController;
use Modules\Educa\Http\Controllers\LdbComplianceController;

/*
|--------------------------------------------------------------------------
| Rotas da API do Módulo Educa
|--------------------------------------------------------------------------
|
| Prefixo global: /api/educa
| Middlewares: auth:sanctum, tenant, bindings, module-access:educa
|
*/

// Endpoint de teste/scaffold
Route::get('/', [EducaController::class, 'index'])->name('educa.index');

// ── Submódulo Core: Anos Letivos, Etapas, Calendário e LDB ──────────────
Route::prefix('core')->group(function (): void {
    // Anos Letivos
    Route::get('/anos-letivos', [AcademicYearController::class, 'index'])->name('educa.core.anos-letivos.index');
    Route::post('/anos-letivos', [AcademicYearController::class, 'store'])->name('educa.core.anos-letivos.store');
    Route::post('/anos-letivos/lote', [AcademicYearController::class, 'batch'])->name('educa.core.anos-letivos.batch');
    Route::get('/anos-letivos/{anoLetivoId}', [AcademicYearController::class, 'show'])->name('educa.core.anos-letivos.show');
    Route::put('/anos-letivos/{anoLetivoId}', [AcademicYearController::class, 'update'])->name('educa.core.anos-letivos.update');
    Route::delete('/anos-letivos/{anoLetivoId}', [AcademicYearController::class, 'destroy'])->name('educa.core.anos-letivos.destroy');
    Route::post('/anos-letivos/{anoLetivoId}/transicoes', [AcademicYearController::class, 'transition'])->name('educa.core.anos-letivos.transition');

    // Etapas do Ano Letivo
    Route::get('/anos-letivos/{anoLetivoId}/etapas', [AcademicStageController::class, 'index'])->name('educa.core.etapas.index');
    Route::put('/anos-letivos/{anoLetivoId}/etapas', [AcademicStageController::class, 'replace'])->name('educa.core.etapas.replace');

    // Conformidade com LDB (200 dias e 800 horas)
    Route::get('/anos-letivos/{anoLetivoId}/conformidade-ldb', [LdbComplianceController::class, 'show'])->name('educa.core.ldb.show');

    // Calendários Escolares (Rede e Escolas)
    Route::get('/calendarios', [AcademicCalendarController::class, 'index'])->name('educa.core.calendarios.index');
    Route::post('/calendarios', [AcademicCalendarController::class, 'store'])->name('educa.core.calendarios.store');
    Route::get('/calendarios/{calendarioId}', [AcademicCalendarController::class, 'show'])->name('educa.core.calendarios.show');
    Route::put('/calendarios/{calendarioId}', [AcademicCalendarController::class, 'update'])->name('educa.core.calendarios.update');
    Route::delete('/calendarios/{calendarioId}', [AcademicCalendarController::class, 'destroy'])->name('educa.core.calendarios.destroy');
    Route::post('/calendarios/{calendarioId}/publicar', [AcademicCalendarController::class, 'publish'])->name('educa.core.calendarios.publish');
    Route::post('/calendarios/{calendarioId}/importar-rede', [AcademicCalendarController::class, 'importFromNetwork'])->name('educa.core.calendarios.import-rede');

    // Dias do Calendário
    Route::get('/calendarios/{calendarioId}/dias', [CalendarDayController::class, 'index'])->name('educa.core.dias.index');
    Route::put('/calendarios/{calendarioId}/dias', [CalendarDayController::class, 'save'])->name('educa.core.dias.save');

    // Eventos do Calendário
    Route::get('/calendarios/{calendarioId}/eventos', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'index'])->name('educa.core.eventos.index');
    Route::post('/calendarios/{calendarioId}/eventos', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'store'])->name('educa.core.eventos.store');
    Route::get('/calendarios/{calendarioId}/eventos/{eventoId}', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'show'])->name('educa.core.eventos.show');
    Route::put('/calendarios/{calendarioId}/eventos/{eventoId}', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'update'])->name('educa.core.eventos.update');
    Route::delete('/calendarios/{calendarioId}/eventos/{eventoId}', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'destroy'])->name('educa.core.eventos.destroy');

    // Vínculo de Turmas por Dia (Dias Extras / Reposição)
    Route::get('/calendarios/{calendarioId}/dias/{diaId}/turmas', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'turmasDoDia'])->name('educa.core.dias.turmas.index');
    Route::put('/calendarios/{calendarioId}/dias/{diaId}/turmas', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'sincronizarTurmasDoDia'])->name('educa.core.dias.turmas.sync');

    // Catálogo de Motivos de Dia (Feriados, Recesso, Sábados Letivos)
    Route::get('/motivos-dia', [CalendarDayReasonController::class, 'index'])->name('educa.core.motivos-dia.index');
    Route::post('/motivos-dia', [CalendarDayReasonController::class, 'store'])->name('educa.core.motivos-dia.store');
    Route::put('/motivos-dia/{motivoId}', [CalendarDayReasonController::class, 'update'])->name('educa.core.motivos-dia.update');

    // ── Escolas (Extensão da OrgUnit) ─────────────────────────────────────────
    Route::get('/escolas', [\Modules\Educa\Http\Controllers\SchoolController::class, 'index'])->name('educa.core.escolas.index');
    Route::post('/escolas', [\Modules\Educa\Http\Controllers\SchoolController::class, 'store'])->name('educa.core.escolas.store');
    Route::get('/escolas/{escolaId}', [\Modules\Educa\Http\Controllers\SchoolController::class, 'show'])->name('educa.core.escolas.show');
    Route::put('/escolas/{escolaId}', [\Modules\Educa\Http\Controllers\SchoolController::class, 'update'])->name('educa.core.escolas.update');
    Route::get('/escolas/{escolaId}/capacidade-turno', [\Modules\Educa\Http\Controllers\SchoolController::class, 'capacidadeTurno'])->name('educa.core.escolas.capacidade-turno');

    // ── Cursos e Séries ───────────────────────────────────────────────────────
    Route::get('/cursos', [\Modules\Educa\Http\Controllers\CourseController::class, 'index'])->name('educa.core.cursos.index');
    Route::post('/cursos', [\Modules\Educa\Http\Controllers\CourseController::class, 'store'])->name('educa.core.cursos.store');
    Route::get('/cursos/{cursoId}/series', [\Modules\Educa\Http\Controllers\CourseController::class, 'seriesIndex'])->name('educa.core.cursos.series.index');
    Route::post('/cursos/{cursoId}/series', [\Modules\Educa\Http\Controllers\CourseController::class, 'seriesStore'])->name('educa.core.cursos.series.store');

    // ── Matriz Curricular BNCC (Áreas, Componentes e Matrizes) ────────────────
    Route::get('/areas-conhecimento', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'areasIndex'])->name('educa.core.areas.index');
    Route::post('/areas-conhecimento', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'areasStore'])->name('educa.core.areas.store');
    Route::get('/componentes-curriculares', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'componentesIndex'])->name('educa.core.componentes.index');
    Route::post('/componentes-curriculares', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'componentesStore'])->name('educa.core.componentes.store');
    Route::get('/matrizes-curriculares', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'index'])->name('educa.core.matrizes.index');
    Route::post('/matrizes-curriculares', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'store'])->name('educa.core.matrizes.store');
    Route::put('/matrizes-curriculares/{matrizId}/componentes', [\Modules\Educa\Http\Controllers\CurriculumMatrixController::class, 'configurarComponentes'])->name('educa.core.matrizes.componentes');

    // ── Turmas (Vagas, Turnos e Anti-Ociosidade) ──────────────────────────────
    Route::get('/turmas', [\Modules\Educa\Http\Controllers\SchoolClassController::class, 'index'])->name('educa.core.turmas.index');
    Route::post('/turmas', [\Modules\Educa\Http\Controllers\SchoolClassController::class, 'store'])->name('educa.core.turmas.store');
    Route::get('/turmas/{turmaId}', [\Modules\Educa\Http\Controllers\SchoolClassController::class, 'show'])->name('educa.core.turmas.show');
    Route::put('/turmas/{turmaId}', [\Modules\Educa\Http\Controllers\SchoolClassController::class, 'update'])->name('educa.core.turmas.update');
    Route::delete('/turmas/{turmaId}', [\Modules\Educa\Http\Controllers\SchoolClassController::class, 'destroy'])->name('educa.core.turmas.destroy');
    Route::get('/turmas/{turmaId}/calendario', [\Modules\Educa\Http\Controllers\CalendarEventController::class, 'calendarioTurma'])->name('educa.core.turmas.calendario');
});

// ── Submódulo Secretaria: Matrículas, Enturmações e Ficha do Aluno ─────────
Route::prefix('secretaria')->middleware('module-access:educa-secretaria')->group(function (): void {
    // Matrículas
    Route::get('/matriculas', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'index'])->name('educa.secretaria.matriculas.index');
    Route::post('/matriculas', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'store'])->name('educa.secretaria.matriculas.store');
    Route::get('/matriculas/{matriculaId}', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'show'])->name('educa.secretaria.matriculas.show');
    Route::post('/matriculas/{matriculaId}/cancelar', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'cancel'])->name('educa.secretaria.matriculas.cancel');

    // Enturmação e Remanejamento
    Route::post('/matriculas/{matriculaId}/enturmar', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'enturmar'])->name('educa.secretaria.matriculas.enturmar');
    Route::post('/matriculas/{matriculaId}/remanejar', [\Modules\Educa\Http\Controllers\EnrollmentController::class, 'remanejar'])->name('educa.secretaria.matriculas.remanejar');

    // Perfil Cadastral e Complementar do Aluno (MDM Pessoas)
    Route::get('/alunos/{pessoaId}/perfil', [\Modules\Educa\Http\Controllers\StudentProfileController::class, 'show'])->name('educa.secretaria.alunos.perfil.show');
    Route::put('/alunos/{pessoaId}/perfil', [\Modules\Educa\Http\Controllers\StudentProfileController::class, 'update'])->name('educa.secretaria.alunos.perfil.update');
});

// ── Submódulo Pedagógico: Diário de Classe, Frequência e Avaliação sem eval ──
Route::prefix('pedagogico')->middleware('module-access:educa-pedagogico')->group(function (): void {
    // Diário de Classe
    Route::get('/diarios', [\Modules\Educa\Http\Controllers\ClassDiaryController::class, 'index'])->name('educa.pedagogico.diarios.index');
    Route::post('/diarios', [\Modules\Educa\Http\Controllers\ClassDiaryController::class, 'store'])->name('educa.pedagogico.diarios.store');
    Route::get('/diarios/{diarioId}', [\Modules\Educa\Http\Controllers\ClassDiaryController::class, 'show'])->name('educa.pedagogico.diarios.show');

    // Frequência Escolar e Abono
    Route::post('/diarios/{diarioId}/frequencia', [\Modules\Educa\Http\Controllers\AttendanceController::class, 'store'])->name('educa.pedagogico.frequencia.store');
    Route::post('/frequencias/{attendanceRecordId}/abonar', [\Modules\Educa\Http\Controllers\AttendanceController::class, 'excuse'])->name('educa.pedagogico.frequencia.excuse');

    // Regras de Avaliação e Motor sem eval
    Route::get('/regras-avaliacao', [\Modules\Educa\Http\Controllers\EvaluationController::class, 'indexRegras'])->name('educa.pedagogico.regras.index');
    Route::post('/regras-avaliacao', [\Modules\Educa\Http\Controllers\EvaluationController::class, 'storeRegra'])->name('educa.pedagogico.regras.store');

    // Lançamento de Notas e Mapa de Médias
    Route::get('/turmas/{turmaId}/componentes/{componentId}/notas', [\Modules\Educa\Http\Controllers\EvaluationController::class, 'mapaNotas'])->name('educa.pedagogico.notas.mapa');
    Route::post('/turmas/{turmaId}/componentes/{componentId}/notas', [\Modules\Educa\Http\Controllers\EvaluationController::class, 'storeNotas'])->name('educa.pedagogico.notas.store');
});

// ── Submódulo Servidores da Educação: Lotação Docente e Lei do Piso 11.738/2008 ──
Route::prefix('servidores')->middleware('module-access:educa-servidores')->group(function (): void {
    // Servidores (Cadastro Funcional de Pessoa)
    Route::get('/servidores', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'index'])->name('educa.servidores.index');
    Route::post('/servidores', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'store'])->name('educa.servidores.store');
    Route::get('/servidores/{servidorId}', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'show'])->name('educa.servidores.show');
    Route::put('/servidores/{servidorId}', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'update'])->name('educa.servidores.update');

    // Funções e Matrículas
    Route::post('/servidores/{servidorId}/funcoes', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'storeFuncao'])->name('educa.servidores.funcoes.store');
    Route::delete('/servidores/{servidorId}/funcoes/{funcaoId}', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'destroyFuncao'])->name('educa.servidores.funcoes.destroy');

    // Habilitações Curriculares
    Route::post('/servidores/{servidorId}/habilitacoes', [\Modules\Educa\Http\Controllers\EmployeeController::class, 'syncHabilitacoes'])->name('educa.servidores.habilitacoes.sync');

    // Lotação e Fiscalização da Lei do Piso
    Route::get('/alocacoes', [\Modules\Educa\Http\Controllers\AllocationController::class, 'index'])->name('educa.servidores.alocacoes.index');
    Route::post('/alocacoes', [\Modules\Educa\Http\Controllers\AllocationController::class, 'store'])->name('educa.servidores.alocacoes.store');
    Route::delete('/alocacoes/{alocacaoId}', [\Modules\Educa\Http\Controllers\AllocationController::class, 'destroy'])->name('educa.servidores.alocacoes.destroy');

    // Afastamentos e Faltas
    Route::post('/servidores/{servidorId}/afastamentos', [\Modules\Educa\Http\Controllers\WithdrawalController::class, 'storeAfastamento'])->name('educa.servidores.afastamentos.store');
    Route::post('/servidores/{servidorId}/faltas', [\Modules\Educa\Http\Controllers\WithdrawalController::class, 'storeFalta'])->name('educa.servidores.faltas.store');
});

// ── Submódulo Educacenso: Auditoria, Exportação INEP e Conciliação ───────────
Route::prefix('educacenso')->middleware('module-access:educa-educacenso')->group(function (): void {
    // Auditoria Cadastral Prévia
    Route::get('/auditoria', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'listarValidacoes'])->name('educa.educacenso.auditoria.index');
    Route::post('/auditoria', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'auditar'])->name('educa.educacenso.auditoria.execute');

    // Exportação em Lote e Download
    Route::get('/exportacoes', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'listarExportacoes'])->name('educa.educacenso.exportacoes.index');
    Route::post('/exportacoes', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'solicitarExportacao'])->name('educa.educacenso.exportacoes.store');
    Route::get('/exportacoes/{exportId}', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'obterExportacao'])->name('educa.educacenso.exportacoes.show');
    Route::get('/exportacoes/{exportId}/download', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'downloadExportacao'])->name('educa.educacenso.exportacoes.download');

    // Retorno do INEP e Logs de Conciliação
    Route::post('/retorno', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'processarRetorno'])->name('educa.educacenso.retorno.processar');
    Route::get('/retorno/logs', [\Modules\Educa\Http\Controllers\EducacensoController::class, 'listarLogsRetorno'])->name('educa.educacenso.retorno.logs');
});

// ── Submódulo Transporte Escolar: Rotas, Veículos, Condutores e Alocações ────
Route::prefix('transporte')->middleware('module-access:educa-transporte')->group(function (): void {
    // Rotas e Paradas
    Route::get('/rotas', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'index'])->name('educa.transporte.rotas.index');
    Route::post('/rotas', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'store'])->name('educa.transporte.rotas.store');
    Route::get('/rotas/{rotaId}', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'show'])->name('educa.transporte.rotas.show');
    Route::put('/rotas/{rotaId}', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'update'])->name('educa.transporte.rotas.update');
    Route::post('/rotas/{rotaId}/paradas', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'adicionarParada'])->name('educa.transporte.rotas.paradas.store');
    Route::post('/rotas/{rotaId}/escolas', [\Modules\Educa\Http\Controllers\TransportRouteController::class, 'vincularEscolas'])->name('educa.transporte.rotas.escolas.sync');

    // Veículos e Vistorias DETRAN
    Route::get('/veiculos', [\Modules\Educa\Http\Controllers\TransportVehicleController::class, 'index'])->name('educa.transporte.veiculos.index');
    Route::post('/veiculos', [\Modules\Educa\Http\Controllers\TransportVehicleController::class, 'store'])->name('educa.transporte.veiculos.store');
    Route::get('/veiculos/{veiculoId}', [\Modules\Educa\Http\Controllers\TransportVehicleController::class, 'show'])->name('educa.transporte.veiculos.show');
    Route::put('/veiculos/{veiculoId}', [\Modules\Educa\Http\Controllers\TransportVehicleController::class, 'update'])->name('educa.transporte.veiculos.update');
    Route::post('/veiculos/{veiculoId}/vistorias', [\Modules\Educa\Http\Controllers\TransportVehicleController::class, 'registrarVistoria'])->name('educa.transporte.veiculos.vistorias.store');

    // Condutores e Monitores
    Route::get('/condutores', [\Modules\Educa\Http\Controllers\TransportDriverController::class, 'index'])->name('educa.transporte.condutores.index');
    Route::post('/condutores', [\Modules\Educa\Http\Controllers\TransportDriverController::class, 'store'])->name('educa.transporte.condutores.store');
    Route::get('/condutores/{condutorId}', [\Modules\Educa\Http\Controllers\TransportDriverController::class, 'show'])->name('educa.transporte.condutores.show');
    Route::put('/condutores/{condutorId}', [\Modules\Educa\Http\Controllers\TransportDriverController::class, 'update'])->name('educa.transporte.condutores.update');

    // Alocações Nominais
    Route::get('/alocacoes', [\Modules\Educa\Http\Controllers\TransportAllocationController::class, 'index'])->name('educa.transporte.alocacoes.index');
    Route::post('/alocacoes', [\Modules\Educa\Http\Controllers\TransportAllocationController::class, 'store'])->name('educa.transporte.alocacoes.store');
    Route::post('/alocacoes/{alocacaoId}/encerrar', [\Modules\Educa\Http\Controllers\TransportAllocationController::class, 'encerrar'])->name('educa.transporte.alocacoes.encerrar');
});

// ── Submódulo Comunicação Escolar: Avisos, Ocorrências e Mensageria Outbox ──
Route::prefix('comunicacao')->middleware('module-access:educa-comunicacao')->group(function (): void {
    // Avisos e Circulares
    Route::get('/avisos', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'index'])->name('educa.comunicacao.avisos.index');
    Route::post('/avisos', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'store'])->name('educa.comunicacao.avisos.store');
    Route::get('/avisos/{avisoId}', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'show'])->name('educa.comunicacao.avisos.show');
    Route::put('/avisos/{avisoId}', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'update'])->name('educa.comunicacao.avisos.update');
    Route::delete('/avisos/{avisoId}', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'destroy'])->name('educa.comunicacao.avisos.destroy');
    Route::post('/avisos/{avisoId}/leituras', [\Modules\Educa\Http\Controllers\AnnouncementController::class, 'registrarLeitura'])->name('educa.comunicacao.avisos.leituras.store');

    // Ocorrências e Despachos
    Route::get('/ocorrencias', [\Modules\Educa\Http\Controllers\IncidentController::class, 'index'])->name('educa.comunicacao.ocorrencias.index');
    Route::post('/ocorrencias', [\Modules\Educa\Http\Controllers\IncidentController::class, 'store'])->name('educa.comunicacao.ocorrencias.store');
    Route::get('/ocorrencias/{ocorrenciaId}', [\Modules\Educa\Http\Controllers\IncidentController::class, 'show'])->name('educa.comunicacao.ocorrencias.show');
    Route::put('/ocorrencias/{ocorrenciaId}', [\Modules\Educa\Http\Controllers\IncidentController::class, 'update'])->name('educa.comunicacao.ocorrencias.update');
    Route::post('/ocorrencias/{ocorrenciaId}/acoes', [\Modules\Educa\Http\Controllers\IncidentController::class, 'adicionarAcao'])->name('educa.comunicacao.ocorrencias.acoes.store');
    Route::post('/ocorrencias/{ocorrenciaId}/ciencia', [\Modules\Educa\Http\Controllers\IncidentController::class, 'registrarCiencia'])->name('educa.comunicacao.ocorrencias.ciencia.store');

    // Mensageria e Notificações Outbox
    Route::post('/notificacoes/infrequencia', [\Modules\Educa\Http\Controllers\NotificationController::class, 'dispararInfrequencia'])->name('educa.comunicacao.notificacoes.infrequencia');
});