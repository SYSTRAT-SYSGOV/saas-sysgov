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
};
