import { apiClient } from '@/core/api/client';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/inservivel (valores em centavos)       */
/* ------------------------------------------------------------------ */

export type PapelSituacao = 'inservivel' | 'em_avaliacao' | 'em_lote' | 'doado' | 'baixado' | 'disponivel' | 'em_transferencia';
export type StatusLote = 'aberto' | 'publicado' | 'sorteado' | 'entregue' | 'baixado';
export type StatusEntidade = 'pendente' | 'em_analise' | 'habilitada' | 'reprovada' | 'desabilitada';
export type StatusTransferencia = 'anunciado' | 'solicitado' | 'aceito' | 'recusado' | 'cancelado';
export type SituacaoDocumento = 'pendente' | 'aprovado' | 'reprovado';
export type TipoParametro = 'categorias' | 'situacoes' | 'estados-conservacao';
export type TipoTermo = 'conferencia' | 'entrega' | 'doacao';
export type RegraSorteio = 'unica_inscrita' | 'menos_lotes' | 'sorteio_semente';

export interface Paginado<T> { data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }
export interface Ref { id: number; nome: string }
export interface UnidadeRef { id: number; nome: string; sigla: string | null }
export interface SituacaoRef extends Ref { papel: PapelSituacao | null }

export interface Unidade { id: number; parent_id: number | null; nome: string; sigla: string | null; tipo: string; path: string; secretaria: boolean }
export interface Opcoes { categorias: Ref[]; estados_conservacao: Ref[]; situacoes: SituacaoRef[]; unidades: Unidade[] }

export interface BemResumo {
  id: number;
  numero_patrimonial: string;
  plaqueta_antiga: string | null;
  descricao: string;
  marca: string | null;
  modelo: string | null;
  situacao: SituacaoRef;
  estado_conservacao: Ref | null;
  categoria: Ref | null;
  secretaria: UnidadeRef | null;
  setor: UnidadeRef | null;
  valor_contabil_cents: number;
  valor_avaliado_cents: number;
  valor_referencia_cents: number;
  foto_principal_id: number | null;
  created_at: string | null;
}
export interface FotoBem { id: number; principal: boolean; mime: string }
export interface Bem extends BemResumo {
  numero_serie: string | null;
  data_aquisicao: string | null;
  data_incorporacao: string | null;
  observacoes: string | null;
  fotos: FotoBem[];
  lotes: { id: number; numero: string; status: StatusLote; status_rotulo: string }[];
}
export interface DadosBem {
  numero_patrimonial: string;
  plaqueta_antiga: string | null;
  descricao: string;
  categoria_id: number | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  situacao_id: number;
  estado_conservacao_id: number | null;
  valor_contabil_cents: number;
  valor_avaliado_cents: number;
  data_aquisicao: string | null;
  data_incorporacao: string | null;
  secretaria_unit_id: number;
  setor_unit_id: number | null;
  observacoes: string | null;
}
export interface FiltrosBens { q?: string; situacao_id?: number; papel?: PapelSituacao; estado_conservacao_id?: number; secretaria_unit_id?: number; setor_unit_id?: number; page?: number; per_page?: number }

export interface LoteCard {
  id: number;
  numero: string;
  descricao: string;
  data_criacao: string | null;
  data_sorteio_prevista: string | null;
  responsavel: string;
  status: StatusLote;
  status_rotulo: string;
  valor_cents: number;
  bens_count: number;
  criado_por: number | null;
  created_at: string | null;
}
export interface BloqueioDocumento { tipo: string; nome: string; validade: string }
export interface Inscricao {
  entidade_id: number;
  razao_social: string;
  cnpj: string;
  status: StatusEntidade;
  status_rotulo: string;
  lotes_ganhos: number;
  inscrita_em: string | null;
  bloqueios: BloqueioDocumento[];
}
export interface ParticipanteSorteio {
  entidade_id: number;
  razao_social: string;
  cnpj: string;
  lotes_ganhos: number;
  apta: boolean;
  motivo_exclusao: 'nao_habilitada' | 'documento_vencido' | null;
  documentos_vencidos: string[];
}
export interface SorteioLote {
  id: number;
  data: string;
  regra: RegraSorteio;
  semente: string | null;
  hash: string;
  participantes: ParticipanteSorteio[];
  vencedora: { id: number; razao_social: string; cnpj: string };
}
export interface DocumentoLote { id: number; nome: string; mime: string; gerado_pelo_sistema: boolean; created_at: string | null }
export interface Lote extends LoteCard {
  observacoes: string | null;
  proximos_status: { valor: StatusLote; rotulo: string }[];
  bens: BemResumo[];
  documentos: DocumentoLote[];
  inscricoes: Inscricao[];
  sorteio: SorteioLote | null;
  permissoes: { editar: boolean; gerir: boolean };
}
export interface DadosLote { numero: string; descricao: string; data_criacao: string; responsavel: string; data_sorteio_prevista: string | null; observacoes: string | null }

