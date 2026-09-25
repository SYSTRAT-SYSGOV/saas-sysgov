import type { ApiRequester, BaseModuleClient } from '../base';
import type { Paginated } from '../../index';
import type {
  Aula,
  AulaAgendamento,
  AulaInput,
  CatalogoCurso,
  Certificado,
  Chamada,
  CheckInResultado,
  Curso,
  CursoDetalhe,
  CursoFiltros,
  CursoInput,
  Formacao,
  FormacaoInput,
  Inscricao,
  InscricaoDetalhe,
  InscritoTurma,
  InstrutorResumo,
  MinhaInscricao,
  ModeloCertificado,
  ModeloCertificadoInput,
  QrCheckIn,
  ResumoEncerramento,
  StatusCurso,
  Turma,
  TurmaDetalhe,
  TurmaInput,
  ValidacaoCertificado,
} from './types';

const json = (body: unknown) => ({ body: JSON.stringify(body) });

/** Cliente do módulo Cursos e Formações (rotas em /api/cursos e /api/public/cursos). */
export class CursosModuleClient implements BaseModuleClient {
  readonly moduleName = 'cursos';

  constructor(private readonly api: ApiRequester) {}

  // ---------------------------------------------------------------- participante

  listarCatalogo(filtros: { tipo?: string; busca?: string } = {}): Promise<CatalogoCurso[]> {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.busca) params.set('busca', filtros.busca);
    const query = params.toString();
    return this.api.request(`/cursos/catalogo${query ? `?${query}` : ''}`);
  }

  minhasInscricoes(): Promise<MinhaInscricao[]> {
    return this.api.request('/cursos/minhas-inscricoes');
  }

  meusCertificados(): Promise<Certificado[]> {
    return this.api.request('/cursos/meus-certificados');
  }

  inscrever(turmaId: number): Promise<Inscricao> {
    return this.api.request(`/cursos/turmas/${turmaId}/inscricoes`, { method: 'POST' });
  }

  cancelarInscricao(id: number, motivo?: string): Promise<Inscricao> {
    return this.api.request(`/cursos/inscricoes/${id}/cancelar`, { method: 'POST', ...json({ motivo: motivo ?? null }) });
  }

  getInscricao(id: number): Promise<InscricaoDetalhe> {
    return this.api.request(`/cursos/inscricoes/${id}`);
  }

  checkIn(token: string): Promise<CheckInResultado> {
    return this.api.request('/cursos/check-in', { method: 'POST', ...json({ token }) });
  }

  // ---------------------------------------------------------------- cursos

  listarCursos(filtros: CursoFiltros = {}): Promise<Paginated<Curso>> {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const query = params.toString();
    return this.api.request(`/cursos/cursos${query ? `?${query}` : ''}`);
  }

  getCurso(id: number): Promise<CursoDetalhe> {
    return this.api.request(`/cursos/cursos/${id}`);
  }

  criarCurso(input: CursoInput): Promise<Curso> {
    return this.api.request('/cursos/cursos', { method: 'POST', ...json(input) });
  }

  atualizarCurso(id: number, input: Partial<CursoInput>): Promise<Curso> {
    return this.api.request(`/cursos/cursos/${id}`, { method: 'PUT', ...json(input) });
  }

  excluirCurso(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/cursos/cursos/${id}`, { method: 'DELETE' });
  }

  alterarStatusCurso(id: number, status: StatusCurso): Promise<Curso> {
    return this.api.request(`/cursos/cursos/${id}/status`, { method: 'POST', ...json({ status }) });
  }

  definirCapa(id: number, arquivo: File): Promise<Curso> {
    const form = new FormData();
    form.append('capa', arquivo);
    return this.api.request(`/cursos/cursos/${id}/capa`, { method: 'POST', body: form as unknown as string });
  }

  removerCapa(id: number): Promise<Curso> {
    return this.api.request(`/cursos/cursos/${id}/capa`, { method: 'DELETE' });
  }

  // ---------------------------------------------------------------- aulas

  listarAulas(cursoId: number): Promise<Aula[]> {
    return this.api.request(`/cursos/cursos/${cursoId}/aulas`);
  }

  criarAula(cursoId: number, input: AulaInput): Promise<Aula> {
    return this.api.request(`/cursos/cursos/${cursoId}/aulas`, { method: 'POST', ...json(input) });
  }

  atualizarAula(id: number, input: Partial<AulaInput>): Promise<Aula> {
    return this.api.request(`/cursos/aulas/${id}`, { method: 'PUT', ...json(input) });
  }

  excluirAula(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/cursos/aulas/${id}`, { method: 'DELETE' });
  }

  // ---------------------------------------------------------------- formações

  listarFormacoes(): Promise<Formacao[]> {
    return this.api.request('/cursos/formacoes');
  }

  criarFormacao(input: FormacaoInput): Promise<Formacao> {
    return this.api.request('/cursos/formacoes', { method: 'POST', ...json(input) });
  }

  atualizarFormacao(id: number, input: Partial<FormacaoInput>): Promise<Formacao> {
    return this.api.request(`/cursos/formacoes/${id}`, { method: 'PUT', ...json(input) });
  }

  excluirFormacao(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/cursos/formacoes/${id}`, { method: 'DELETE' });
  }

  /** Usuários ativos do órgão (Administrador de Cursos). */
  buscarUsuarios(busca = ''): Promise<InstrutorResumo[]> {
    return this.api.request(`/cursos/usuarios${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);
  }

  // ---------------------------------------------------------------- turmas

  listarTurmas(cursoId: number): Promise<Turma[]> {
    return this.api.request(`/cursos/cursos/${cursoId}/turmas`);
  }

  minhasTurmas(): Promise<Turma[]> {
    return this.api.request('/cursos/minhas-turmas');
  }

  getTurma(id: number): Promise<TurmaDetalhe> {
    return this.api.request(`/cursos/turmas/${id}`);
  }

  criarTurma(cursoId: number, input: TurmaInput): Promise<Turma> {
    return this.api.request(`/cursos/cursos/${cursoId}/turmas`, { method: 'POST', ...json(input) });
  }

  atualizarTurma(id: number, input: Partial<TurmaInput>): Promise<Turma> {
    return this.api.request(`/cursos/turmas/${id}`, { method: 'PUT', ...json(input) });
  }

  cancelarTurma(id: number, motivo: string): Promise<Turma> {
    return this.api.request(`/cursos/turmas/${id}/cancelar`, { method: 'POST', ...json({ motivo }) });
  }

  agendarAula(turmaId: number, input: { aula_id: number; inicio: string; fim: string }): Promise<AulaAgendamento> {
    return this.api.request(`/cursos/turmas/${turmaId}/agendamentos`, { method: 'POST', ...json(input) });
  }

  desagendarAula(agendamentoId: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/cursos/agendamentos/${agendamentoId}`, { method: 'DELETE' });
  }

  encerrarTurma(id: number): Promise<ResumoEncerramento> {
    return this.api.request(`/cursos/turmas/${id}/encerrar`, { method: 'POST' });
  }

  emitirCertificadosPendentes(turmaId: number): Promise<{ emitidos: number; pendentes: number }> {
    return this.api.request(`/cursos/turmas/${turmaId}/certificados/emitir-pendentes`, { method: 'POST' });
  }

  // ---------------------------------------------------------------- inscrições (gestão)

  listarInscritos(turmaId: number): Promise<InscritoTurma[]> {
    return this.api.request(`/cursos/turmas/${turmaId}/inscricoes`);
  }

  exportarInscritos(turmaId: number): Promise<Blob> {
    if (!this.api.requestBlob) throw new Error('Este cliente não suporta download de arquivos.');
    return this.api.requestBlob(`/cursos/turmas/${turmaId}/inscricoes/exportar`);
  }

  inscreverUsuario(turmaId: number, userId: number): Promise<Inscricao> {
    return this.api.request(`/cursos/turmas/${turmaId}/inscricoes/direta`, { method: 'POST', ...json({ user_id: userId }) });
  }

  aprovarInscricao(id: number): Promise<Inscricao> {
    return this.api.request(`/cursos/inscricoes/${id}/aprovar`, { method: 'POST' });
  }

  recusarInscricao(id: number, motivo: string): Promise<Inscricao> {
    return this.api.request(`/cursos/inscricoes/${id}/recusar`, { method: 'POST', ...json({ motivo }) });
  }

  // ---------------------------------------------------------------- presença

  getChamada(agendamentoId: number): Promise<Chamada> {
    return this.api.request(`/cursos/agendamentos/${agendamentoId}/chamada`);
  }

  registrarChamada(agendamentoId: number, presencas: { inscricao_id: number; presente: boolean }[]): Promise<Pick<Chamada, 'chamada'>> {
    return this.api.request(`/cursos/agendamentos/${agendamentoId}/chamada`, { method: 'PUT', ...json({ presencas }) });
  }

  gerarQrCheckIn(agendamentoId: number): Promise<QrCheckIn> {
    return this.api.request(`/cursos/agendamentos/${agendamentoId}/qr-token`);
  }

  // ---------------------------------------------------------------- certificados

  listarCertificados(filtros: { busca?: string; page?: number } = {}): Promise<Paginated<Certificado>> {
    const params = new URLSearchParams();
    if (filtros.busca) params.set('busca', filtros.busca);
    if (filtros.page) params.set('page', String(filtros.page));
    const query = params.toString();
    return this.api.request(`/cursos/certificados${query ? `?${query}` : ''}`);
  }

  baixarCertificado(id: number): Promise<Blob> {
    if (!this.api.requestBlob) throw new Error('Este cliente não suporta download de arquivos.');
    return this.api.requestBlob(`/cursos/certificados/${id}/pdf`);
  }

  revogarCertificado(id: number, motivo: string): Promise<Certificado> {
    return this.api.request(`/cursos/certificados/${id}/revogar`, { method: 'POST', ...json({ motivo }) });
  }

  listarModelos(): Promise<{ modelos: ModeloCertificado[]; campos_dinamicos: string[] }> {
    return this.api.request('/cursos/modelos-certificado');
  }

  criarModelo(input: ModeloCertificadoInput): Promise<ModeloCertificado> {
    return this.api.request('/cursos/modelos-certificado', { method: 'POST', ...json(input) });
  }

  atualizarModelo(id: number, input: Partial<ModeloCertificadoInput>): Promise<ModeloCertificado> {
    return this.api.request(`/cursos/modelos-certificado/${id}`, { method: 'PUT', ...json(input) });
  }

  excluirModelo(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/cursos/modelos-certificado/${id}`, { method: 'DELETE' });
  }

  enviarLogotipo(id: number, arquivo: File): Promise<ModeloCertificado> {
    const form = new FormData();
    form.append('imagem', arquivo);
    return this.api.request(`/cursos/modelos-certificado/${id}/logotipo`, { method: 'POST', body: form as unknown as string });
  }

  enviarImagemAssinatura(id: number, indice: number, arquivo: File): Promise<ModeloCertificado> {
    const form = new FormData();
    form.append('imagem', arquivo);
    return this.api.request(`/cursos/modelos-certificado/${id}/assinaturas/${indice}/imagem`, { method: 'POST', body: form as unknown as string });
  }

  // ---------------------------------------------------------------- público (sem login)

  /** Validação pública — responde 404 (erro) quando o código não existe. */
  validarCertificado(codigo: string): Promise<ValidacaoCertificado> {
    return this.api.request(`/public/cursos/certificados/${encodeURIComponent(codigo)}`);
  }
}
