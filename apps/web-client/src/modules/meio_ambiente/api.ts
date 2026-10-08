import { apiClient } from '@/core/api/client';

const base = '/meio_ambiente';

// ── Tipos ──────────────────────────────────────────────────────────
export type Porte = 'pequeno' | 'medio' | 'grande';
export type TipoRegistroProfissional = 'CREA' | 'CRBio';

export interface ResponsavelTecnico {
  id: number;
  nome: string;
  registro_profissional: string;
  tipo_registro: TipoRegistroProfissional;
}

export interface Empreendimento {
  id: number;
  titular_pessoa_id: number | null;
  titular_nome?: string | null;
  cnpj: string | null;
  razao_social: string | null;
  atividade: string;
  porte: Porte;
  latitude: number;
  longitude: number;
  responsavel_tecnico?: ResponsavelTecnico | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface NovoEmpreendimentoInput {
  titular_pessoa_id?: number | null;
  cnpj?: string | null;
  razao_social?: string | null;
  atividade: string;
  porte: Porte;
  latitude: number;
  longitude: number;
}

export interface NovoResponsavelTecnicoInput {
  pessoa_id?: number | null;
  nome: string;
  registro_profissional: string;
  tipo_registro: TipoRegistroProfissional;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: number; atividade: string; porte: Porte; razao_social: string | null };
  }>;
}

interface ErroApiResponse {
  message?: string;
  code?: string;
}

export interface ErroApi {
  mensagem: string;
  codigo?: string;
}

export function erroApi(erro: unknown): ErroApi {
  const err = erro as { response?: { data?: ErroApiResponse } };
  return {
    mensagem: err?.response?.data?.message ?? 'Não foi possível concluir a operação.',
    codigo: err?.response?.data?.code,
  };
}

// ── API ────────────────────────────────────────────────────────────
export const meioAmbienteApi = {
  listarEmpreendimentos: (params?: { q?: string; per_page?: number }) =>
    apiClient.get<PaginatedResponse<Empreendimento>>(`${base}/empreendimentos`, { params }).then((r) => r.data),

  mapaEmpreendimentos: (params?: { atividade?: string; porte?: Porte }) =>
    apiClient.get<GeoJsonFeatureCollection>(`${base}/empreendimentos/mapa`, { params }).then((r) => r.data),

  obterEmpreendimento: (id: number) =>
    apiClient.get<Empreendimento>(`${base}/empreendimentos/${id}`).then((r) => r.data),

  criarEmpreendimento: (dados: NovoEmpreendimentoInput) =>
    apiClient.post<Empreendimento>(`${base}/empreendimentos`, dados).then((r) => r.data),

  vincularResponsavelTecnico: (empreendimentoId: number, dados: NovoResponsavelTecnicoInput) =>
    apiClient.post<ResponsavelTecnico>(`${base}/empreendimentos/${empreendimentoId}/responsavel-tecnico`, dados).then((r) => r.data),
};
