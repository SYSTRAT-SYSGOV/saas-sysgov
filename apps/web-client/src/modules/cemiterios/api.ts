import axios from 'axios';
import type { LineString, Point, Polygon } from 'geojson';
import { apiClient } from '@/core/api/client';

/* ------------------------------------------------------------------ */
/* Tipos (espelham os JSON da API api/cemiterios)                       */
/* ------------------------------------------------------------------ */

export type EstadoJazigo = 'disponivel' | 'concedido' | 'ocupado' | 'capacidade_maxima' | 'manutencao';

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface Setor { id: number; park_id: number; codigo: string; descricao: string | null; tipo_zona: string; area_m2: number | null }
export interface Parque {
  id: number; codigo: string; nome: string; endereco: string | null; tipo: string; situacao: string;
  responsavel: string | null; lat: number | null; lng: number | null;
  portaria_lat?: number | null; portaria_lng?: number | null;
  setores?: Setor[]; setores_count?: number; jazigos_count?: number;
}
export type Cemiterio = Parque;
export interface Jazigo {
  id: number; park_id: number; sector_id: number; codigo: string; codigo_legado?: string | null; processo_administrativo?: string | null; tipo: string; capacidade: number; ocupacao: number;
  estado: EstadoJazigo; comprimento_m: number | null; largura_m: number | null; lat: number | null; lng: number | null; lock_version: number;
  setor?: Setor; cemiterio?: Parque; concessoes?: Concessao[]; inumacoes?: Inumacao[];
}
export interface EventoHistorico { data: string; tipo: string; descricao: string }
export interface Falecido {
  id: number;
  nome: string;
  nascimento: string | null;
  falecimento: string;
  idade_obito: number | null;
  certidao_numero: string | null;
  certidao_cartorio?: string | null;
  certidao_arquivo?: string | null;
  documento?: string | null;
}
export interface OrdemServico {
  id: number;
  ano: number;
  numero: number;
  tipo: string;
  plot_id: number | null;
  agendada_para: string | null;
  equipe: string | null;
  situacao: string;
  observacao: string | null;
  executada_em: string | null;
  jazigo?: (Pick<Jazigo, 'id' | 'codigo'> & { cemiterio?: { id: number; nome: string } }) | null;
  falecido?: string | null;
  rotulo?: string;
}
export interface Inumacao {
  id: number; deceased_id: number; plot_id: number; gaveta_numero?: number | null; sepultado_em: string; situacao: string; origem: string; revisao_pendente: boolean;
  tipo?: string | null; livro_referencia: string | null; carencia_desde: string; service_order_id: number | null;
  coveiro_nome?: string | null; pedreiro_nome?: string | null; cartorio?: string | null; medico?: string | null;
  falecido?: Falecido; jazigo?: Pick<Jazigo, 'id' | 'codigo'> & { cemiterio?: { nome: string } }; ordem_servico?: OrdemServico | null;
}
export interface Exumacao {
  id: number; burial_id: number; tipo: string; situacao: string; prazo_aplicado_anos: number | null; liberada_em: string | null;
  motivo_suspensao: string | null; destino?: string | null; inumacao?: Inumacao; ordem_servico?: OrdemServico | null;
}
export interface Trasladacao {
  id: number;
  burial_id: number;
  plot_origem_id: number;
  plot_destino_id: number | null;
  destino_externo: string | null;
  documento_destino: string | null;
  situacao: string;
  service_order_id: number | null;
  created_at: string;
  inumacao?: Inumacao;
  jazigoOrigem?: Pick<Jazigo, 'id' | 'codigo'>;
  jazigoDestino?: Pick<Jazigo, 'id' | 'codigo'>;
}
export interface Concessionario {
  id: number; nome: string; tipo_doc: 'cpf' | 'cnpj'; documento_mascarado: string; documento?: string;
  email: string | null; telefone: string | null; endereco: string | null; base_legal: string;
  titular_falecido?: boolean; data_falecimento_titular?: string | null; processo_inventario?: string | null;
  cep?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null;
  bairro?: string | null; cidade?: string | null; uf?: string | null;
}
export interface Concessao {
  id: number; numero: string; processo_administrativo?: string | null; plot_id: number; holder_id: number; modalidade: 'temporaria' | 'perpetua'; inicio: string;
  termino: string | null; situacao: string; motivo_extincao?: 'renuncia' | 'abandono' | null; extinta_em?: string | null;
  pendencia_regularizacao: boolean; motivo_pendencia?: string | null;
  guias_count?: number; inadimplente?: boolean;
  jazigo?: Pick<Jazigo, 'id' | 'codigo' | 'estado' | 'park_id' | 'processo_administrativo'> & { cemiterio?: { nome: string }; setor?: { codigo: string } };
  concessionario?: Partial<Concessionario> & { id: number; nome: string };
}

export interface FiltrosConcessoesAvancados {
  setorId?: string | null;
  modalidade?: 'todas' | 'temporaria' | 'perpetua';
  situacao?: 'todas' | 'vigente' | 'expirada' | 'extinta';
  pendenciaRegularizacao?: boolean;
  financeiro?: 'todas' | 'adimplente' | 'inadimplente' | 'sem_guias';
  venceEm?: 'todas' | '30' | '60' | '90';
  busca: string;
}

export interface EventoAuditoria {
  id: number;
  user_id: number | null;
  action: string;
  resource: string;
  created_at: string;
}

export interface HerdeiroSucessao {
  id: number;
  process_id: number;
  nome: string;
  parentesco: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  titular_indicado: boolean;
}

