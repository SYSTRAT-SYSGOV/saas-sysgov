import type { ApiRequester } from '../base';
import type {
  ApiAvaliacao,
  ApiCiclo,
  ApiComissao,
  ApiDashboardMetricas,
  ApiKpisEquipe,
  ApiDiarioBordo,
  ApiModeloFormulario,
  ApiNivelHierarquia,
  ApiPainelFiltros,
  ApiPainelKpis,
  ApiPendenciaHierarquia,
  ApiPergunta,
  ApiRecurso,
  ApiServidorAfastamento,
  ApiSessao,
  ApiEspelhoAvaliacao,
  ApiSimulacaoProgressao,
  ApiImpedimentoAuditoria,
  ApiFator,
  ApiModeloFatorPeso,
  ApiFatoresPesosResponse,
  ApiEscalaGrafica,
  ApiHistoricoConsolidacao,
  ApiQuinquenioResumo,
  ApiAvaliacaoUsuario,
  ApiMediaAvaliacaoUsuario,
  ApiRelatorioAderencia,
  CreateDiarioBordoInput,
  CreateRecursoInput,
  CreateFatorInput,
  UpdateFatorInput,
  CreateAvaliacaoUsuarioInput,
  RespostaFator,
  VotarRecursoInput,
  CreateSessaoInput,
  CreateComissaoInput,
  AdicionarMembroInput,
  DeclararImpedimentoInput,
  ApiComissaoMembro,
} from './types';

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      clean[key] = String(value);
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
}

export class CapdModuleClient {
  readonly moduleName = 'capd';

  constructor(private readonly api: ApiRequester) {}

  // ── Dashboard / BI ──────────────────────────────────────────────────

  async getMetricas(cicloId?: number): Promise<ApiDashboardMetricas> {
    const query = cicloId ? `?ciclo_id=${cicloId}` : '';
    return this.api.request(`/capd/dashboard/metricas${query}`);
  }

  async getKpisEquipe(params?: { ciclo_id?: number; avaliador_id?: number }): Promise<ApiKpisEquipe> {
    return this.api.request(`/capd/avaliacoes/kpis-equipe${buildQueryString(params)}`);
  }

  // ── Diário de Bordo (CIT) ───────────────────────────────────────────

  async listDiarioBordo(params?: { ciclo_id?: number; servidor_id?: number; tipo?: string }): Promise<{ data: ApiDiarioBordo[] }> {
    return this.api.request(`/capd/diario-bordo${buildQueryString(params)}`);
  }

