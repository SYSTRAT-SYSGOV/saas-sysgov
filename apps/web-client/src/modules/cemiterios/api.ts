import axios from 'axios';
import type { Polygon } from 'geojson';
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
  responsavel: string | null; lat: number | null; lng: number | null; setores?: Setor[]; setores_count?: number; jazigos_count?: number;
}
export interface Jazigo {
  id: number; park_id: number; sector_id: number; codigo: string; tipo: string; capacidade: number; ocupacao: number;
  estado: EstadoJazigo; comprimento_m: number | null; largura_m: number | null; lat: number | null; lng: number | null; lock_version: number;
  setor?: Setor; cemiterio?: Parque;
}
export interface EventoHistorico { data: string; tipo: string; descricao: string }
export interface Falecido { id: number; nome: string; nascimento: string | null; falecimento: string; idade_obito: number | null; certidao_numero: string | null }
export interface OrdemServico {
  id: number; ano: number; numero: number; tipo: string; plot_id: number | null; agendada_para: string | null; equipe: string | null;
  situacao: string; observacao: string | null; executada_em: string | null; jazigo?: Pick<Jazigo, 'id' | 'codigo'> | null; falecido?: string | null;
}
export interface Inumacao {
  id: number; deceased_id: number; plot_id: number; sepultado_em: string; situacao: string; origem: string; revisao_pendente: boolean;
  livro_referencia: string | null; carencia_desde: string; service_order_id: number | null;
  falecido?: Falecido; jazigo?: Pick<Jazigo, 'id' | 'codigo'>; ordem_servico?: OrdemServico | null;
}
export interface Exumacao {
  id: number; burial_id: number; tipo: string; situacao: string; prazo_aplicado_anos: number | null; liberada_em: string | null;
  motivo_suspensao: string | null; inumacao?: Inumacao; ordem_servico?: OrdemServico | null;
}
export interface Concessionario {
  id: number; nome: string; tipo_doc: 'cpf' | 'cnpj'; documento_mascarado: string; documento?: string;
  email: string | null; telefone: string | null; endereco: string | null; base_legal: string;
}
export interface Concessao {
  id: number; numero: string; plot_id: number; holder_id: number; modalidade: 'temporaria' | 'perpetua'; inicio: string;
  termino: string | null; situacao: string; pendencia_regularizacao: boolean; jazigo?: Pick<Jazigo, 'id' | 'codigo' | 'estado'>;
  concessionario?: Pick<Concessionario, 'id' | 'nome'>;
}
export interface Preco { id: number; servico: string; valor_centavos: number; vigencia_inicio: string; vigencia_fim: string | null }
export interface Reajuste { id: number; competencia: number; percentual: number; origem: string; created_at: string }
export interface Guia {
  id: number; numero: string; contribuinte_nome: string; servico: string; exercicio: number | null; valor_centavos: number;
  vencimento: string; situacao: 'emitida' | 'paga' | 'cancelada'; vencida: boolean; original_id: number | null; pago_em: string | null;
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
  fotos: { id: number; capturada_em: string }[];
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
export interface ResultadoBusca { tipo: string; rotulo: string; jazigo_id: number; jazigo_codigo: string; envelope: [number, number, number, number] | null }
export interface MapaBase { provedor: string; url: string; atribuicao: string; max_zoom: number }

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
  alterarEstado: (id: number, para: 'manutencao' | 'restaurar', motivo: string, lockVersion: number) =>
    post<Jazigo>(`/jazigos/${id}/estado`, { para, motivo, lock_version: lockVersion }),
  historico: (id: number) => get<EventoHistorico[]>(`/jazigos/${id}/historico`),

  // GIS
  camada: (camada: 'parques' | 'setores' | 'jazigos', bbox: [number, number, number, number]) =>
    get<FeatureCollection>('/gis/camadas', { camada, bbox: bbox.map((n) => n.toFixed(7)).join(',') }),
  salvarGeometria: (tipo: 'parque' | 'setor' | 'jazigo', id: number, geojson: Polygon) => put(`/gis/geometrias/${tipo}/${id}`, { geojson }),
  gerarGrade: (setor: number, dados: Record<string, unknown>) =>
    post<{ criados: number; descartados: { linha: number; coluna: number; motivo: string }[]; duplicados: string[] }>(`/gis/setores/${setor}/gerar-grade`, dados),
  mapaBase: () => get<MapaBase>('/gis/mapa-base/sessao'),
  buscar: (q: string) => get<ResultadoBusca[]>('/busca', { q }),

  // Operações
  falecidos: (q?: string) => get<Paginado<Falecido>>('/falecidos', { q }),
  dadosRestritos: (id: number) => get<{ causa_morte: string | null; docs_medicos: string[] | null }>(`/falecidos/${id}/dados-restritos`),
  inumacoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Inumacao>>('/inumacoes', filtros),
  inumar: (dados: Record<string, unknown>) => post<Inumacao>('/inumacoes', paraFormData(dados)),
  inumarHistorica: (dados: Record<string, unknown>) => post<Inumacao>('/inumacoes/historicas', paraFormData(dados)),
  revisar: (id: number) => post<Inumacao>(`/inumacoes/${id}/revisar`),
  cancelarInumacao: (id: number) => post<Inumacao>(`/inumacoes/${id}/cancelar`),
  exumacoes: () => get<Paginado<Exumacao>>('/exumacoes'),
  exumar: (dados: Record<string, unknown>) => post<Exumacao>('/exumacoes', paraFormData(dados)),
  trasladar: (dados: Record<string, unknown>) => post('/trasladacoes', dados),
  ordens: (filtros: Record<string, unknown> = {}) => get<Paginado<OrdemServico>>('/ordens-servico', filtros),
  transicaoOrdem: (id: number, acao: 'iniciar' | 'concluir' | 'suspender' | 'cancelar', motivo?: string) =>
    post<OrdemServico>(`/ordens-servico/${id}/${acao}`, motivo ? { motivo } : {}),
  pdfOrdem: (o: Pick<OrdemServico, 'id' | 'numero' | 'ano'>) => pdf(`/ordens-servico/${o.id}/pdf`, `os-${o.numero}-${o.ano}.pdf`),

  // Concessões
  titulares: (q?: string) => get<Paginado<Concessionario>>('/concessionarios', { q }),
  criarTitular: (dados: Partial<Concessionario> & { documento: string }) => post<Concessionario>('/concessionarios', dados),
  concessoes: (filtros: Record<string, unknown> = {}) => get<Paginado<Concessao>>('/concessoes', filtros),
  conceder: (dados: { plot_id: number; holder_id: number; modalidade: string; lock_version: number; inicio?: string }) => post<Concessao>('/concessoes', dados),
  renovar: (id: number) => post<{ concessao: Concessao; guia: Guia }>(`/concessoes/${id}/renovar`),

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
  vistorias: (plotId?: number) => get<Paginado<Vistoria>>('/vistorias', { plot_id: plotId }),
  registrarVistoria: (dados: Record<string, unknown>) => post<Vistoria>('/vistorias', paraFormData(dados)),
  processos: () => get<Paginado<ProcessoAbandono>>('/processos-abandono'),
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