export interface ProcessoSucessao {
  id: number;
  concession_id: number;
  numero_processo: string;
  tipo_documento: 'inventario_judicial' | 'inventario_extrajudicial' | 'alvara_judicial' | 'outro';
  vara_ou_cartorio: string | null;
  situacao: 'em_analise' | 'deferido' | 'indeferido' | 'cancelado';
  despacho_fundamentacao: string | null;
  novo_titular_id: number | null;
  termo_numero: string | null;
  deferido_em: string | null;
  deferido_por_id: number | null;
  created_at: string;
  concessao?: Concessao;
  herdeiros?: HerdeiroSucessao[];
  novo_titular?: Concessionario;
  deferido_por?: { id: number; name: string };
}

/* ------------------------------------------------------------------ */
/* Nova API de Sucessão Hereditária (RF-SUCESSAO)                       */
/* ------------------------------------------------------------------ */

export type ViaSucessao = 'inventario_judicial' | 'inventario_extrajudicial' | 'alvara_judicial' | 'arrolamento';

export type EstadoSucessao = 'solicitada' | 'em_analise' | 'aguardando_documentos' | 'validada' | 'sucedida' | 'indeferida' | 'arquivada';

export type TipoDocumentoSucessao = 'certidao_obito' | 'inventario' | 'formal_partilha' | 'escritura' | 'alvara' | 'procuracao' | 'outro';

export type Parentesco = 'companheiro' | 'filho' | 'pai' | 'mae' | 'irmao' | 'neto' | 'avo' | 'tio' | 'sobrinho' | 'outro' | 'representante';

