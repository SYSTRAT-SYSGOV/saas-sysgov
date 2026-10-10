import { apiClient } from '@/core/api/client';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/campanha (valores em centavos)         */
/* ------------------------------------------------------------------ */

export type Situacao = 'sem_atuacao' | 'em_andamento' | 'consolidado' | 'prioritario' | 'risco';
export type RelacaoPrefeito = 'aliado' | 'neutro' | 'oposicao' | 'sem_informacao';
export type Influencia = 'alta' | 'media' | 'baixa';
export type TipoCoordenador = 'estadual' | 'regional' | 'municipal';
export type Camada = 'situacao' | 'apoio_prefeito' | 'meta_votos' | 'mapa_calor';
export type CategoriaDemanda = 'saude' | 'infraestrutura' | 'seguranca' | 'educacao' | 'emenda_parlamentar' | 'oficio' | 'outra';
export type Prioridade = 'alta' | 'media' | 'baixa';
export type StatusDemanda = 'pendente' | 'em_andamento' | 'concluida';

export interface Faixas { faixas: { limite: number; cor: string }[]; cor_acima: string }

export interface Candidato {
  id: number;
  campanha_id: number;
  pessoa_id: number;
  nome_completo: string | null;
  cpf_mascarado: string | null;
  nome_urna: string;
  partido: string | null;
  numero: string | null;
  coligacao: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  site: string | null;
  biografia: string | null;
  votos_ultima_eleicao: number | null;
  cargo_ultima_eleicao: string | null;
  observacoes: string | null;
}

export interface Campanha {
  id: number;
  nome: string;
  ano: number;
  cargo: string;
  uf: string;
  meta_votos_global: number;
  status: 'ativa' | 'encerrada';
  candidato: Candidato | null;
}

/** Campos de LGPD da campanha (GET /campanhas/{id}). */
export interface LgpdCampanha {
  lgpd_termo: string | null;
  lgpd_termo_versao: number;
  lgpd_encarregado_nome: string | null;
  lgpd_encarregado_contato: string | null;
  lgpd_retencao_dias: number;
  encerrada_em: string | null;
  lgpd_termo_vigente: string;
  anonimizacao_prevista: string | null;
}

export interface CampanhaAtual extends Campanha {
  cores: Record<Situacao, string>;
  faixas: Faixas;
}

export type DadosCampanha = Pick<Campanha, 'nome' | 'ano' | 'cargo' | 'uf'> & Partial<Pick<Campanha, 'meta_votos_global' | 'status'>>;
export type DadosLgpd = Partial<Pick<LgpdCampanha, 'lgpd_termo' | 'lgpd_encarregado_nome' | 'lgpd_encarregado_contato' | 'lgpd_retencao_dias'>>;
export type DadosCandidato = Partial<Omit<Candidato, 'id' | 'campanha_id' | 'pessoa_id' | 'cpf_mascarado'>> & { cpf?: string | null };

export interface Membro { user_id: number; nome: string; email: string }

export interface PrefeitoLinha { nome: string | null; partido: string | null; vice: string | null; relacao: RelacaoPrefeito; influencia: Influencia | null }

export interface MunicipioLinha {
  codigo_ibge: number;
  nome: string;
  regiao_intermediaria: string | null;
  regiao_imediata: string | null;
  populacao: number | null;
  eleitores: number | null;
  situacao: Situacao;
  meta_votos: number;
  votos_anterior: number;
  coordenador: { id: number; nome: string | null } | null;
  prefeito: PrefeitoLinha;
  cabos: number;
  vereadores_aliados: number;
}

export interface Vereador {
  id: number;
  codigo_ibge: number;
  ref_mandatario_id: number | null;
  nome: string;
  partido: string | null;
  numero: string | null;
  mandato: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  aliado: boolean;
  votos_estimados: number;
  dobradinha: string | null;
  apoio_presidente: string | null;
  apoio_governador: string | null;
  apoio_senador: string | null;
  apoio_dep_federal: string | null;
  apoio_dep_estadual: string | null;
  observacoes: string | null;
}

