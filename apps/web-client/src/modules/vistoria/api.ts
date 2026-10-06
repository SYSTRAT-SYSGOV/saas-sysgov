import { apiClient } from '@/core/api/client';

// ── Tipos ──────────────────────────────────────────────────────────
export type TipoLocalFiscalizavel =
  | 'propriedade_rural'
  | 'estabelecimento_comercial'
  | 'feira'
  | 'evento'
  | 'outro';

export interface LocalFiscalizavel {
  id: number;
  tenant_id: number;
  proprietario_pessoa_id: number;
  nome: string;
  tipo: TipoLocalFiscalizavel;
  classificacao_atividade: string | null;
  latitude: number;
  longitude: number;
  endereco: string | null;
  created_at: string;
  updated_at: string;
  proprietario?: { id: number; nome: string; cpf_mascarado?: string };
}

export type TipoAcaoOrdemServico =
  | 'vistoria_rotina'
  | 'inspecao_sanitaria'
  | 'atendimento_denuncia'
  | 'reinspecao'
  | 'autuacao';

export type CriticidadeOrdemServico = 'baixa' | 'media' | 'alta' | 'urgente';

export type StatusOrdemServico = 'agendada' | 'em_execucao' | 'concluida' | 'cancelada';

export interface OrdemServico {
  id: number;
  tenant_id: number;
  local_id: number;
  org_unit_id: number;
  fiscal_id: number | null;
  tipo_acao: TipoAcaoOrdemServico;
  criticidade: CriticidadeOrdemServico;
  status: StatusOrdemServico;
  resultado: string | null;
  data_prevista: string;
  roteiro_deslocamento: string | null;
  created_at: string;
  updated_at: string;
  local?: { id: number; nome: string };
  org_unit?: { id: number; name: string };
  fiscal?: { id: number; name: string };
}

export interface OrdemServicoHistorico {
  id: number;
  local_id: number;
  tipo_acao: string;
  data_prevista: string;
  criticidade: string;
  status: string;
  resultado: string | null;
}

export type TipoPergunta = 'multipla_escolha' | 'texto_livre' | 'foto';

export interface Pergunta {
  id: number;
  tenant_id: number;
  modelo_id: number;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: string[] | null;
  obrigatoria: boolean;
  ordem: number;
  ativo: boolean;
}

export interface ModeloFormulario {
  id: number;
  tenant_id: number;
  tipo_fiscalizacao: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  // Eloquent serializa a relação perguntasAtivas() como "perguntas_ativas"
  // (snake_case do nome do método, não do nome do relacionamento de negócio).
  perguntas_ativas?: Pergunta[];
}

export type StatusExecucaoVistoria = 'pendente_sincronizacao' | 'sincronizada' | 'suplementar';

export interface ExecucaoVistoria {
  id: number;
  tenant_id: number;
  ordem_servico_id: number;
  fiscal_id: number;
  client_uuid: string;
  status: StatusExecucaoVistoria;
  dados: Record<string, unknown> | null;
  iniciado_em_dispositivo: string | null;
  concluido_em_dispositivo: string | null;
  sincronizado_em: string | null;
}

export interface PacoteDoDiaItem {
  ordem: OrdemServico;
  historico_local: OrdemServicoHistorico[];
  formulario: ModeloFormulario | null;
}

export interface PacoteDoDiaResponse {
  gerado_em: string;
  ordens: PacoteDoDiaItem[];
}

export interface SincronizarExecucaoPayload {
  client_uuid: string;
  ordem_servico_id: number;
  dados?: Record<string, unknown> | null;
  iniciado_em_dispositivo?: string | null;
  concluido_em_dispositivo?: string | null;
}

export interface ModeloFormularioPayload {
  tipo_fiscalizacao: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  perguntas: Array<{
    enunciado: string;
    tipo: TipoPergunta;
    opcoes?: string[] | null;
    obrigatoria?: boolean;
    ordem?: number;
  }>;
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

export interface LocalFiscalizavelIndexParams {
  tipo?: TipoLocalFiscalizavel;
  busca?: string;
  per_page?: number;
  page?: number;
}

export interface LocalFiscalizavelPayload {
  proprietario_pessoa_id: number;
  nome: string;
  tipo: TipoLocalFiscalizavel;
  classificacao_atividade?: string | null;
  latitude: number;
  longitude: number;
  endereco?: string | null;
}

export interface OrdemServicoIndexParams {
  status?: StatusOrdemServico;
  criticidade?: CriticidadeOrdemServico;
  per_page?: number;
  page?: number;
}

export interface OrdemServicoPayload {
  local_id: number;
  org_unit_id: number;
  fiscal_id?: number | null;
  tipo_acao: TipoAcaoOrdemServico;
  criticidade?: CriticidadeOrdemServico;
  data_prevista: string;
  roteiro_deslocamento?: string | null;
}

// ── API ────────────────────────────────────────────────────────────
export const vistoriaApi = {
  listarLocais: (params?: LocalFiscalizavelIndexParams) =>
    apiClient.get<PaginatedResponse<LocalFiscalizavel>>('/vistoria/locais', { params }),

  obterLocal: (id: number) =>
    apiClient.get<LocalFiscalizavel>(`/vistoria/locais/${id}`),

  criarLocal: (data: LocalFiscalizavelPayload) =>
    apiClient.post<LocalFiscalizavel>('/vistoria/locais', data),

  atualizarLocal: (id: number, data: Partial<LocalFiscalizavelPayload>) =>
    apiClient.patch<LocalFiscalizavel>(`/vistoria/locais/${id}`, data),

  excluirLocal: (id: number) =>
    apiClient.delete<void>(`/vistoria/locais/${id}`),

  obterHistoricoLocal: (id: number) =>
    apiClient.get<OrdemServicoHistorico[]>(`/vistoria/locais/${id}/historico`),

  listarOrdensServico: (params?: OrdemServicoIndexParams) =>
    apiClient.get<PaginatedResponse<OrdemServico>>('/vistoria/ordens-servico', { params }),

  obterOrdemServico: (id: number) =>
    apiClient.get<OrdemServico>(`/vistoria/ordens-servico/${id}`),

  criarOrdemServico: (data: OrdemServicoPayload) =>
    apiClient.post<OrdemServico>('/vistoria/ordens-servico', data),

  obterPacoteDoDia: () =>
    apiClient.get<PacoteDoDiaResponse>('/vistoria/pacote-do-dia'),

  sincronizarExecucao: (data: SincronizarExecucaoPayload, clientUuid: string) =>
    apiClient.post<ExecucaoVistoria>('/vistoria/execucoes/sincronizar', data, {
      headers: { 'Idempotency-Key': clientUuid },
    }),

  listarFormularios: (params?: { tipo_fiscalizacao?: string; per_page?: number }) =>
    apiClient.get<PaginatedResponse<ModeloFormulario>>('/vistoria/formularios', { params }),

  criarModeloFormulario: (data: ModeloFormularioPayload) =>
    apiClient.post<ModeloFormulario>('/vistoria/formularios', data),
};