export interface DocumentoExigido { chave: string; nome: string; obrigatorio: boolean }
export interface EntidadeResumo {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  representante_legal: string;
  cidade: string;
  uf: string;
  status: StatusEntidade;
  status_rotulo: string;
  lotes_ganhos: number;
  created_at: string | null;
  bloqueada_por_documento?: boolean;
}
export interface DocumentoEntidade {
  id: number;
  tipo: string;
  nome: string;
  mime: string;
  data_envio: string;
  validade: string | null;
  situacao: SituacaoDocumento;
  observacao_prefeitura: string | null;
}
export interface AlertaDocumento { tipo: string; nome: string; validade: string; vencido: boolean }
export interface CamposEntidade {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  celular: string;
  representante_legal: string;
  rg_representante: string | null;
  cargo_representante: string;
  tempo_funcionamento_anos: number;
  area_atuacao: string;
  finalidade: string;
  numero_beneficiarios: number;
  certificacoes: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  chave_pix: string | null;
}
export interface Entidade extends EntidadeResumo, CamposEntidade {
  motivo_reprovacao: string | null;
  cpf_representante_mascarado: string;
  documentos_exigidos: DocumentoExigido[];
  documentos: DocumentoEntidade[];
  bloqueios: BloqueioDocumento[];
  alertas_documentos: AlertaDocumento[];
  lotes?: { lote_id: number; numero: string; status: StatusLote; status_rotulo: string; inscrita_em: string | null; vencedora: boolean }[];
  mensagem_status?: string | null;
}
export type DadosEntidade = CamposEntidade & { cpf_representante: string; email: string };

export interface Transferencia {
  id: number;
  status: StatusTransferencia;
  status_rotulo: string;
  bem: BemResumo;
  origem: UnidadeRef | null;
  destino: UnidadeRef | null;
  observacao: string | null;
  motivo_recusa: string | null;
  anunciado_por: string | null;
  solicitado_por: string | null;
  decidido_por: string | null;
  data_anuncio: string | null;
  data_solicitacao: string | null;
  data_conclusao: string | null;
  pode_solicitar: boolean;
  pode_cancelar: boolean;
  pode_decidir: boolean;
}
export interface ListaTransferencias { minha_secretaria: UnidadeRef | null; gestor: boolean; transferencias: Transferencia[] }

export interface Dashboard {
  indicadores: { bens: number; bens_em_avaliacao: number; bens_inserviveis: number; lotes_ativos: number; entidades: number; entidades_aguardando: number; alertas_documentos: number };
  ultimos_bens: BemResumo[];
  entidades_aguardando: { id: number; razao_social: string; status: StatusEntidade; status_rotulo: string }[];
  alertas_documentos: (AlertaDocumento & { entidade_id: number; razao_social: string })[];
  solicitacoes_pendentes: number | null;
}

export interface ItemParametro { id: number; nome: string; ativo: boolean; papel: PapelSituacao | null; bens: number }
export interface Configuracao {
  doador_nome: string | null;
  doador_cnpj: string | null;
  doador_cidade: string | null;
  doador_uf: string | null;
  foro: string | null;
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  legislacao: string[];
  documentos_exigidos: DocumentoExigido[];
  caminho_cadastro_publico: string;
}
export interface ResultadoImportacao {
  criados: number;
  atualizados: number;
  sem_alteracao: number;
  pendencias: { linha: number; patrimonio: string | null; motivo: string }[];
  categorias_criadas: number;
  estados_criados: number;
}

export interface LotePortal extends LoteCard { inscrita: boolean; pode_participar: boolean; sorteado: boolean; vencedora: boolean; observacoes?: string | null; bens?: BemResumo[] }
export interface ListaLotesPortal { liberado: boolean; mensagem: string | null; lotes: LotePortal[] }
export interface FormularioPublico { orgao: { nome: string; logo_url: string | null }; documentos_exigidos: DocumentoExigido[] }

/* ------------------------------------------------------------------ */
/* Chamadas                                                              */
/* ------------------------------------------------------------------ */