export interface VereadorEleito { id: number; nome: string; nome_urna: string | null; partido: string | null; numero: string | null; ano_eleicao: number }

export interface FichaMunicipio extends MunicipioLinha {
  publico: { codigo_ibge: number; uf: string; mesorregiao: string | null; microrregiao: string | null; populacao: number | null; ano_populacao: number | null; eleitores: number | null; zonas: number | null; secoes: number | null; ano_eleitorado: number | null };
  potencial: string | null;
  historico: string | null;
  observacoes: string | null;
  prefeito: PrefeitoLinha & { contato: { id: number; telefone: string | null; whatsapp: string | null; email: string | null; observacoes: string | null } | null };
  vereadores: Vereador[];
  vereadores_eleitos: VereadorEleito[];
  cabos_eleitorais: { id: number; nome: string; bairro: string | null; votos_estimados: number; coordenador_id: number | null; whatsapp: string | null }[];
}

export type DadosMunicipio = Partial<Pick<FichaMunicipio, 'situacao' | 'meta_votos' | 'votos_anterior' | 'potencial' | 'historico' | 'observacoes'>> & { coordenador_id?: number | null };

export interface PontoMapa {
  nome: string;
  situacao: Situacao;
  meta_votos: number;
  coordenador: string | null;
  prefeito: string | null;
  partido_prefeito: string | null;
  vice: string | null;
  relacao_prefeito: RelacaoPrefeito;
  cabos: number;
  eleitores: number | null;
}

export interface Painel {
  municipios: number;
  por_situacao: Record<Situacao, number>;
  coordenadores: number;
  cabos_eleitorais: number;
  prefeitos_aliados: number;
  vereadores_aliados: number;
  meta_total: number;
  meta_global: number;
  eleitores: number;
  por_regiao: { regiao: string; municipios: number; meta_votos: number; eleitores: number; consolidados: number }[];
}

export interface Coordenador {
  id: number;
  nome: string;
  tipo: TipoCoordenador;
  cpf_mascarado: string | null;
  codigo_ibge: number | null;
  regiao: string | null;
  meta_votos: number;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  observacoes: string | null;
}

export interface CaboEleitoral {
  id: number;
  nome: string;
  cpf_mascarado: string | null;
  codigo_ibge: number;
  bairro: string | null;
  endereco: string | null;
  coordenador_id: number | null;
  votos_estimados: number;
  area_atuacao: string | null;
  disponibilidade: string | null;
  veiculo_proprio: boolean;
  ajuda_custo: boolean;
  valor_ajuda_centavos: number;
  pix: string | null;
  banco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  observacoes: string | null;
}

export interface PrefeitoCampanha extends PrefeitoLinha { codigo_ibge: number; municipio: string; regiao: string | null }

export type DadosCoordenador = Partial<Omit<Coordenador, 'id' | 'cpf_mascarado'>> & { cpf?: string | null };
export type DadosCabo = Partial<Omit<CaboEleitoral, 'id' | 'cpf_mascarado'>> & { cpf?: string | null };
export type DadosVereador = Partial<Omit<Vereador, 'id'>>;

export interface LinkCaptacao {
  id: number;
  codigo: string;
  url: string;
  tipo: 'coordenador' | 'cabo';
  coordenador_id: number | null;
  cabo_id: number | null;
  responsavel: string;
  descricao: string | null;
  ativo: boolean;
  cadastros: number;
  created_at: string | null;
}

export interface Eleitor {
  id: number;
  link_id: number | null;
  coordenador_id: number | null;
  cabo_id: number | null;
  nome: string | null;
  codigo_ibge: number;
  municipio: string;
  bairro: string | null;
  zona: number | null;
  secao: number | null;
  whatsapp: string | null;
  data_nascimento: string | null;
  demanda: string | null;
  latitude: number | null;
  longitude: number | null;
  precisao_m: number | null;
  consentimento_versao: number;
  consentido_em: string;
  ip: string | null;
  user_agent: string | null;
  anonimizado_em: string | null;
  created_at: string;
  responsavel: string | null;
  responsavel_tipo: 'coordenador' | 'cabo' | null;
}