  async createDiarioBordo(input: CreateDiarioBordoInput): Promise<ApiDiarioBordo> {
    return this.api.request('/capd/diario-bordo', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async uploadEvidencia(diarioId: number, file: File): Promise<{ message: string; hash_sha256: string }> {
    const formData = new FormData();
    formData.append('arquivo', file);

    return this.api.request(`/capd/diario-bordo/${diarioId}/evidencias`, {
      method: 'POST',
      body: formData as any,
    });
  }

  // ── Avaliações ──────────────────────────────────────────────────────

  async listAvaliacoes(params?: { ciclo_id?: number; servidor_id?: number; status?: string; avaliador_id?: number; per_page?: number }): Promise<{ data: ApiAvaliacao[] }> {
    return this.api.request(`/capd/avaliacoes${buildQueryString(params)}`);
  }

  async createAvaliacao(input: { ciclo_id: number; servidor_id: number }): Promise<ApiAvaliacao> {
    return this.api.request('/capd/avaliacoes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getAvaliacao(id: number): Promise<ApiAvaliacao> {
    return this.api.request(`/capd/avaliacoes/${id}`);
  }

  async salvarRascunho(id: number, respostas: Record<string, RespostaFator>): Promise<ApiAvaliacao> {
    return this.api.request(`/capd/avaliacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ respostas_fatores: respostas }),
    });
  }

  async previewNota(id: number, respostas: Record<string, RespostaFator>): Promise<{ preview: boolean; resultado: { nota_final: string; elegivel_progressao: boolean; detalhamento: any } }> {
    return this.api.request(`/capd/avaliacoes/${id}/preview-nota`, {
      method: 'GET',
    });
  }

  async submeterAvaliacao(id: number): Promise<{ avaliacao: ApiAvaliacao; resultado: any }> {
    return this.api.request(`/capd/avaliacoes/${id}/submeter`, {
      method: 'POST',
    });
  }


  async homologarAvaliacao(id: number): Promise<{ message: string; avaliacao: ApiAvaliacao }> {
    return this.api.request(`/capd/avaliacoes/${id}/homologar`, {
      method: 'POST',
    });
  }

  // ── Comissões e Membros ─────────────────────────────────────────────

  async listComissoes(): Promise<{ data: ApiComissao[] }> {
    return this.api.request('/capd/comissoes');
  }

  async getComissao(id: number): Promise<ApiComissao> {
    return this.api.request(`/capd/comissoes/${id}`);
  }

  async createComissao(input: CreateComissaoInput): Promise<ApiComissao> {
    return this.api.request('/capd/comissoes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async adicionarMembroComissao(comissaoId: number, input: AdicionarMembroInput): Promise<ApiComissaoMembro> {
    return this.api.request(`/capd/comissoes/${comissaoId}/membros`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async declararImpedimento(membroId: number, input: DeclararImpedimentoInput): Promise<{ message: string; impedimento: any }> {
    return this.api.request(`/capd/comissoes/membros/${membroId}/impedimentos`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── Recursos ────────────────────────────────────────────────────────

  async listRecursos(params?: { status?: string }): Promise<{ data: ApiRecurso[] }> {
    return this.api.request(`/capd/recursos${buildQueryString(params)}`);
  }

  async createRecurso(input: CreateRecursoInput): Promise<ApiRecurso> {
    return this.api.request('/capd/recursos', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async sortearRelator(recursoId: number): Promise<{ message: string; recurso: ApiRecurso }> {
    return this.api.request(`/capd/recursos/${recursoId}/sortear-relator`, {
      method: 'POST',
    });
  }

  // ── Sessões e Deliberações ──────────────────────────────────────────

  async listSessoes(): Promise<{ data: ApiSessao[] }> {
    return this.api.request('/capd/sessoes');
  }

  async createSessao(input: CreateSessaoInput): Promise<ApiSessao> {
    return this.api.request('/capd/sessoes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getSessao(id: number): Promise<{ sessao: ApiSessao; integridade_ata_ok: boolean }> {
    return this.api.request(`/capd/sessoes/${id}`);
  }

  async selarAta(sessaoId: number, ataTexto: string): Promise<{ message: string; hash_ata_sha256: string }> {
    return this.api.request(`/capd/sessoes/${sessaoId}/selar-ata`, {
      method: 'POST',
      body: JSON.stringify({ ata_texto: ataTexto }),
    });
  }

  async votarRecurso(input: VotarRecursoInput): Promise<{ message?: string; status_recurso: string }> {
    return this.api.request('/capd/deliberacoes/votar', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── Homologação do Ciclo em Lote ────────────────────────────────────

  async homologarCiclo(cicloId: number): Promise<{ message: string; resultado: any }> {
    return this.api.request(`/capd/ciclos/${cicloId}/homologar`, {
      method: 'POST',
    });
  }

  // ── Gestão de Servidores Públicos (RH Universal) ────────────────────

  async listServidores(params?: { search?: string; situacao?: string; estagio_probatorio?: boolean; orgao_lotacao?: string; meus_subordinados?: boolean; per_page?: number }): Promise<{ data: any[]; total: number; current_page: number }> {
    return this.api.request(`/capd/servidores${buildQueryString(params)}`);
  }

  async getMeuPerfil(): Promise<{ servidor: any | null; lotacao: string | null; secretarias_disponiveis: string[] }> {
    return this.api.request('/capd/servidores/meu-perfil');
  }

  async getServidor(id: number): Promise<any> {
    return this.api.request(`/capd/servidores/${id}`);
  }

  async createServidor(data: Record<string, unknown>): Promise<any> {
    return this.api.request('/capd/servidores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServidor(id: number, data: Record<string, unknown>): Promise<any> {
    return this.api.request(`/capd/servidores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async importarServidoresCsv(csvContent: string): Promise<{ total: number; inseridos: number; atualizados: number; erros: string[] }> {
    return this.api.request('/capd/servidores/importar-csv', {
      method: 'POST',
      body: JSON.stringify({ csv_content: csvContent }),
    });
  }

  async createAfastamento(servidorId: number, data: Record<string, unknown>): Promise<ApiServidorAfastamento> {
    return this.api.request(`/capd/servidores/${servidorId}/afastamentos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAfastamento(servidorId: number, afastamentoId: number, data: Record<string, unknown>): Promise<ApiServidorAfastamento> {
    return this.api.request(`/capd/servidores/${servidorId}/afastamentos/${afastamentoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ── Hierarquia de Avaliação (resolução do superior imediato) ────────

  async listNiveisHierarquia(): Promise<ApiNivelHierarquia[]> {
    return this.api.request('/capd/niveis-hierarquia');
  }

  async createNivelHierarquia(data: Partial<ApiNivelHierarquia>): Promise<ApiNivelHierarquia> {
    return this.api.request('/capd/niveis-hierarquia', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNivelHierarquia(id: number, data: Partial<ApiNivelHierarquia>): Promise<ApiNivelHierarquia> {
    return this.api.request(`/capd/niveis-hierarquia/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNivelHierarquia(id: number): Promise<{ message: string }> {
    return this.api.request(`/capd/niveis-hierarquia/${id}`, {
      method: 'DELETE',
    });
  }

  async listPendenciasHierarquia(params?: { status?: string; per_page?: number }): Promise<{ data: ApiPendenciaHierarquia[]; total: number }> {
    return this.api.request(`/capd/pendencias-hierarquia${buildQueryString(params)}`);
  }

  async resolverPendenciaHierarquia(id: number, avaliadorDesignadoId: number): Promise<ApiPendenciaHierarquia> {
    return this.api.request(`/capd/pendencias-hierarquia/${id}/resolver`, {
      method: 'POST',
      body: JSON.stringify({ avaliador_designado_id: avaliadorDesignadoId }),
    });
  }

  // ── Integrações de RH (ERP Gateway) ─────────────────────────────────

  async listIntegracoesRh(): Promise<any[]> {
    return this.api.request('/capd/integracoes-rh');
  }

  async createIntegracaoRh(data: Record<string, unknown>): Promise<any> {
    return this.api.request('/capd/integracoes-rh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIntegracoesLogs(params?: { per_page?: number }): Promise<{ data: any[]; total: number }> {
    return this.api.request(`/capd/integracoes-rh/logs${buildQueryString(params)}`);
  }

  // ── Injeção em Terceiros (Embed / Headless) ─────────────────────────

  async generateEmbedToken(identificador: string, mode = 'autoavaliacao', ttlMinutes = 60): Promise<{ embed_token: string; expires_in: number; embed_url: string }> {
    return this.api.request('/capd/embed/token', {
      method: 'POST',
      body: JSON.stringify({ identificador, mode, ttl_minutes: ttlMinutes }),
    });
  }

  async getEmbedContext(token: string): Promise<any> {
    return this.api.request(`/capd/embed/context?token=${encodeURIComponent(token)}`);
  }

  // ── Painel Gerencial com Filtros Avançados & KPIs ───────────────────

  async getPainelServidores(filtros?: ApiPainelFiltros): Promise<{ data: any[]; total: number; current_page: number; per_page: number }> {
    return this.api.request(`/capd/painel/servidores${buildQueryString(filtros as Record<string, unknown>)}`);
  }

  async getPainelKpis(cicloId?: number): Promise<ApiPainelKpis> {
    const query = cicloId ? `?ciclo_id=${cicloId}` : '';
    return this.api.request(`/capd/painel/kpis${query}`);
  }

  async getPainelVisaoPerfil(perfil: 'comissao' | 'drh' | 'gestor', cicloId?: number): Promise<any> {
    const query = cicloId ? `?ciclo_id=${cicloId}` : '';
    return this.api.request(`/capd/painel/visao/${perfil}${query}`);
  }

  // ── Ciclos de Avaliação de 12 Meses ─────────────────────────────────

  async listCiclos(): Promise<ApiCiclo[]> {
    return this.api.request('/capd/ciclos');
  }

  async getCiclo(id: number): Promise<ApiCiclo> {
    return this.api.request(`/capd/ciclos/${id}`);
  }

  async createCiclo(dados: Partial<ApiCiclo>): Promise<ApiCiclo> {
    return this.api.request('/capd/ciclos', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async updateCiclo(id: number, dados: Partial<ApiCiclo>): Promise<ApiCiclo> {
    return this.api.request(`/capd/ciclos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  }

  async encerrarCiclo(id: number, abrirProximo = false): Promise<{ message: string; ciclo: ApiCiclo }> {
    return this.api.request(`/capd/ciclos/${id}/encerrar`, {
      method: 'POST',
      body: JSON.stringify({ abrir_proximo: abrirProximo }),
    });
  }

  async proximoCiclo(id: number): Promise<{ message: string; ciclo: ApiCiclo }> {
    return this.api.request(`/capd/ciclos/${id}/proximo`, {
      method: 'POST',
    });
  }

  async getElegibilidadeCiclo(cicloId: number, servidorId?: number): Promise<any> {
    const query = servidorId ? `?servidor_id=${servidorId}` : '';
    return this.api.request(`/capd/ciclos/${cicloId}/elegibilidade${query}`);
  }

  // ── Modelos de Formulário e Cadastro de Perguntas ───────────────────

  async listModelosFormulario(planoId?: number, cargo?: string, grupo?: string): Promise<ApiModeloFormulario[]> {
    return this.api.request(`/capd/modelos-formulario${buildQueryString({ plano_carreira_id: planoId, cargo, grupo })}`);
  }

  async getModeloFormularioVigente(
    planoId?: number,
    cargo?: string,
    options?: { servidor_id?: number; grupo?: string }
  ): Promise<ApiModeloFormulario> {
    return this.api.request(
      `/capd/modelos-formulario/vigente${buildQueryString({
        plano_carreira_id: planoId,
        cargo,
        servidor_id: options?.servidor_id,
        grupo: options?.grupo,
      })}`
    );
  }

  async identificarGrupoFuncional(params?: {
    servidor_id?: number;
    cargo?: string;
    lotacao?: string;
  }): Promise<{ chave: string; nome: string; codigo_modelo: string; descricao: string; icone?: string }> {
    return this.api.request(
      `/capd/modelos-formulario/identificar-grupo${buildQueryString(params || {})}`
    );
  }

  async saveModeloFormulario(dados: Partial<ApiModeloFormulario>): Promise<ApiModeloFormulario> {
    return this.api.request('/capd/modelos-formulario', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async getModeloFormulario(id: number): Promise<ApiModeloFormulario> {
    return this.api.request(`/capd/modelos-formulario/${id}`);
  }

  async savePergunta(modeloId: number, dados: Partial<ApiPergunta>): Promise<ApiPergunta> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/perguntas`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async destroyPergunta(id: number): Promise<{ message: string }> {
    return this.api.request(`/capd/perguntas/${id}`, {
      method: 'DELETE',
    });
  }

  async seedPerguntasPadrao(): Promise<{ message: string }> {
    return this.api.request('/capd/modelos-formulario/seed-padrao', {
      method: 'POST',
    });
  }

  // ── Portais Funcionais por Papel (Espelho, Devolutiva, Simulação e Auditoria) ──

  async obterEspelhoAvaliacao(avaliacaoId: number): Promise<ApiEspelhoAvaliacao> {
    return this.api.request(`/capd/avaliacoes/${avaliacaoId}/espelho`);
  }

  async exportarEspelhoPdf(avaliacaoId: number): Promise<Blob> {
    if (this.api.requestBlob) {
      return this.api.requestBlob(`/capd/avaliacoes/${avaliacaoId}/espelho/exportar-pdf`);
    }
    return (this.api as any).request(`/capd/avaliacoes/${avaliacaoId}/espelho/exportar-pdf`);
  }

  async registrarDevolutiva(
    avaliacaoId: number,
    dados: { data_devolutiva: string; resumo_entrevista?: string; acordos_desenvolvimento?: string }
  ): Promise<{ message: string; avaliacao: any }> {
    return this.api.request(`/capd/avaliacoes/${avaliacaoId}/devolutiva`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async registrarCiencia(
    avaliacaoId: number,
    dados?: { tipo?: 'concordancia' | 'discordancia_recurso'; observacoes?: string }
  ): Promise<{ message: string; ciencia_servidor_em: string; ciencia_tipo: string; hash_sha256: string }> {
    return this.api.request(`/capd/avaliacoes/${avaliacaoId}/ciencia`, {
      method: 'POST',
      body: JSON.stringify(dados ?? {}),
    });
  }

  async contestarRecursoChefia(
    recursoId: number,
    dados: { contestacao_chefia: string }
  ): Promise<ApiRecurso> {
    return this.api.request(`/capd/recursos/${recursoId}/contestar-chefia`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async listPmds(params?: Record<string, unknown>): Promise<{ data: any[]; total: number }> {
    return this.api.request(`/capd/pmd${buildQueryString(params as Record<string, unknown>)}`);
  }

  async simularProgressao(servidorId: number): Promise<ApiSimulacaoProgressao> {
    return this.api.request(`/capd/servidores/${servidorId}/simular-progressao`);
  }

  async listarImpedimentosAuditoria(): Promise<ApiImpedimentoAuditoria[]> {
    return this.api.request('/capd/auditoria/impedimentos');
  }

  async declararImpedimentoParentesco(dados: {
    servidor_alvo_id: number;
    tipo_impedimento: string;
    motivo: string;
  }): Promise<any> {
    return this.api.request('/capd/impedimentos', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  // ── Consolidação Trienal (RN-02, RN-04, RN-05) ─────────────────────

  async listarHistoricoConsolidacao(cicloId: number): Promise<ApiHistoricoConsolidacao> {
    return this.api.request(`/capd/consolidacao/${cicloId}/historico`);
  }

  // ── Fatores de Avaliação — CRUD dinâmico (RF-02) ───────────────────

  async listFatores(): Promise<ApiFator[]> {
    return this.api.request('/capd/fatores');
  }

  async createFator(dados: CreateFatorInput): Promise<ApiFator> {
    return this.api.request('/capd/fatores', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async updateFator(id: number, dados: UpdateFatorInput): Promise<ApiFator> {
    return this.api.request(`/capd/fatores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  }

  async desativarFator(id: number): Promise<{ message: string; fator: ApiFator }> {
    return this.api.request(`/capd/fatores/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Pesos por Fator por Modelo de Formulário (RF-02) ────────────────

  async listFatoresPesos(modeloId: number): Promise<ApiFatoresPesosResponse> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/fatores-pesos`);
  }

  async syncFatoresPesos(
    modeloId: number,
    fatores: Array<Pick<ApiModeloFatorPeso, 'fator_id' | 'peso' | 'redistribuivel' | 'ordem'>>,
  ): Promise<{ message: string; soma_pesos: number; fatores: ApiModeloFatorPeso[] }> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/fatores-pesos/sync`, {
      method: 'POST',
      body: JSON.stringify({ fatores }),
    });
  }

  async fatoresDisponiveis(modeloId: number): Promise<ApiFator[]> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/fatores-pesos/disponiveis`);
  }

  // ── Escalas Gráficas por Modelo de Formulário (RF-03) ───────────────

  async listEscalasGraficas(modeloId: number): Promise<ApiEscalaGrafica[]> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/escalas-graficas`);
  }

  async createEscalaGrafica(
    modeloId: number,
    dados: Pick<ApiEscalaGrafica, 'nome' | 'descricao' | 'niveis'>,
  ): Promise<ApiEscalaGrafica> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/escalas-graficas`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async updateEscalaGrafica(
    modeloId: number,
    escalaId: number,
    dados: Partial<Pick<ApiEscalaGrafica, 'nome' | 'descricao' | 'ativa' | 'niveis'>>,
  ): Promise<ApiEscalaGrafica> {
    return this.api.request(`/capd/modelos-formulario/${modeloId}/escalas-graficas/${escalaId}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  }

  async deleteEscalaGrafica(modeloId: number, escalaId: number): Promise<void> {
    await this.api.request(`/capd/modelos-formulario/${modeloId}/escalas-graficas/${escalaId}`, {
      method: 'DELETE',
    });
  }

  // ── Quinquênios (RN-08, art. 17) ────────────────────────────────────

  async listarQuinquenios(servidorId: number): Promise<ApiQuinquenioResumo> {
    return this.api.request(`/capd/servidores/${servidorId}/quinquenios`);
  }

  async gerarQuinquenios(servidorId: number): Promise<ApiQuinquenioResumo & { message: string }> {
    return this.api.request(`/capd/servidores/${servidorId}/quinquenios/gerar`, {
      method: 'POST',
    });
  }

  // ── Avaliação pelo Usuário Externo (art. 25, RF-06) ────────────────

  async registrarAvaliacaoUsuario(dados: CreateAvaliacaoUsuarioInput): Promise<ApiAvaliacaoUsuario> {
    return this.api.request('/capd/avaliacao-usuario', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async obterMediaAvaliacaoUsuario(servidorId: number, cicloId: number): Promise<ApiMediaAvaliacaoUsuario> {
    return this.api.request(`/capd/avaliacao-usuario/media?servidor_id=${servidorId}&ciclo_id=${cicloId}`);
  }

  // ── Relatório de Aderência do Ciclo (RF-12) ─────────────────────────

  async obterRelatorioAderencia(cicloId: number): Promise<ApiRelatorioAderencia> {
    return this.api.request(`/capd/relatorios/aderencia?ciclo_id=${cicloId}`);
  }
}
