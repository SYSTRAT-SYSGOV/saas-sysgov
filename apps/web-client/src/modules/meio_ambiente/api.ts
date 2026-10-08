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

export type FaseLicenciamento = 'LP' | 'LI' | 'LO' | 'renovacao' | 'correcao';
export type StatusProcessoLicenciamento = 'em_analise' | 'deferido' | 'indeferido';
export type ResultadoVistoriaTecnica = 'favoravel' | 'desfavoravel';
export type SituacaoCondicionante = 'pendente' | 'cumprida';

export interface Condicionante {
  id: number;
  descricao: string;
  prazo: string;
  situacao: SituacaoCondicionante;
}

export interface DocumentoLicenciamento {
  id: number;
  tipo: string;
  anexado_em: string;
}

export interface ProcessoLicenciamento {
  id: number;
  empreendimento_id: number;
  fase: FaseLicenciamento;
  numero: string;
  exercicio: number;
  status: StatusProcessoLicenciamento;
  data_deferimento: string | null;
  validade_em: string | null;
  condicionantes?: Condicionante[];
  documentos?: DocumentoLicenciamento[];
  created_at: string;
}

export type TipoInfracaoAmbiental = 'desmatamento' | 'poluicao_hidrica' | 'poluicao_atmosferica' | 'queimada' | 'caca_ilegal' | 'outra';

export interface AutoInfracaoAmbiental {
  id: number;
  documento_id: number;
  documento_numero?: string;
  empreendimento_id: number;
  tipo_infracao: TipoInfracaoAmbiental;
  area_afetada_ha: number | null;
  reincidente: boolean;
  valor_multa_sugerido_centavos: number | null;
  created_at: string;
}

export interface NovoAutoInfracaoAmbientalInput {
  empreendimento_id: number;
  tipo_infracao: TipoInfracaoAmbiental;
  area_afetada_ha?: number | null;
  irregularidade?: string;
  enquadramento_legal?: string;
  prazo_dias?: number;
}

export interface ParcelaMulta {
  id: number;
  numero: number;
  valor_centavos: number;
  vencimento: string;
  pago: boolean;
}

export interface ParcelamentoMulta {
  id: number;
  numero_parcelas: number;
  valor_total_centavos: number;
  parcelas: ParcelaMulta[];
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

  listarProcessosLicenciamento: (empreendimentoId: number) =>
    apiClient.get<{ data: ProcessoLicenciamento[] }>(`${base}/empreendimentos/${empreendimentoId}/processos-licenciamento`).then((r) => r.data.data),

  obterProcessoLicenciamento: (id: number) =>
    apiClient.get<ProcessoLicenciamento>(`${base}/processos-licenciamento/${id}`).then((r) => r.data),

  abrirProcessoLicenciamento: (empreendimentoId: number, fase: FaseLicenciamento) =>
    apiClient.post<ProcessoLicenciamento>(`${base}/empreendimentos/${empreendimentoId}/processos-licenciamento`, { fase }).then((r) => r.data),

  anexarDocumentoLicenciamento: (processoId: number, tipo: string, arquivo?: File | null) => {
    const form = new FormData();
    form.append('tipo', tipo);
    if (arquivo) form.append('arquivo', arquivo);
    return apiClient.post<DocumentoLicenciamento>(`${base}/processos-licenciamento/${processoId}/documentos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  registrarCondicionante: (processoId: number, dados: { descricao: string; prazo: string }) =>
    apiClient.post<Condicionante>(`${base}/processos-licenciamento/${processoId}/condicionantes`, dados).then((r) => r.data),

  cumprirCondicionante: (condicionanteId: number) =>
    apiClient.post<Condicionante>(`${base}/condicionantes/${condicionanteId}/cumprir`).then((r) => r.data),

  registrarVistoriaTecnica: (processoId: number, dados: { resultado: ResultadoVistoriaTecnica; parecer?: string }) =>
    apiClient.post(`${base}/processos-licenciamento/${processoId}/vistoria-tecnica`, dados).then((r) => r.data),

  deferirProcessoLicenciamento: (processoId: number, justificativaParecerDesfavoravel?: string) =>
    apiClient.post<ProcessoLicenciamento>(`${base}/processos-licenciamento/${processoId}/deferir`, {
      justificativa_parecer_desfavoravel: justificativaParecerDesfavoravel,
    }).then((r) => r.data),

  emitirAutoInfracaoAmbiental: (execucaoVistoriaId: number, dados: NovoAutoInfracaoAmbientalInput) =>
    apiClient.post<AutoInfracaoAmbiental>(`${base}/execucoes-vistoria/${execucaoVistoriaId}/autos-infracao-ambiental`, dados).then((r) => r.data),

  obterAutoInfracaoAmbiental: (id: number) =>
    apiClient.get<AutoInfracaoAmbiental>(`${base}/autos-infracao-ambiental/${id}`).then((r) => r.data),

  parcelarMulta: (processoSancionatorioId: number, numeroParcelas: number) =>
    apiClient.post<ParcelamentoMulta>(`${base}/processos-sancionatorios/${processoSancionatorioId}/parcelamento`, { numero_parcelas: numeroParcelas }).then((r) => r.data),
};