export interface SucessaoHerdeiro {
  id: number;
  tenant_id: number;
  sucessao_id: number;
  nome: string;
  parentesco: Parentesco;
  documento: string | null;
  ordem: number;
  direito_representacao: boolean;
  titular_indicado: boolean;
  herdeiro_representado_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface SucessaoDocumento {
  id: number;
  tenant_id: number;
  sucessao_id: number;
  tipo: TipoDocumentoSucessao;
  arquivo: string;
  hash: string;
  created_at: string;
  updated_at: string;
}

export interface SucessaoHistorico {
  id: number;
  tenant_id: number;
  sucessao_id: number;
  de_estado: string;
  para_estado: string;
  motivo: Record<string, unknown> | null;
  usuario_id: number;
  created_at: string;
  updated_at: string;
  usuario?: { id: number; name: string };
}

export interface Sucessao {
  id: number;
  tenant_id: number;
  concession_id: number;
  park_id: number | null;
  plot_id: number | null;
  via: ViaSucessao;
  estado: EstadoSucessao;
  requerente_id: number | null;
  titular_falecido_id: number | null;
  data_falecimento: string | null;
  processo_referencia: string | null;
  parecer: string | null;
  lock_version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos (quando incluídos via with)
  concessao?: {
    id: number;
    numero: string;
    jazigo?: { id: number; codigo: string };
    concessionario?: { id: number; nome: string; documento: string };
  };
  herdeiros?: SucessaoHerdeiro[];
  documentos?: SucessaoDocumento[];
  historico?: SucessaoHistorico[];
  requerente?: { id: number; name: string };
  titularFalecido?: { id: number; nome: string; documento: string };
}

export interface SucessaoPaginado {
  data: Sucessao[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface DashboardPendentesResumo {
  em_analise: number;
  aguardando_documentos: number;
  validada: number;
  total: number;
}

export interface DashboardPendentesProcesso {
  id: number;
  processo_referencia: string | null;
  estado: EstadoSucessao;
  via: ViaSucessao;
  concessao: { id: number; numero: string } | null;
  jazigo: { id: number; codigo: string } | null;
  cemiterio: { id: number; nome: string } | null;
  titular_falecido: { id: number; nome: string } | null;
  data_falecimento: string | null;
  dias_em_analise: number;
  herdeiros_count: number;
  documentos_count: number;
  documentos_pendentes: TipoDocumentoSucessao[];
}

export interface DashboardPendentes {
  resumo: DashboardPendentesResumo;
  processos: DashboardPendentesProcesso[];
}

export interface DashboardRegularizacaoProcesso {
  id: number;
  processo_referencia: string | null;
  estado: EstadoSucessao;
  via: ViaSucessao;
  concessao: { id: number; numero: string } | null;
  jazigo: { id: number; codigo: string } | null;
  cemiterio: { id: number; nome: string } | null;
  titular_falecido: { id: number; nome: string } | null;
  data_falecimento: string | null;
  dias_desde_falecimento: number;
  dias_restantes_regularizacao: number;
  prazo_vencido: boolean;
  herdeiros_count: number;
  titular_indicado: { id: number; nome: string } | null;
}

export interface DashboardRegularizacao {
  total: number;
  processos: DashboardRegularizacaoProcesso[];
}

export interface AbrirSucessaoInput {
  concession_id: number;
  park_id?: number | null;
  plot_id?: number | null;
  via: ViaSucessao;
  requerente_id?: number | null;
  titular_falecido_id?: number | null;
  data_falecimento?: string | null;
  processo_referencia?: string | null;
}

export interface AtualizarSucessaoInput {
  park_id?: number | null;
  plot_id?: number | null;
  requerente_id?: number | null;
  titular_falecido_id?: number | null;
  data_falecimento?: string | null;
  processo_referencia?: string | null;
  parecer?: string | null;
  lock_version: number;
}

export interface TransicaoSucessaoInput {
  para: EstadoSucessao;
  motivo: string;
  lock_version: number;
}

export interface HerdeiroInput {
  nome: string;
  parentesco: Parentesco;
  documento?: string | null;
  ordem: number;
  direito_representacao?: boolean;
  titular_indicado?: boolean;
  herdeiro_representado_id?: number | null;
}

export interface HerdeirosSucessaoInput {
  herdeiros: HerdeiroInput[];
}

export interface DocumentoSucessaoInput {
  tipo: TipoDocumentoSucessao;
  arquivo: File;
}

export interface SucessaoFiltros {
  estado?: EstadoSucessao;
  via?: ViaSucessao;
  park_id?: number;
  concession_id?: number;
  data_falecimento_inicio?: string;
  data_falecimento_fim?: string;
  q?: string;
  per_page?: number;
  page?: number;
}

export interface TermoSucessaoDados {
  termo_numero: string;
  processo_numero: string;
  tipo_documento: string;
  vara_ou_cartorio: string | null;
  deferido_em: string | null;
  deferido_por: string | null;
  despacho_fundamentacao: string | null;
  titular_anterior: { nome?: string; documento?: string };
  novo_titular: { nome?: string; documento?: string; telefone?: string | null; endereco?: string | null };
  jazigo: { codigo?: string; tipo?: string; quadra?: string; necropole?: string };
  herdeiros: { nome: string; parentesco: string; documento: string | null; titular_indicado: boolean }[];
}

export type StatusCredenciamento = 'valido' | 'a_vencer' | 'vencido' | 'sem_credenciamento' | 'dispensado';
export type StatusSaudeOcupacional = 'valido' | 'a_vencer' | 'vencido' | 'nao_informado';

export interface OperadorCemiterio {
  id: number;
  nome: string;
  tipo: 'coveiro' | 'pedreiro';
  documento_mascarado: string;
  matricula_funcional: string | null;
  park_id: number | null;
  alvara_numero: string | null;
  alvara_validade: string | null;
  aso_validade: string | null;
  epi_ultimo_registro: string | null;
  telefone: string | null;
  email: string | null;
  situacao: 'ativo' | 'suspenso' | 'inativo';
  observacoes: string | null;
  status_alvara?: 'valido' | 'vencendo' | 'vencido' | 'dispensado' | 'sem_alvara';
  is_alvara_vencido?: boolean;
  is_alvara_vencendo?: boolean;
  status_credenciamento?: StatusCredenciamento;
  status_saude_ocupacional?: StatusSaudeOcupacional;
}

export interface OperadorLicenca {
  id: number;
  operator_id: number;
  numero: string;
  validade: string;
  arquivo: string | null;
  hash: string | null;
  created_at: string;
}

export interface OperadorPenalidade {
  id: number;
  operator_id: number;
  tipo: 'advertencia' | 'suspensao' | 'descredenciamento';
  inicio: string;
  fim: string | null;
  motivo: string;
  arquivo: string | null;
  created_at: string;
}

export interface HistoricoOperador {
  operador: {
    id: number;
    nome: string;
    tipo: 'coveiro' | 'pedreiro';
    matricula_funcional: string | null;
    alvara_numero: string | null;
    status_alvara: string;
  };
  total_operacoes: number;
  operacoes: Inumacao[];
  current_page: number;
  last_page: number;
}

export interface Preco { id: number; servico: string; valor_centavos: number; vigencia_inicio: string; vigencia_fim: string | null }
export interface Reajuste { id: number; competencia: number; percentual: number; origem: string; created_at: string }
export interface Guia {
  id: number;
  numero: string;
  contribuinte_nome: string;
  servico: string;
  exercicio: number | null;
  valor_centavos: number;
  vencimento: string;
  situacao: 'emitida' | 'paga' | 'cancelada';
  vencida: boolean;
  original_id: number | null;
  pago_em: string | null;
  valor_pago_centavos?: number | null;
  comprovante_arquivo?: string | null;
}

export interface FiltrosJazigosAvancados {
  parque?: string | number;
  setor?: string | number;
  estado?: string;
  tipo?: string;
  q?: string;
  sepultado?: string;
  concessao_status?: 'com_concessao' | 'sem_concessao' | 'vencida' | 'sucessao';
  financeiro_status?: 'adimplente' | 'inadimplente' | 'sem_guias';
  faixa_ocupacao?: 'vazio' | 'parcial' | 'lotado';
  georreferenciado?: 'com_gps' | 'sem_gps';
  per_page?: number;
  page?: number;
}
export interface Empreiteiro {
  id: number; nome: string; tipo_doc: string; documento_mascarado: string; responsavel_tecnico: string | null;
  situacao: 'apto' | 'inapto' | 'suspenso' | 'cancelado';
  alvaras?: { id: number; numero: string; validade: string }[];
  penalidades?: { id: number; tipo: string; inicio: string | null; fim: string | null; motivo: string }[];
  obras?: AlvaraObra[];
}
export interface AlvaraObra {
  id: number; contractor_id: number; plot_id: number; descricao: string; comprimento_m: number; largura_m: number;
  prazo_fim: string; situacao: string; sinalizada: boolean;
}
export interface Vistoria {
  id: number; plot_id: number; data: string; estado_conservacao: string; risco: string; observacoes: string | null;
  fotos: { id: number; capturada_em: string; url?: string; caminho?: string }[];
}
export interface ProcessoAbandono {
  id: number; plot_id: number; concession_id: number; situacao: string; instaurado_em: string; edital_publicado_em: string | null;
  prazo_dias_aplicado: number | null; prazo_fim: string | null; decisao: string | null; remocao_pendente: boolean;
  jazigo?: Pick<Jazigo, 'id' | 'codigo' | 'estado'>; concessao?: Pick<Concessao, 'id' | 'numero' | 'situacao'>;
}
export interface Parametros {
  prazo_exumacao_adulto_anos: number; prazo_exumacao_crianca_anos: number; idade_limite_crianca: number;
  distanciamento_min_m: number; tumulo_max_comprimento_m: number; tumulo_max_largura_m: number;
  edital_prazo_dias: number; obras_simultaneas_max: number; notificacao_antecedencia_dias: number;
  suspensoes_para_cancelamento: number; concessao_temporaria_anos: number; portal_habilitado: boolean;
  instrucoes_pagamento: string | null; chave_pix: string | null;
}
export interface FeatureCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; id: string; geometry: Polygon; properties: Record<string, unknown> }[];
}
export interface ResultadoBusca {
  tipo: string;
  rotulo: string;
  jazigo_id: number;
  jazigo_codigo: string;
  envelope: [number, number, number, number] | null;
}
export interface ProvedorMapaBase {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  atribuicao: string;
  max_zoom: number;
}
export interface MapaBase {
  provedor: string;
  url: string;
  atribuicao: string;
  max_zoom: number;
  catalogo?: ProvedorMapaBase[];
}

export interface Via {
  id: number;
  park_id: number;
  via_codigo: string;
  geojson: LineString;
}
export interface Amenidade {
  id: number;
  park_id: number;
  tipo: 'portaria' | 'capela' | 'sanitario' | 'administracao' | 'agua' | 'vegetacao';
  rotulo: string | null;
  lat: number;
  lng: number;
}
export interface ViasFeatureCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; id: string; geometry: LineString; properties: { id: number; via_codigo: string } }[];
}
export interface AmenidadesFeatureCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; id: string; geometry: Point; properties: { id: number; tipo: Amenidade['tipo']; rotulo: string | null } }[];
}
export interface TrechoRota {
  type: 'Feature';
  properties: { tipo: 'trecho' | 'acesso'; via_codigo: string | null; trecho_ordem: number };
  geometry: LineString;
}
export interface RotaResposta {
  encontrada: boolean;
  distancia_metros: number;
  rota: { type: 'FeatureCollection'; features: TrechoRota[] } | null;
}