export interface FiltrosEleitores { codigo_ibge?: number; bairro?: string; coordenador_id?: number; cabo_id?: number; link_id?: number; de?: string; ate?: string; busca?: string; pagina?: number }

export interface IndicadoresEleitores {
  total: number;
  com_localizacao: number;
  ultimos_7_dias: number;
  anonimizados: number;
  por_municipio: { codigo_ibge: number; municipio: string; total: number }[];
  por_responsavel: { tipo: 'coordenador' | 'cabo' | null; id: number | null; nome: string; total: number }[];
}

/** [latitude, longitude, peso] — arredondados no servidor, sem dado pessoal. */
export type PontoCalor = [number, number, number];

export interface Demanda {
  id: number;
  codigo_ibge: number;
  solicitante: string;
  eleitor_id: number | null;
  categoria: CategoriaDemanda;
  prioridade: Prioridade;
  responsavel_id: number | null;
  responsavel: { id: number; name: string } | null;
  prazo: string | null;
  status: StatusDemanda;
  descricao: string;
  historico: { em: string; por: string | null; texto: string }[] | null;
  atrasada: boolean;
  created_at: string;
}

export type DadosDemanda = Partial<Pick<Demanda, 'codigo_ibge' | 'solicitante' | 'categoria' | 'prioridade' | 'responsavel_id' | 'prazo' | 'status' | 'descricao'>> & { comentario?: string | null };

/* Fase 2B — materiais, financeiro, agenda e pesquisas (valores em centavos; percentuais em décimos) */

export interface Material {
  id: number;
  tipo: string;
  nome: string;
  fornecedor: string | null;
  unidade: string;
  quantidade_produzida: number;
  valor_total_centavos: number;
  peso_kg: number | null;
  volume_m3: number | null;
  observacoes: string | null;
  tem_imagem: boolean;
  enviado: number;
  estoque: number;
}

export type DadosMaterial = Partial<Pick<Material, 'tipo' | 'nome' | 'fornecedor' | 'unidade' | 'quantidade_produzida' | 'valor_total_centavos' | 'peso_kg' | 'volume_m3' | 'observacoes'>> & { lancar_despesa?: boolean };

export interface Remessa {
  id: number;
  material_id: number;
  material: { id: number; nome: string; tipo: string; unidade: string } | null;
  codigo_ibge: number;
  coordenador_id: number | null;
  cabo_id: number | null;
  quantidade: number;
  enviada_em: string;
  transportadora: string | null;
  motorista: string | null;
  veiculo: string | null;
  previsao_entrega: string | null;
  entregue_em: string | null;
  recebido_por: string | null;
  observacoes: string | null;
  tem_foto: boolean;
  entregue: boolean;
}

export type DadosRemessa = Partial<Omit<Remessa, 'id' | 'material' | 'tem_foto' | 'entregue'>>;

export type TipoLancamento = 'receita' | 'despesa';

export interface Lancamento {
  id: number;
  tipo: TipoLancamento;
  categoria: string;
  valor_centavos: number;
  data: string;
  forma_pagamento: string;
  codigo_ibge: number | null;
  contraparte_nome: string | null;
  contraparte_documento: string | null;
  origem_recurso: string | null;
  recibo_eleitoral: string | null;
  documento_fiscal_tipo: string | null;
  documento_fiscal_numero: string | null;
  material_id: number | null;
  observacoes: string | null;
  tem_comprovante: boolean;
}

export type DadosLancamento = Partial<Omit<Lancamento, 'id' | 'tem_comprovante'>>;

export interface OpcoesFinanceiro {
  categorias: Record<TipoLancamento, Record<string, string>>;
  origens: Record<string, string>;
  formas: Record<string, string>;
  documentos_fiscais: Record<string, string>;
}

