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
  impacto_significativo: boolean;
  valor_empreendimento_centavos: number | null;
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
  impacto_significativo?: boolean;
  valor_empreendimento_centavos?: number | null;
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

export type SituacaoOcorrenciaQueimada = 'responsavel_identificado' | 'responsavel_nao_identificado';

export interface OcorrenciaQueimada {
  id: number;
  data_ocorrencia: string;
  latitude: number;
  longitude: number;
  area_queimada_ha: number | null;
  responsavel_pessoa_id: number | null;
  responsavel_empreendimento_id: number | null;
  auto_infracao_ambiental_id: number | null;
  situacao: SituacaoOcorrenciaQueimada;
}

export interface NovaOcorrenciaQueimadaInput {
  data_ocorrencia: string;
  latitude: number;
  longitude: number;
  area_queimada_ha?: number | null;
  responsavel_pessoa_id?: number | null;
  responsavel_empreendimento_id?: number | null;
}

export interface QueimadaFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: number; data_ocorrencia: string; area_queimada_ha: number | null; situacao: SituacaoOcorrenciaQueimada };
  }>;
}

export type TipoAreaProtegida = 'app' | 'reserva_legal' | 'unidade_conservacao';

export interface AreaProtegida {
  id: number;
  tipo: TipoAreaProtegida;
  subtipo: string | null;
  geometria: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  ato_legal: string | null;
}

export interface NovaAreaProtegidaInput {
  tipo: TipoAreaProtegida;
  subtipo?: string;
  geometria: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  ato_legal?: string;
}

export interface AreaProtegidaFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
    properties: { id: number; tipo: TipoAreaProtegida; subtipo: string | null; ato_legal: string | null };
  }>;
}

export type TipoGeradorResiduo = 'domiciliar' | 'comercial' | 'industrial';
export type TipoColeta = 'regular' | 'seletiva';
export type DestinacaoResiduo = 'aterro' | 'reciclagem';
export type CategoriaLogisticaReversa = 'eletronicos' | 'pilhas_baterias';

export interface GeradorResiduo {
  id: number;
  nome: string | null;
  tipo: TipoGeradorResiduo;
  pessoa_id: number | null;
  empreendimento_id: number | null;
  total_coletado_kg: number;
}

export interface NovoGeradorResiduoInput {
  nome?: string;
  tipo: TipoGeradorResiduo;
  pessoa_id?: number | null;
  empreendimento_id?: number | null;
}

export interface PontoLogisticaReversa {
  id: number;
  nome: string;
  categoria: CategoriaLogisticaReversa;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  total_acumulado_kg: number;
}

export type DestinoCompensacao = 'fundo_municipal' | 'unidade_conservacao';

export interface PagamentoCompensacao {
  id: number;
  valor_centavos: number;
  pago_em: string;
  comprovante: string | null;
}

export interface DestinacaoCompensacao {
  id: number;
  destino: DestinoCompensacao;
  valor_centavos: number;
  registrada_em: string;
}

export interface CompensacaoAmbiental {
  id: number;
  empreendimento_id: number;
  processo_licenciamento_id: number;
  percentual: number;
  valor_devido_centavos: number;
  valor_pago_centavos: number;
  valor_destinado_centavos: number;
  saldo_devedor_centavos: number;
  pagamentos?: PagamentoCompensacao[];
  destinacoes?: DestinacaoCompensacao[];
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

  listarCompensacoesAmbientais: (empreendimentoId: number) =>
    apiClient.get<{ data: CompensacaoAmbiental[] }>(`${base}/empreendimentos/${empreendimentoId}/compensacoes-ambientais`).then((r) => r.data.data),

  registrarPagamentoCompensacao: (compensacaoId: number, valorCentavos: number) =>
    apiClient.post<PagamentoCompensacao>(`${base}/compensacoes-ambientais/${compensacaoId}/pagamentos`, { valor_centavos: valorCentavos }).then((r) => r.data),

  registrarDestinacaoCompensacao: (compensacaoId: number, destino: DestinoCompensacao, valorCentavos: number) =>
    apiClient.post<DestinacaoCompensacao>(`${base}/compensacoes-ambientais/${compensacaoId}/destinacoes`, { destino, valor_centavos: valorCentavos }).then((r) => r.data),

  listarGeradoresResiduo: () =>
    apiClient.get<{ data: GeradorResiduo[] }>(`${base}/geradores-residuo`).then((r) => r.data.data),

  cadastrarGeradorResiduo: (dados: NovoGeradorResiduoInput) =>
    apiClient.post<GeradorResiduo>(`${base}/geradores-residuo`, dados).then((r) => r.data),

  registrarColetaResiduo: (geradorId: number, dados: { tipo_coleta: TipoColeta; rota?: string; volume_kg: number; destinacao: DestinacaoResiduo }) =>
    apiClient.post(`${base}/geradores-residuo/${geradorId}/coletas`, dados).then((r) => r.data),

  listarPontosLogisticaReversa: () =>
    apiClient.get<{ data: PontoLogisticaReversa[] }>(`${base}/pontos-logistica-reversa`).then((r) => r.data.data),

  cadastrarPontoLogisticaReversa: (dados: { nome: string; categoria: CategoriaLogisticaReversa }) =>
    apiClient.post<PontoLogisticaReversa>(`${base}/pontos-logistica-reversa`, dados).then((r) => r.data),

  registrarEntregaLogisticaReversa: (pontoId: number, quantidadeKg: number) =>
    apiClient.post(`${base}/pontos-logistica-reversa/${pontoId}/entregas`, { quantidade_kg: quantidadeKg }).then((r) => r.data),

  listarAreasProtegidas: () =>
    apiClient.get<{ data: AreaProtegida[] }>(`${base}/areas-protegidas`).then((r) => r.data.data),

  mapaAreasProtegidas: (params?: { tipo?: TipoAreaProtegida }) =>
    apiClient.get<AreaProtegidaFeatureCollection>(`${base}/areas-protegidas/mapa`, { params }).then((r) => r.data),

  cadastrarAreaProtegida: (dados: NovaAreaProtegidaInput) =>
    apiClient.post<AreaProtegida>(`${base}/areas-protegidas`, dados).then((r) => r.data),

  areasProtegidasSobrepostas: (empreendimentoId: number) =>
    apiClient.get<{ data: AreaProtegida[] }>(`${base}/empreendimentos/${empreendimentoId}/areas-protegidas-sobrepostas`).then((r) => r.data.data),

  listarOcorrenciasQueimada: () =>
    apiClient.get<{ data: OcorrenciaQueimada[] }>(`${base}/ocorrencias-queimada`).then((r) => r.data.data),

  mapaOcorrenciasQueimada: () =>
    apiClient.get<QueimadaFeatureCollection>(`${base}/ocorrencias-queimada/mapa`).then((r) => r.data),

  registrarOcorrenciaQueimada: (dados: NovaOcorrenciaQueimadaInput) =>
    apiClient.post<OcorrenciaQueimada>(`${base}/ocorrencias-queimada`, dados).then((r) => r.data),

  vincularResponsavelQueimada: (ocorrenciaId: number, dados: { responsavel_pessoa_id?: number; responsavel_empreendimento_id?: number; execucao_vistoria_id?: number }) =>
    apiClient.post<OcorrenciaQueimada>(`${base}/ocorrencias-queimada/${ocorrenciaId}/responsavel`, dados).then((r) => r.data),
};