/* ------------------------------------------------------------------ */
/* Formatação e regras de apresentação (puras — testadas no vitest)     */
/* ------------------------------------------------------------------ */

/** Centavos inteiros → "R$ 1.234,56" (sem float na conversão). */
export function formatarCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.trunc(centavos));
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${reais},${String(abs % 100).padStart(2, '0')}`;
}

/** "1.234,56" | "1234.56" → 123456; null se inválido ou com mais de 2 casas. */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpo)) return null;
  const [reais, cents = '0'] = limpo.split('.');
  return Number(reais) * 100 + Number(cents.padEnd(2, '0'));
}

/** "2026-09-22" | ISO → "22/09/2026". */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [data] = valor.split('T');
  const [a, m, d] = data.split('-');
  return d && m && a ? `${d}/${m}/${a}` : valor;
}

export interface ConsultaCepResultado {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/** Consulta dados de endereço via ViaCEP com tratamento de fallback */
export async function consultarCep(cep: string): Promise<ConsultaCepResultado | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ConsultaCepResultado;
    if (data.erro) return null;
    return data;
  } catch (e) {
    console.error('Falha ao consultar CEP:', e);
    return null;
  }
}

/** Cores do mapa por estado (spec gis › cores): verde, azul, vermelho, roxo, amarelo. */
export const ESTADOS: Record<EstadoJazigo, { rotulo: string; cor: string; chip: 'success' | 'info' | 'danger' | 'primary' | 'warning' }> = {
  disponivel: { rotulo: 'Disponível', cor: '#16a34a', chip: 'success' },
  concedido: { rotulo: 'Concedido', cor: '#2563eb', chip: 'info' },
  ocupado: { rotulo: 'Ocupado', cor: '#dc2626', chip: 'danger' },
  capacidade_maxima: { rotulo: 'Capacidade Máxima', cor: '#7c3aed', chip: 'primary' },
  manutencao: { rotulo: 'Em Ruína/Manutenção', cor: '#eab308', chip: 'warning' },
};

export interface ErroApi { status: number; mensagem: string; codigo?: string; campos?: Record<string, string[]>; extra?: Record<string, unknown> }

/** Normaliza erros 403/404/409/422 da API em mensagem legível (regras em 422 trazem `code`). */
export function erroApi(erro: unknown): ErroApi {
  if (axios.isAxiosError(erro) && erro.response) {
    const { status, data } = erro.response as { status: number; data: Record<string, unknown> };
    const padrao: Record<number, string> = {
      403: 'Você não tem permissão para esta ação.',
      404: 'Registro não encontrado.',
      409: 'O registro foi alterado por outra pessoa. Recarregue e tente novamente.',
      429: 'Muitas requisições. Aguarde um minuto.',
    };
    const { message, code, errors, ...extra } = data ?? {};
    return {
      status,
      mensagem: (typeof message === 'string' && message) || padrao[status] || 'Não foi possível concluir a operação.',
      codigo: typeof code === 'string' ? code : undefined,
      campos: errors as Record<string, string[]> | undefined,
      extra,
    };
  }
  return { status: 0, mensagem: 'Falha de comunicação com o servidor.' };
}

/** Monta FormData com objetos aninhados (falecido[nome]) e listas (fotos[]). */
export function paraFormData(dados: Record<string, unknown>, form = new FormData(), prefixo = ''): FormData {
  Object.entries(dados).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    const nome = prefixo ? `${prefixo}[${chave}]` : chave;
    if (valor instanceof Blob) form.append(nome, valor);
    else if (Array.isArray(valor)) valor.forEach((v) => (v instanceof Blob ? form.append(`${nome}[]`, v) : form.append(`${nome}[]`, String(v))));
    else if (typeof valor === 'object') paraFormData(valor as Record<string, unknown>, form, nome);
    else form.append(nome, typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor));
  });
  return form;
}

/** Salva um PDF/arquivo binário devolvido pela API. */
function baixar(dados: Blob, nome: string): void {
  const url = URL.createObjectURL(dados);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Painel do órgão — api/cemiterios                                     */
/* ------------------------------------------------------------------ */

const base = '/cemiterios';
const get = async <T,>(url: string, params?: Record<string, unknown>) => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown) =>
  (await apiClient.post<T>(`${base}${url}`, body, body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)).data;
const put = async <T,>(url: string, body?: unknown) => (await apiClient.put<T>(`${base}${url}`, body)).data;
const pdf = async (url: string, nome: string) => baixar((await apiClient.get(`${base}${url}`, { responseType: 'blob' })).data, nome);

export const cemiteriosApi = {
  // Parâmetros
  parametros: () => get<{ vigente: Parametros; historico: (Parametros & { vigencia_inicio: string })[] }>('/parametros'),
  salvarParametros: (dados: Partial<Parametros>) => post<Parametros>('/parametros', dados),

  // Inventário
  parques: () => get<Parque[]>('/parques'),
  parque: (id: number) => get<Parque>(`/parques/${id}`),
  criarParque: (dados: Partial<Parque>) => post<Parque>('/parques', dados),
  atualizarParque: (id: number, dados: Partial<Parque>) => put<Parque>(`/parques/${id}`, dados),
  criarSetor: (parque: number, dados: Partial<Setor>) => post<Setor>(`/parques/${parque}/setores`, dados),
  jazigos: (filtros: Record<string, unknown> = {}) => get<Paginado<Jazigo>>('/jazigos', filtros),
  jazigo: (id: number) => get<Jazigo>(`/jazigos/${id}`),
  criarJazigo: (dados: Partial<Jazigo>) => post<Jazigo>('/jazigos', dados),
  atualizarJazigo: (id: number, dados: Partial<Jazigo>) => put<Jazigo>(`/jazigos/${id}`, dados),
  alterarEstado: (id: number, para: 'manutencao' | 'restaurar', motivo: string, lockVersion: number) =>
    post<Jazigo>(`/jazigos/${id}/estado`, { para, motivo, lock_version: lockVersion }),
  historicoJazigo: (id: number) => get<EventoHistorico[]>(`/jazigos/${id}/historico`),

  // GIS
  camada: (camada: 'parques' | 'setores' | 'jazigos', bbox: [number, number, number, number], zoom?: number) =>
    get<FeatureCollection>('/gis/camadas', { camada, bbox: bbox.map((n) => n.toFixed(7)).join(','), zoom }),
  camadaVias: (parkId: number, bbox: [number, number, number, number]) =>
    get<ViasFeatureCollection>('/gis/camadas', { camada: 'vias', park_id: parkId, bbox: bbox.map((n) => n.toFixed(7)).join(',') }),
  camadaAmenidades: (parkId: number, bbox: [number, number, number, number]) =>
    get<AmenidadesFeatureCollection>('/gis/camadas', { camada: 'amenidades', park_id: parkId, bbox: bbox.map((n) => n.toFixed(7)).join(',') }),
  rota: (parkId: number, origem: { lat: number; lng: number }, destino: { lat: number; lng: number }) =>
    get<RotaResposta>('/gis/rotas', { park_id: parkId, origem_lat: origem.lat, origem_lng: origem.lng, destino_lat: destino.lat, destino_lng: destino.lng }),
  criarVia: (dados: { park_id: number; via_codigo: string; geojson: LineString }) => post<Via>('/gis/vias', dados),
  atualizarVia: (id: number, dados: { park_id: number; via_codigo: string; geojson: LineString }) => put<Via>(`/gis/vias/${id}`, dados),
  excluirVia: (id: number) => apiClient.delete(`${base}/gis/vias/${id}`),
  criarAmenidade: (dados: { park_id: number; tipo: Amenidade['tipo']; rotulo?: string; lat: number; lng: number }) => post<Amenidade>('/gis/amenidades', dados),
  atualizarAmenidade: (id: number, dados: { park_id: number; tipo: Amenidade['tipo']; rotulo?: string; lat: number; lng: number }) => put<Amenidade>(`/gis/amenidades/${id}`, dados),
  excluirAmenidade: (id: number) => apiClient.delete(`${base}/gis/amenidades/${id}`),
  salvarGeometria: (tipo: 'parque' | 'setor' | 'jazigo', id: number, geojson: Polygon) => put(`/gis/geometrias/${tipo}/${id}`, { geojson }),
  gerarGrade: (setor: number, dados: Record<string, unknown>) =>
    post<{ criados: number; descartados: { linha: number; coluna: number; motivo: string }[]; duplicados: string[] }>(`/gis/setores/${setor}/gerar-grade`, dados),
  mapaBase: () => get<MapaBase>('/gis/mapa-base/sessao'),
  buscar: (q: string) => get<ResultadoBusca[]>('/busca', { q }),
  exportarGis: async (parkId: number, formato: 'geojson' | 'kml') => {
    const res = await apiClient.get<unknown>('/api/cemiterios/gis/exportar', {
      params: { park_id: parkId, formato },
      responseType: formato === 'kml' ? 'text' : 'json',
    });
    return res.data;
  },

  // Operações
  falecidos: (q?: string) => get<Paginado<Falecido>>('/falecidos', { q }),
  atualizarFalecido: (id: number, dados: Partial<Falecido>) => put<Falecido>(`/falecidos/${id}`, dados),
  dadosRestritos: (id: number) => get<{ causa_morte: string | null; docs_medicos: string[] | null }>(`/falecidos/${id}/dados-restritos`),
  inumacoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Inumacao>>('/inumacoes', filtros),
  inumar: (dados: Record<string, unknown>) => post<Inumacao>('/inumacoes', paraFormData(dados)),
  inumarHistorica: (dados: Record<string, unknown>) => post<Inumacao>('/inumacoes/historicas', paraFormData(dados)),
  atualizarInumacao: (id: number, dados: Record<string, unknown>) => put<Inumacao>(`/inumacoes/${id}`, dados),
  revisar: (id: number) => post<Inumacao>(`/inumacoes/${id}/revisar`),
  cancelarInumacao: (id: number) => post<Inumacao>(`/inumacoes/${id}/cancelar`),
  exumacoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Exumacao>>('/exumacoes', filtros),
  exumar: (dados: Record<string, unknown>) => post<Exumacao>('/exumacoes', paraFormData(dados)),
  trasladacoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Trasladacao>>('/trasladacoes', filtros),
  trasladar: (dados: Record<string, unknown>) => post('/trasladacoes', dados),
  ordens: (filtros: Record<string, unknown> = {}) => get<Paginado<OrdemServico>>('/ordens-servico', filtros),
  ordem: (id: number) => get<OrdemServico>(`/ordens-servico/${id}`),
  transicaoOrdem: (id: number, acao: 'iniciar' | 'concluir' | 'suspender' | 'cancelar', motivo?: string) =>
    post<OrdemServico>(`/ordens-servico/${id}/${acao}`, motivo ? { motivo } : {}),
  pdfOrdem: (o: Pick<OrdemServico, 'id' | 'numero' | 'ano'>) => pdf(`/ordens-servico/${o.id}/pdf`, `os-${o.numero}-${o.ano}.pdf`),

  // Concessões
  titulares: (params?: string | Record<string, unknown>) =>
    get<Paginado<Concessionario>>('/concessionarios', typeof params === 'string' ? { q: params } : (params ?? {})),
  titular: (id: number) => get<Concessionario & { documento: string }>(`/concessionarios/${id}`),
  criarTitular: (dados: Partial<Concessionario> & { documento: string }) => post<Concessionario>('/concessionarios', dados),
  atualizarConcessionario: (id: number, dados: Partial<Concessionario>) => put<Concessionario>(`/concessionarios/${id}`, dados),
  concessoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Concessao>>('/concessoes', filtros),
  concessao: (id: number) => get<Concessao>(`/concessoes/${id}`),
  conceder: (dados: { plot_id: number; holder_id: number; modalidade: string; lock_version: number; inicio?: string; processo_administrativo?: string }) => post<Concessao>('/concessoes', dados),
  renovar: (id: number) => post<{ concessao: Concessao; guia: Guia }>(`/concessoes/${id}/renovar`),
  renunciarConcessao: (id: number, dados: { motivo: string; processo_administrativo?: string }) => post<Concessao>(`/concessoes/${id}/renunciar`, dados),
  historicoConcessao: (id: number) => get<Paginado<EventoAuditoria>>(`/concessoes/${id}/historico`),

  // Sucessão Hereditária (Nova API RF-SUCESSAO)
  sucessoes: (filtros: SucessaoFiltros = {}) => get<SucessaoPaginado>('/sucessoes', filtros as Record<string, unknown>),
  sucessao: (id: number) => get<Sucessao>(`/sucessoes/${id}`),
  criarSucessao: (dados: AbrirSucessaoInput) => post<Sucessao>('/sucessoes', dados),
  atualizarSucessao: (id: number, dados: AtualizarSucessaoInput) => put<Sucessao>(`/sucessoes/${id}`, dados),
  excluirSucessao: (id: number) => apiClient.delete(`${base}/sucessoes/${id}`),
  transicionarSucessao: (id: number, dados: TransicaoSucessaoInput) => post<Sucessao>(`/sucessoes/${id}/transicao`, dados),
  adicionarHerdeiros: (id: number, dados: HerdeirosSucessaoInput) => post<SucessaoHerdeiro[]>(`/sucessoes/${id}/herdeiros`, dados),
  removerHerdeiro: (id: number, herdeiroId: number) => apiClient.delete(`${base}/sucessoes/${id}/herdeiros/${herdeiroId}`),
  uploadDocumento: (id: number, tipo: TipoDocumentoSucessao, arquivo: File) => {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('arquivo', arquivo);
    return post<SucessaoDocumento>(`/sucessoes/${id}/documentos`, form);
  },
  documento: (id: number, documentoId: number) => get<SucessaoDocumento>(`/sucessoes/${id}/documentos/${documentoId}`),
  downloadDocumento: (id: number, documentoId: number) => get<{ download_url: string; expires_at: string }>(`/sucessoes/${id}/documentos/${documentoId}/download`),
  excluirDocumento: (id: number, documentoId: number) => apiClient.delete(`${base}/sucessoes/${id}/documentos/${documentoId}`),
  historico: (id: number) => get<SucessaoHistorico[]>(`/sucessoes/${id}/historico`),
  pendentes: (parkId?: number) => get<DashboardPendentes>(`/sucessoes/pendentes`, parkId ? { park_id: parkId } : {}),
  regularizacao: (parkId?: number) => get<DashboardRegularizacao>(`/sucessoes/regularizacao`, parkId ? { park_id: parkId } : {}),

  // Legado — compatibilidade
  sucessoesLegado: (filtros: Record<string, unknown> = {}) => get<Paginado<ProcessoSucessao>>('/sucessoes', filtros),
  sucessoesPendencias: (filtros: Record<string, unknown> = {}) => get<Paginado<Concessao>>('/sucessoes/pendencias', filtros),
  sucessaoLegado: (id: number) => get<ProcessoSucessao>(`/sucessoes/${id}`),
  abrirSucessao: (dados: { concession_id: number; numero_processo: string; tipo_documento: string; vara_ou_cartorio?: string }) => post<ProcessoSucessao>('/sucessoes', dados),
  adicionarHerdeiro: (id: number, dados: { nome: string; parentesco: string; documento?: string; telefone?: string; email?: string; titular_indicado?: boolean }) => post<HerdeiroSucessao>(`/sucessoes/${id}/herdeiros`, dados),
  deferirSucessao: (id: number, dados: { despacho_fundamentacao: string; herdeiro_id?: number; novo_titular_id?: number }) => post<ProcessoSucessao>(`/sucessoes/${id}/deferir`, dados),
  indeferirSucessao: (id: number, despacho_fundamentacao: string) => post<ProcessoSucessao>(`/sucessoes/${id}/indeferir`, { despacho_fundamentacao }),
  termoSucessao: (id: number) => get<TermoSucessaoDados>(`/sucessoes/${id}/termo`),

  // Operadores (Coveiros e Pedreiros)
  operadores: (filtros: Record<string, unknown> = {}) =>
    get<
      Paginado<OperadorCemiterio> & {
        stats: {
          total_coveiros: number; total_pedreiros: number; alvaras_vencendo: number; alvaras_vencidos: number;
          aso_vencendo: number; aso_vencido: number;
        };
      }
    >('/operadores', filtros),
  operador: (id: number) => get<OperadorCemiterio>(`/operadores/${id}`),
  criarOperador: (dados: Partial<OperadorCemiterio> & { cpf_cnpj?: string | null }) => post<OperadorCemiterio>('/operadores', dados),
  atualizarOperador: (id: number, dados: Partial<OperadorCemiterio> & { cpf_cnpj?: string | null }) => put<OperadorCemiterio>(`/operadores/${id}`, dados),
  historicoOperador: (id: number) => get<HistoricoOperador>(`/operadores/${id}/historico`),
  licencasOperador: (id: number) => get<OperadorLicenca[]>(`/operadores/${id}/licencas`),
  credenciarOperador: (id: number, dados: { numero: string; validade: string }, arquivo?: File | null) =>
    post<OperadorLicenca>(`/operadores/${id}/licencas`, paraFormData({ ...dados, arquivo: arquivo ?? undefined })),
  penalidadesOperador: (id: number) => get<OperadorPenalidade[]>(`/operadores/${id}/penalidades`),
  sancionarOperador: (
    id: number,
    dados: { tipo: 'advertencia' | 'suspensao' | 'descredenciamento'; inicio: string; fim?: string | null; motivo: string },
    arquivo?: File | null,
  ) => post<OperadorPenalidade>(`/operadores/${id}/penalidades`, paraFormData({ ...dados, arquivo: arquivo ?? undefined })),


  // Financeiro
  precos: () => get<{ vigentes: Record<string, Preco | null>; historico: Preco[] }>('/precos'),
  novoPreco: (dados: { servico: string; valor: string; vigencia_inicio: string }) => post<Preco>('/precos', dados),
  reajustes: () => get<Reajuste[]>('/precos/reajustes'),
  reajusteManual: (competencia: number, percentual: string) => post<Reajuste>('/precos/reajustes', { competencia, percentual }),
  guias: (filtros: Record<string, unknown> = {}) => get<Paginado<Guia>>('/guias', filtros),
  loteAnual: (exercicio: number) =>
    post<{ exercicio: number; geradas: number; existentes: number; falhas: { concessao: string; erro: string }[] }>('/guias/lote-anual', { exercicio }),
  pdfGuia: (g: Pick<Guia, 'id' | 'numero'>) => pdf(`/guias/${g.id}/pdf`, `guia-${g.numero.replace('/', '-')}.pdf`),
  segundaVia: (id: number, vencimento?: string) => post<Guia>(`/guias/${id}/segunda-via`, vencimento ? { vencimento } : {}),
  baixa: (id: number, dados: { pago_em: string; valor_pago: string; comprovante: File }) => post<Guia>(`/guias/${id}/baixa`, paraFormData(dados)),
  inadimplencia: (filtros: Record<string, unknown> = {}) => get<{ total_centavos: number; quantidade: number; guias: Guia[] }>('/relatorios/inadimplencia', filtros),

  // Empreiteiros
  empreiteiros: () => get<Paginado<Empreiteiro>>('/empreiteiros'),
  empreiteiro: (id: number) => get<Empreiteiro>(`/empreiteiros/${id}`),
  criarEmpreiteiro: (dados: { nome: string; documento: string; responsavel_tecnico?: string }) => post<Empreiteiro>('/empreiteiros', dados),
  alvaraAnual: (id: number, dados: { numero: string; validade: string }) => post<Empreiteiro>(`/empreiteiros/${id}/alvaras`, dados),
  penalidade: (id: number, dados: Record<string, unknown>) => post<Empreiteiro>(`/empreiteiros/${id}/penalidades`, dados),
  obras: (filtros: Record<string, unknown> = {}) => get<Paginado<AlvaraObra>>('/alvaras-obra', filtros),
  criarObra: (dados: Record<string, unknown>) => post<AlvaraObra>('/alvaras-obra', dados),
  encerrarObra: (id: number, situacao: 'concluida' | 'cancelada') => put<AlvaraObra>(`/alvaras-obra/${id}`, { situacao }),

  // Vistoria e abandono
  vistorias: (filtros: Record<string, unknown> | number = {}) =>
    get<Paginado<Vistoria>>('/vistorias', typeof filtros === 'number' ? { plot_id: filtros } : filtros),
  registrarVistoria: (dados: Record<string, unknown>) => post<Vistoria>('/vistorias', paraFormData(dados)),
  processos: (filtros: Record<string, unknown> = {}) => get<Paginado<ProcessoAbandono>>('/processos-abandono', filtros),
  instaurar: (plotId: number) => post<ProcessoAbandono>('/processos-abandono', { plot_id: plotId }),
  etapaProcesso: (id: number, etapa: 'edital' | 'manifestacao' | 'decisao', dados: Record<string, unknown>) =>
    post<ProcessoAbandono>(`/processos-abandono/${id}/${etapa}`, dados),
};

/* ------------------------------------------------------------------ */
/* Portal público e do concessionário — fora do shell autenticado       */
/* ------------------------------------------------------------------ */

const TOKEN_PORTAL = 'sysgov_portal_cemiterios_token';
const publico = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', headers: { Accept: 'application/json' }, timeout: 15000 });

export interface IdentidadeMunicipio { nome: string; customPrimaryColor: string | null; customLogoUrl: string | null; portalTitle: string | null; portalSubtitle: string | null; hideProviderSignature: boolean }
export interface ResultadoPublico { nome: string; nascimento: string | null; falecimento: string; cemiterio: string | null; cemiterio_codigo: string | null; setor: string | null; jazigo: string | null }
export interface MapaPublico {
  jazigo: { codigo: string; setor: string | null; centro: [number | null, number | null]; geometria: Polygon | null };
  cemiterio: { nome: string; endereco: string | null; centro: [number | null, number | null]; geometria: Polygon | null };
  como_chegar: string | null;
  mapa_base: MapaBase;
}

export const portalPublicoApi = (slug: string) => {
  const url = (p: string) => `/public/cemiterios/${encodeURIComponent(slug)}${p}`;
  return {
    identidade: async () => (await publico.get<IdentidadeMunicipio>(url('/identidade'))).data,
    buscar: async (q: string, pagina = 1, ano?: number) =>
      (await publico.get<{ data: ResultadoPublico[]; meta: { pagina: number; ultima_pagina: number; total: number } }>(url('/falecidos'), { params: { q, page: pagina, ano } })).data,
    mapa: async (codigo: string, cemiterio?: string | null) =>
      (await publico.get<MapaPublico>(url(`/jazigos/${encodeURIComponent(codigo)}/mapa`), { params: { cemiterio } })).data,
  };
};

export const tokenPortal = {
  ler: () => sessionStorage.getItem(TOKEN_PORTAL),
  salvar: (t: string) => sessionStorage.setItem(TOKEN_PORTAL, t),
  limpar: () => sessionStorage.removeItem(TOKEN_PORTAL),
};

export const portalConcessionarioApi = (slug: string) => {
  const url = (p: string) => `/portal/cemiterios/${encodeURIComponent(slug)}${p}`;
  const auth = () => ({ headers: { Authorization: `Bearer ${tokenPortal.ler() ?? ''}` } });
  return {
    iniciarGovBr: async () => (await publico.get<{ url: string }>(url('/auth/govbr'))).data,
    callbackGovBr: async (code: string, state: string) => (await publico.post<{ token: string; nome: string }>(url('/auth/govbr/callback'), { code, state })).data,
    me: async () => (await publico.get<Concessionario & { documento: string }>(url('/me'), auth())).data,
    concessoes: async () => (await publico.get<(Concessao & { jazigo: { codigo: string; cemiterio?: { nome: string } } })[]>(url('/concessoes'), auth())).data,
    guias: async () => (await publico.get<Guia[]>(url('/guias'), auth())).data,
    pdfGuia: async (g: Pick<Guia, 'id' | 'numero'>) =>
      baixar((await publico.get(url(`/guias/${g.id}/pdf`), { ...auth(), responseType: 'blob' })).data, `guia-${g.numero.replace('/', '-')}.pdf`),
    segundaVia: async (id: number) => (await publico.post<Guia>(url(`/guias/${id}/segunda-via`), {}, auth())).data,
    sepultados: async () =>
      (await publico.get<{ id: number; sepultado_em: string; falecido: Falecido; jazigo: { codigo: string } }[]>(url('/sepultados'), auth())).data,
    solicitar: async (dados: { tipo: 'renovacao' | 'correcao_dados'; concession_id?: number; mensagem: string }) =>
      (await publico.post(url('/solicitacoes'), dados, auth())).data,
    sair: async () => {
      await publico.post(url('/logout'), {}, auth()).catch(() => undefined);
      tokenPortal.limpar();
    },
  };
};