export interface FiltrosFinanceiro { de?: string; ate?: string; tipo?: TipoLancamento; categoria?: string; origem_recurso?: string; codigo_ibge?: number; busca?: string; pagina?: number }

export interface ResumoFinanceiro {
  receitas_centavos: number;
  despesas_centavos: number;
  saldo_centavos: number;
  lancamentos: number;
  por_categoria: { tipo: TipoLancamento; categoria: string; rotulo: string; total_centavos: number }[];
  por_origem: { origem: string | null; rotulo: string; total_centavos: number }[];
  por_municipio: { codigo_ibge: number | null; municipio: string; receitas_centavos: number; despesas_centavos: number }[];
}

export type TipoAgenda = 'evento' | 'reuniao' | 'visita';

export interface Evento { id: number; nome: string; codigo_ibge: number; local: string; inicio: string; responsavel_id: number | null; publico_estimado: number; publico_presente: number; observacoes: string | null }
export interface Reuniao { id: number; titulo: string; codigo_ibge: number; local: string | null; inicio: string; participantes: string | null; ata: string | null; pendencias: string | null; responsavel_id: number | null; prazo_pendencias: string | null; pendencias_resolvidas: boolean; pendencia_vencida: boolean }
export interface Visita { id: number; lideranca: string; codigo_ibge: number; bairro: string | null; data: string; assunto: string; resultado: string | null; encaminhamento: string | null; demanda_id: number | null }

export interface ItemAgenda {
  tipo: TipoAgenda;
  id: number;
  titulo: string;
  inicio: string;
  dia_inteiro: boolean;
  codigo_ibge: number;
  municipio: string;
  alerta: boolean;
  registro?: Evento | Reuniao | Visita;
}

export interface ResultadoPesquisa { id?: number; nome: string; partido: string | null; percentual_decimos: number; da_campanha: boolean }

export interface Pesquisa {
  id: number;
  tipo: 'interna' | 'externa';
  instituto: string;
  divulgada_em: string;
  codigo_ibge: number | null;
  margem_erro_decimos: number;
  amostra: number | null;
  registro_tse: string | null;
  observacoes: string | null;
  resultados: ResultadoPesquisa[];
}

export type DadosPesquisa = Partial<Omit<Pesquisa, 'id' | 'resultados'>> & { resultados?: Omit<ResultadoPesquisa, 'id'>[] };

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

