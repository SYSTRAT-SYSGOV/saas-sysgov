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
};