const base = '/inservivel';
const get = async <T,>(url: string, params?: object): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.post<T>(`${base}${url}`, body)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.delete<T>(`${base}${url}`, { data: body })).data;
const multipart = async <T,>(url: string, corpo: FormData): Promise<T> =>
  (await apiClient.post<T>(`${base}${url}`, corpo, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
const baixar = async (url: string): Promise<Blob> => (await apiClient.get<Blob>(`${base}${url}`, { responseType: 'blob' })).data;

function formData(campos: Record<string, string | Blob | null | undefined>): FormData {
  const corpo = new FormData();
  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor !== null && valor !== undefined && valor !== '') corpo.append(chave, valor);
  });
  return corpo;
}

export const inservivelApi = {
  dashboard: (filtros?: { q?: string; situacao_id?: number; secretaria_unit_id?: number }) => get<Dashboard>('/dashboard', filtros),
  opcoes: () => get<Opcoes>('/opcoes'),

  // Bens
  bens: (filtros: FiltrosBens) => get<Paginado<BemResumo>>('/bens', filtros),
  bem: (id: number) => get<Bem>(`/bens/${id}`),
  salvarBem: (id: number | null, dados: Partial<DadosBem>) => (id === null ? post<Bem>('/bens', dados) : put<Bem>(`/bens/${id}`, dados)),
  enviarFoto: (bemId: number, arquivo: File, principal = false) => multipart<FotoBem>(`/bens/${bemId}/fotos`, formData({ arquivo, principal: principal ? '1' : '0' })),
  fotoPrincipal: (bemId: number, fotoId: number) => post<{ ok: boolean }>(`/bens/${bemId}/fotos/${fotoId}/principal`),
  removerFoto: (bemId: number, fotoId: number) => del<{ deleted: boolean }>(`/bens/${bemId}/fotos/${fotoId}`),
  foto: (bemId: number, fotoId: number) => baixar(`/bens/${bemId}/fotos/${fotoId}`),

  // Lotes
  lotes: (filtros?: { status?: StatusLote; q?: string }) => get<{ lotes: LoteCard[] }>('/lotes', filtros),
  lote: (id: number) => get<Lote>(`/lotes/${id}`),
  criarLote: (dados: DadosLote & { bens: number[] }) => post<Lote>('/lotes', dados),
  atualizarLote: (id: number, dados: Partial<DadosLote>) => put<Lote>(`/lotes/${id}`, dados),
  adicionarBens: (id: number, bens: number[]) => post<{ ok: boolean }>(`/lotes/${id}/bens`, { bens }),
  adicionarPorPatrimonio: (id: number, numero: string) => post<{ adicionado: BemResumo }>(`/lotes/${id}/bens`, { numero_patrimonial: numero }),
  retirarBem: (id: number, bemId: number) => del<{ ok: boolean }>(`/lotes/${id}/bens/${bemId}`),
  alterarStatusLote: (id: number, status: StatusLote) => post<Lote>(`/lotes/${id}/status`, { status }),
  excluirLote: (id: number, senha: string) => del<{ deleted: boolean }>(`/lotes/${id}`, { senha }),
  anexarLote: (id: number, nome: string, arquivo: File) => multipart<{ id: number }>(`/lotes/${id}/documentos`, formData({ nome, arquivo })),
  documentoLote: (id: number, docId: number) => baixar(`/lotes/${id}/documentos/${docId}`),
  sortear: (id: number) => post<Lote>(`/lotes/${id}/sorteio`),
  termoLote: (id: number, tipo: TipoTermo) => baixar(`/lotes/${id}/termos/${tipo}`),

  // Entidades
  entidades: (filtros: { q?: string; status?: StatusEntidade; page?: number }) => get<Paginado<EntidadeResumo>>('/entidades', filtros),
  entidade: (id: number) => get<Entidade>(`/entidades/${id}`),
  cadastrarEntidade: (dados: DadosEntidade & { senha: string }) => post<Entidade>('/entidades', dados),
  atualizarEntidade: (id: number, dados: Partial<CamposEntidade> & { cpf_representante?: string }) => put<Entidade>(`/entidades/${id}`, dados),
  alterarStatusEntidade: (id: number, status: StatusEntidade, documentos_faltantes: string[], observacao: string | null) =>
    post<Entidade>(`/entidades/${id}/status`, { status, documentos_faltantes, observacao }),
  analisarDocumento: (id: number, docId: number, dados: { situacao: SituacaoDocumento; observacao: string | null; validade?: string | null }) =>
    put<Entidade>(`/entidades/${id}/documentos/${docId}`, dados),
  documentoEntidade: (id: number, docId: number) => baixar(`/entidades/${id}/documentos/${docId}`),
  redefinirSenhaEntidade: (id: number, senha: string) => post<{ ok: boolean }>(`/entidades/${id}/senha`, { senha, senha_confirmation: senha }),
  excluirEntidade: (id: number, senha: string) => del<{ deleted: boolean }>(`/entidades/${id}`, { senha }),

  // Transferências
  transferencias: (escopo: 'vitrine' | 'minhas' | 'solicitacoes' | 'historico') => get<ListaTransferencias>('/transferencias', { escopo }),
  anunciaveis: (q?: string) => get<{ minha_secretaria: UnidadeRef | null; bens: BemResumo[] }>('/transferencias/anunciaveis', { q }),
  anunciar: (bemId: number, observacao: string | null) => post<{ id: number }>('/transferencias', { bem_id: bemId, observacao }),
  solicitar: (id: number) => post<{ status: StatusTransferencia }>(`/transferencias/${id}/solicitar`),
  aprovar: (id: number) => post<{ status: StatusTransferencia }>(`/transferencias/${id}/aprovar`),
  recusar: (id: number, motivo: string) => post<{ status: StatusTransferencia }>(`/transferencias/${id}/recusar`, { motivo }),
  cancelar: (id: number) => post<{ status: StatusTransferencia }>(`/transferencias/${id}/cancelar`),
  termoTransferencia: (id: number) => baixar(`/transferencias/${id}/termo`),

  // Parâmetros, configurações e importação
  parametros: (tipo: TipoParametro) => get<{ itens: ItemParametro[] }>(`/parametros/${tipo}`),
  salvarParametro: (tipo: TipoParametro, id: number | null, dados: { nome: string; ativo: boolean }) =>
    (id === null ? post<ItemParametro>(`/parametros/${tipo}`, dados) : put<ItemParametro>(`/parametros/${tipo}/${id}`, dados)),
  excluirParametro: (tipo: TipoParametro, id: number) => del<{ deleted: boolean }>(`/parametros/${tipo}/${id}`),
  substituir: (campo: 'situacao' | 'estado_conservacao', atual_id: number, novo_id: number) => post<{ bens_alterados: number }>('/parametros/substituir', { campo, atual_id, novo_id }),
  configuracao: () => get<Configuracao>('/configuracoes'),
  salvarConfiguracao: (dados: Partial<Omit<Configuracao, 'caminho_cadastro_publico'>>) => put<Configuracao>('/configuracoes', dados),
  importar: (arquivo: File) => multipart<ResultadoImportacao>('/importacao', formData({ arquivo })),
};