const base = '/campanha';
const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.post<T>(`${base}${url}`, body)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async (url: string): Promise<void> => { await apiClient.delete(`${base}${url}`); };
const enviarArquivo = async <T,>(url: string, arquivo: File): Promise<T> => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return (await apiClient.post<T>(`${base}${url}`, corpo, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};
/** Arquivo protegido (comprovante, imagem, foto, planilha) baixado pela API, com a autorização do usuário. */
const baixar = async (url: string, params?: Record<string, unknown>): Promise<Blob> => (await apiClient.get<Blob>(`${base}${url}`, { params, responseType: 'blob' })).data;

export const campanhaApi = {
  // Sem campanha de trabalho
  minhas: async () => (await get<{ campanhas: Campanha[] }>('/campanhas/minhas')).campanhas,
  criarCampanha: (dados: DadosCampanha) => post<Campanha>('/campanhas', dados),
  atualizarCampanha: (id: number, dados: Partial<DadosCampanha>) => put<Campanha>(`/campanhas/${id}`, dados),
  salvarCandidato: (id: number, dados: DadosCandidato) => put<Candidato>(`/campanhas/${id}/candidato`, dados),
  membros: async (id: number) => (await get<{ membros: Membro[] }>(`/campanhas/${id}/membros`)).membros,
  usuariosDisponiveis: async (id: number) => (await get<{ usuarios: { id: number; nome: string; email: string }[] }>(`/campanhas/${id}/usuarios`)).usuarios,
  definirMembros: async (id: number, userIds: number[]) => (await put<{ membros: Membro[] }>(`/campanhas/${id}/membros`, { user_ids: userIds })).membros,
  malha: (uf: string) => get<GeoJSON.FeatureCollection>(`/referencia/${uf}/malha`),

  // Campanha de trabalho (X-Campanha-ID)
  atual: () => get<CampanhaAtual>('/atual'),
  municipios: async (filtros?: { situacao?: Situacao; regiao?: string; coordenador_id?: number; busca?: string }) => (await get<{ municipios: MunicipioLinha[] }>('/municipios', filtros)).municipios,
  ficha: (ibge: number) => get<FichaMunicipio>(`/municipios/${ibge}`),
  atualizarMunicipio: (ibge: number, dados: DadosMunicipio) => put<FichaMunicipio>(`/municipios/${ibge}`, dados),
  mapa: async () => (await get<{ municipios: Record<string, PontoMapa> }>('/mapa')).municipios,
  painel: () => get<Painel>('/painel'),

  coordenadores: async () => (await get<{ coordenadores: Coordenador[] }>('/coordenadores')).coordenadores,
  salvarCoordenador: (id: number | null, dados: DadosCoordenador) => (id ? put<Coordenador>(`/coordenadores/${id}`, dados) : post<Coordenador>('/coordenadores', dados)),
  excluirCoordenador: (id: number) => del(`/coordenadores/${id}`),
  cabos: async (filtros?: { codigo_ibge?: number; coordenador_id?: number; busca?: string }) => (await get<{ cabos: CaboEleitoral[] }>('/cabos', filtros)).cabos,
  salvarCabo: (id: number | null, dados: DadosCabo) => (id ? put<CaboEleitoral>(`/cabos/${id}`, dados) : post<CaboEleitoral>('/cabos', dados)),
  excluirCabo: (id: number) => del(`/cabos/${id}`),
  prefeitos: async () => (await get<{ prefeitos: PrefeitoCampanha[] }>('/prefeitos')).prefeitos,
  salvarPrefeito: (ibge: number, dados: { relacao: Exclude<RelacaoPrefeito, 'sem_informacao'>; influencia?: Influencia; telefone?: string | null; whatsapp?: string | null; email?: string | null; observacoes?: string | null }) => put(`/prefeitos/${ibge}`, dados),
  excluirPrefeito: (ibge: number) => del(`/prefeitos/${ibge}`),
  vereadores: async (filtros?: { codigo_ibge?: number; aliado?: boolean }) => (await get<{ vereadores: Vereador[] }>('/vereadores', filtros ? { ...filtros, aliado: filtros.aliado === undefined ? undefined : Number(filtros.aliado) } : undefined)).vereadores,
  salvarVereador: (id: number | null, dados: DadosVereador) => (id ? put<Vereador>(`/vereadores/${id}`, dados) : post<Vereador>('/vereadores', dados)),
  excluirVereador: (id: number) => del(`/vereadores/${id}`),
  lgpd: (id: number) => get<Campanha & LgpdCampanha>(`/campanhas/${id}`),
  salvarLgpd: (id: number, dados: DadosLgpd) => put<Campanha & LgpdCampanha>(`/campanhas/${id}`, dados),

  links: async () => (await get<{ links: LinkCaptacao[] }>('/links')).links,
  criarLink: (dados: { tipo: 'coordenador' | 'cabo'; coordenador_id?: number; cabo_id?: number; descricao?: string | null }) => post<LinkCaptacao>('/links', dados),
  atualizarLink: (id: number, dados: { ativo?: boolean; descricao?: string | null }) => put<LinkCaptacao>(`/links/${id}`, dados),
  excluirLink: (id: number) => del(`/links/${id}`),
  qrcode: async (id: number) => (await apiClient.get<string>(`${base}/links/${id}/qrcode`, { responseType: 'text' })).data,

  eleitores: (filtros?: FiltrosEleitores) => get<{ eleitores: Eleitor[]; total: number; pagina: number; por_pagina: number }>('/eleitores', filtros as Record<string, unknown>),
  eleitor: (id: number) => get<Eleitor>(`/eleitores/${id}`),
  indicadoresEleitores: () => get<IndicadoresEleitores>('/eleitores/indicadores'),
  exportarEleitores: async (filtros?: FiltrosEleitores) => (await apiClient.get<Blob>(`${base}/eleitores/exportar`, { params: filtros, responseType: 'blob' })).data,
  excluirEleitor: (id: number) => del(`/eleitores/${id}`),
  mapaCalor: async () => (await get<{ pontos: PontoCalor[] }>('/mapa-calor')).pontos,

  demandas: async (filtros?: { codigo_ibge?: number; status?: StatusDemanda; prioridade?: Prioridade; responsavel_id?: number; atrasadas?: boolean }) =>
    (await get<{ demandas: Demanda[] }>('/demandas', filtros ? { ...filtros, atrasadas: filtros.atrasadas ? 1 : undefined } : undefined)).demandas,
  responsaveisDemanda: async () => (await get<{ responsaveis: { id: number; name: string }[] }>('/demandas/responsaveis')).responsaveis,
  salvarDemanda: (id: number | null, dados: DadosDemanda) => (id ? put<Demanda>(`/demandas/${id}`, dados) : post<Demanda>('/demandas', dados)),
  excluirDemanda: (id: number) => del(`/demandas/${id}`),
  demandaDoEleitor: (eleitorId: number, dados: { categoria?: CategoriaDemanda; prioridade?: Prioridade; responsavel_id?: number | null; prazo?: string | null }) => post<Demanda>(`/eleitores/${eleitorId}/demanda`, dados),

  materiais: async () => (await get<{ materiais: Material[] }>('/materiais')).materiais,
  salvarMaterial: (id: number | null, dados: DadosMaterial) => (id ? put<Material>(`/materiais/${id}`, dados) : post<Material>('/materiais', dados)),
  excluirMaterial: (id: number) => del(`/materiais/${id}`),
  enviarImagemMaterial: (id: number, arquivo: File) => enviarArquivo<Material>(`/materiais/${id}/imagem`, arquivo),
  imagemMaterial: (id: number) => baixar(`/materiais/${id}/imagem`),
  remessas: async (filtros?: { material_id?: number; codigo_ibge?: number; pendentes?: boolean }) => (await get<{ remessas: Remessa[] }>('/remessas', filtros ? { ...filtros, pendentes: filtros.pendentes ? 1 : undefined } : undefined)).remessas,
  salvarRemessa: (id: number | null, dados: DadosRemessa) => (id ? put<Remessa>(`/remessas/${id}`, dados) : post<Remessa>('/remessas', dados)),
  excluirRemessa: (id: number) => del(`/remessas/${id}`),
  enviarFotoRemessa: (id: number, arquivo: File) => enviarArquivo<Remessa>(`/remessas/${id}/foto`, arquivo),
  fotoRemessa: (id: number) => baixar(`/remessas/${id}/foto`),

  opcoesFinanceiro: () => get<OpcoesFinanceiro>('/financeiro/opcoes'),
  resumoFinanceiro: (filtros?: FiltrosFinanceiro) => get<ResumoFinanceiro>('/financeiro/resumo', filtros as Record<string, unknown>),
  lancamentos: (filtros?: FiltrosFinanceiro) => get<{ lancamentos: Lancamento[]; total: number; pagina: number; por_pagina: number }>('/lancamentos', filtros as Record<string, unknown>),
  salvarLancamento: (id: number | null, dados: DadosLancamento) => (id ? put<Lancamento>(`/lancamentos/${id}`, dados) : post<Lancamento>('/lancamentos', dados)),
  excluirLancamento: (id: number) => del(`/lancamentos/${id}`),
  enviarComprovante: (id: number, arquivo: File) => enviarArquivo<Lancamento>(`/lancamentos/${id}/comprovante`, arquivo),
  comprovante: (id: number) => baixar(`/lancamentos/${id}/comprovante`),
  exportarFinanceiro: (filtros?: FiltrosFinanceiro) => baixar('/financeiro/exportar', { ...filtros, pagina: undefined }),

  agenda: async (filtros?: { de?: string; ate?: string; codigo_ibge?: number; tipo?: TipoAgenda }) => (await get<{ itens: ItemAgenda[] }>('/agenda', filtros)).itens,
  proximosCompromissos: async () => (await get<{ itens: ItemAgenda[] }>('/agenda/proximos')).itens,
  salvarEvento: (id: number | null, dados: Partial<Omit<Evento, 'id'>>) => (id ? put<Evento>(`/eventos/${id}`, dados) : post<Evento>('/eventos', dados)),
  salvarReuniao: (id: number | null, dados: Partial<Omit<Reuniao, 'id' | 'pendencia_vencida'>>) => (id ? put<Reuniao>(`/reunioes/${id}`, dados) : post<Reuniao>('/reunioes', dados)),
  salvarVisita: (id: number | null, dados: Partial<Omit<Visita, 'id' | 'demanda_id'>>) => (id ? put<Visita>(`/visitas/${id}`, dados) : post<Visita>('/visitas', dados)),
  excluirDaAgenda: (tipo: TipoAgenda, id: number) => del(`/${tipo === 'evento' ? 'eventos' : tipo === 'reuniao' ? 'reunioes' : 'visitas'}/${id}`),
  demandaDaVisita: (id: number) => post<Demanda>(`/visitas/${id}/demanda`),

  pesquisas: async (filtros?: { codigo_ibge?: number; tipo?: 'interna' | 'externa' }) => (await get<{ pesquisas: Pesquisa[] }>('/pesquisas', filtros)).pesquisas,
  evolucaoPesquisas: async (codigoIbge?: number) => (await get<{ pontos: { id: number; divulgada_em: string; instituto: string; tipo: string; percentual_decimos: number }[] }>('/pesquisas/evolucao', codigoIbge ? { codigo_ibge: codigoIbge } : undefined)).pontos,
  salvarPesquisa: (id: number | null, dados: DadosPesquisa) => (id ? put<Pesquisa>(`/pesquisas/${id}`, dados) : post<Pesquisa>('/pesquisas', dados)),
  excluirPesquisa: (id: number) => del(`/pesquisas/${id}`),

  configurar: (dados: { cores_situacao?: Partial<Record<Situacao, string>>; faixas_meta?: Faixas }) => put<{ cores: Record<Situacao, string>; faixas: Faixas }>('/configuracao', dados),
};

/* ------------------------------------------------------------------ */
/* Formulário público de captação (sem login)                           */
/* ------------------------------------------------------------------ */

export interface FormularioPublico {
  encontrado: true;
  ativo: boolean;
  mensagem?: string;
  campanha: { nome: string; cargo: string; ano: number; uf: string };
  candidato: { nome_urna: string; numero: string | null; partido: string | null } | null;
  responsavel: string;
  termo?: string;
  termo_versao?: number;
  encarregado?: { nome: string | null; contato: string | null };
  municipios?: { codigo_ibge: number; nome: string }[];
  iniciado_em?: string;
}

export interface EnvioPublico {
  nome: string;
  codigo_ibge: number;
  bairro: string;
  zona?: number | null;
  secao?: number | null;
  whatsapp?: string | null;
  data_nascimento?: string | null;
  demanda?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao_m?: number | null;
  aceite: boolean;
  iniciado_em: string;
  site: string;
}

export const cadastroPublicoApi = {
  formulario: async (codigo: string) => (await apiClient.get<FormularioPublico>(`/public/campanha/links/${encodeURIComponent(codigo)}`)).data,
  enviar: async (codigo: string, dados: EnvioPublico) => (await apiClient.post<{ ok: boolean; atualizado: boolean }>(`/public/campanha/links/${encodeURIComponent(codigo)}/cadastros`, dados)).data,
};
