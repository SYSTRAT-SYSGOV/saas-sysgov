import { apiClient } from '@/core/api/client';

// ── Tipos ──────────────────────────────────────────────────────────
export interface TipoInstrumento {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  poder_origem: 'camara' | 'prefeitura';
  prazo_regimental_dias: number | null;
  exige_tramitacao_interna: boolean;
  ativo: boolean;
  ordem: number;
}

export interface Anexo {
  id: number;
  anexavel_id: number;
  anexavel_type: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  uploaded_by: number;
  created_at: string;
  uploader?: { id: number; name: string };
}

export interface Proposicao {
  id: number;
  tenant_id: number;
  tipo_instrumento_id: number;
  numero: string;
  numero_sequencial: number;
  exercicio: number;
  ementa: string;
  justificativa: string | null;
  conteudo: string | null;
  area_tematica: string | null;
  dispositivos_legais: string | null;
  poder_origem: string;
  autor_principal_id: number;
  partido_bancada: string | null;
  status: string;
  visibilidade_publica: boolean;
  vinculacao_proposicao_id: number | null;
  vinculacao_processo_id: number | null;
  created_at: string;
  updated_at: string;
  tipo_instrumento?: TipoInstrumento;
  autor_principal?: { id: number; name: string };
  anexos?: Anexo[];
}

export interface TramitacaoPoderes {
  id: number;
  tenant_id: number;
  proposicao_id: number;
  poder_origem: string;
  poder_destino: string;
  remetente_id: number;
  responsavel_id: number | null;
  data_encaminhamento: string;
  data_recebimento: string | null;
  data_limite_resposta: string;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  proposicao?: Proposicao;
  remetente?: { id: number; name: string };
  responsavel?: { id: number; name: string };
  respostas?: Resposta[];
}

export interface Resposta {
  id: number;
  tramitacao_id: number;
  conteudo: string;
  status: string;
  enviado_em: string | null;
  created_at: string;
  elaborador?: { id: number; name: string };
}

export interface Notificacao {
  id: number;
  proposicao_id: number | null;
  evento: string;
  titulo: string;
  mensagem: string;
  canal: string;
  lida: boolean;
  lida_em: string | null;
  enviada_em: string | null;
  created_at: string;
  proposicao?: { id: number; numero: string; ementa: string };
}

export interface PreferenciasNotificacao {
  id: number;
  user_id: number;
  canais: string[];
  digest_diario: boolean;
}

export interface KpiAutor {
  total: number;
  em_tramitacao: number;
  respondidas: number;
  vencidas: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
  total: number;
}

export interface RelatorioQuantitativo {
  total: number;
  por_tipo: { tipo: string | null; slug: string | null; total: number }[];
  por_status: Record<string, number>;
  por_area: { area_tematica: string; total: number }[];
  por_autor: { autor: string | null; total: number }[];
}

export interface RelatorioTempoMedioItem {
  tipo: string;
  slug: string;
  total: number;
  media_dias: number;
  mediana_dias: number;
  desvio_padrao: number;
}

export interface RelatorioTempoMedio {
  exercicio: number;
  por_tipo: RelatorioTempoMedioItem[];
}

export interface RelatorioCumprimentoPrazosItem {
  tipo: string;
  slug: string;
  total: number;
  no_prazo: number;
  no_prazo_pct: number;
  em_alerta: number;
  em_alerta_pct: number;
  vencido: number;
  vencido_pct: number;
}

export interface RelatorioCumprimentoPrazos {
  exercicio: number;
  por_tipo: RelatorioCumprimentoPrazosItem[];
}

// ── Parâmetros ─────────────────────────────────────────────────────
export interface ProposicaoIndexParams {
  tipo_slug?: string;
  status?: string;
  exercicio?: number;
  area_tematica?: string;
  per_page?: number;
  page?: number;
}

// ── API ────────────────────────────────────────────────────────────