/** Portal da entidade (perfil Entidade): a entidade vem sempre do usuário logado. */
export const portalApi = {
  me: () => get<Entidade>('/portal/me'),
  atualizar: (dados: Partial<CamposEntidade>) => put<Entidade>('/portal/me', dados),
  enviarDocumento: (tipo: string, arquivo: File, validade: string | null) => multipart<Entidade>('/portal/documentos', formData({ tipo, arquivo, validade })),
  documento: (id: number) => baixar(`/portal/documentos/${id}`),
  lotes: () => get<ListaLotesPortal>('/portal/lotes'),
  lote: (id: number) => get<LotePortal>(`/portal/lotes/${id}`),
  participar: (id: number) => post<{ inscrita: boolean }>(`/portal/lotes/${id}/participacao`),
  desistir: (id: number) => del<{ inscrita: boolean }>(`/portal/lotes/${id}/participacao`),
  foto: (loteId: number, bemId: number, fotoId: number) => baixar(`/portal/lotes/${loteId}/bens/${bemId}/fotos/${fotoId}`),
  termo: (loteId: number, tipo: TipoTermo) => baixar(`/portal/lotes/${loteId}/termos/${tipo}`),
};

/** Cadastro público (sem login): o slug da prefeitura vem da URL. */
export const cadastroPublicoApi = {
  formulario: async (slug: string) => (await apiClient.get<FormularioPublico>(`/public/inservivel/${encodeURIComponent(slug)}/formulario`)).data,
  enviar: async (slug: string, corpo: FormData) =>
    (await apiClient.post<{ ok: boolean; mensagem: string }>(`/public/inservivel/${encodeURIComponent(slug)}/entidades`, corpo, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
};