export const requerimentosApi = {
  // Tipos de Instrumento
  getTiposInstrumento: () =>
    apiClient.get<TipoInstrumento[]>('/requerimentos/tipos-instrumento'),

  // Proposições
  getProposicoes: (params?: ProposicaoIndexParams) =>
    apiClient.get<PaginatedResponse<Proposicao>>('/requerimentos/proposicoes', { params }),

  getProposicao: (id: number) =>
    apiClient.get<Proposicao>(`/requerimentos/proposicoes/${id}`),

  criarProposicao: (data: Record<string, unknown>) =>
    apiClient.post<Proposicao>('/requerimentos/proposicoes', data),

  atualizarProposicao: (id: number, data: Record<string, unknown>) =>
    apiClient.patch<Proposicao>(`/requerimentos/proposicoes/${id}`, data),

  getHistorico: (id: number) =>
    apiClient.get<{
      proposicao: Proposicao;
      tramitacoes_poderes: TramitacaoPoderes[];
      etapas_internas: unknown[];
    }>(`/requerimentos/proposicoes/${id}/historico`),

  // Anexos
  // `apiClient` fixa `Content-Type: application/json` como header padrão da instância, e esse
  // axios não o substitui sozinho para corpo FormData — sem o `undefined` explícito abaixo, o
  // arquivo é serializado como JSON (perde o binário) em vez de multipart com boundary.
  anexarNaProposicao: (proposicaoId: number, arquivo: File) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return apiClient.post<Anexo>(`/requerimentos/proposicoes/${proposicaoId}/anexos`, form, {
      headers: { 'Content-Type': undefined },
    });
  },

  anexarNaResposta: (respostaId: number, arquivo: File) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return apiClient.post<Anexo>(`/requerimentos/respostas/${respostaId}/anexos`, form, {
      headers: { 'Content-Type': undefined },
    });
  },

  excluirAnexo: (anexoId: number) =>
    apiClient.delete<{ deleted: boolean }>(`/requerimentos/anexos/${anexoId}`),

  baixarAnexo: async (anexo: Anexo): Promise<void> => {
    const resposta = await apiClient.get(`/requerimentos/anexos/${anexo.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(resposta.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nome_arquivo;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Minhas Proposições
  getMinhasProposicoes: (params?: { per_page?: number; page?: number }) =>
    apiClient.get<{ kpis: KpiAutor; proposicoes: PaginatedResponse<Proposicao> }>(
      '/requerimentos/minhas-proposicoes',
      { params },
    ),

  // Tramitação entre Poderes
  getTramitacoes: (params?: { status?: string; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<TramitacaoPoderes>>('/requerimentos/tramitacoes-poderes', { params }),

  criarTramitacao: (data: Record<string, unknown>) =>
    apiClient.post<TramitacaoPoderes>('/requerimentos/tramitacoes-poderes', data),

  registrarRecebimento: (id: number) =>
    apiClient.patch<TramitacaoPoderes>(`/requerimentos/tramitacoes-poderes/${id}/recebimento`),

  // Respostas
  criarResposta: (data: Record<string, unknown>) =>
    apiClient.post<Resposta>('/requerimentos/respostas', data),

  enviarResposta: (id: number) =>
    apiClient.patch<Resposta>(`/requerimentos/respostas/${id}/enviar`),

  // Notificações
  getNotificacoes: (params?: { nao_lidas?: boolean; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Notificacao>>('/requerimentos/notificacoes', { params }),

  marcarLida: (id: number) =>
    apiClient.patch(`/requerimentos/notificacoes/${id}/lida`),

  marcarTodasLidas: () =>
    apiClient.post('/requerimentos/notificacoes/marcar-todas-lidas'),

  getPreferencias: () =>
    apiClient.get<PreferenciasNotificacao>('/requerimentos/notificacoes/preferencias'),

  atualizarPreferencias: (data: Record<string, unknown>) =>
    apiClient.put('/requerimentos/notificacoes/preferencias', data),

  // Relatórios
  getRelatorioQuantitativo: (params?: Record<string, unknown>) =>
    apiClient.get<RelatorioQuantitativo>('/requerimentos/relatorios/quantitativo', { params }),

  getRelatorioTempoMedio: (params?: Record<string, unknown>) =>
    apiClient.get<RelatorioTempoMedio>('/requerimentos/relatorios/tempo-medio', { params }),

  getRelatorioCumprimentoPrazos: (params?: Record<string, unknown>) =>
    apiClient.get<RelatorioCumprimentoPrazos>('/requerimentos/relatorios/cumprimento-prazos', { params }),

  // Painel Público
  getProposicoesPublicas: (params?: ProposicaoIndexParams) =>
    apiClient.get<PaginatedResponse<Proposicao>>('/publico/requerimentos', { params }),

  getProposicaoPublica: (id: number) =>
    apiClient.get<{ proposicao: Proposicao; tramitacoes: TramitacaoPoderes[] }>(`/publico/requerimentos/${id}`),
};