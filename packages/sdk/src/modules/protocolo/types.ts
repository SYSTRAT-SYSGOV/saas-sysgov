export type ProcessoStatus = 'aberto' | 'em_tramitacao' | 'aguardando' | 'concluido' | 'arquivado';

export type ProcessoOrigem = 'interna' | 'externa';

export type ProcessoSituacao = 'aberto' | 'em_transito' | 'em_posse' | 'encerrado';

export type PapelVinculo = 'origem' | 'referencia' | 'apensado';

export type TipoAtributo =
  | 'numerico'
  | 'texto'
  | 'lista'
  | 'lista_multipla'
  | 'data'
  | 'decimal'
  | 'texto_longo';

export interface ProcessoOrgaoResumo {
  id: number;
  name: string;
  code?: string;
  acronym?: string;
}

export interface ProcessoInteressadoResumo {
  id: number;
  nome: string;
  documento?: string;
  email?: string;
}

export interface ProcessoUsuarioResumo {
  id: number;
  name: string;
  email?: string;
}

export interface Processo {
  id: number;
  tenant_id: number;
  numero: number;
  ano: number;
  numero_formatado: string;
  assunto: string;
  descricao?: string | null;
  tipo_processo?: string;
  origem: ProcessoOrigem;
  orgao_origem_id: number;
  orgao_atual_id: number;
  interessado_id?: number | null;
  processo_pai_id?: number | null;
  ultimo_andamento_id?: number | null;
  status: ProcessoStatus;
  arquivamento_tipo?: 'corrente' | 'intermediario' | 'permanente' | null;
  data_arquivamento?: string | null;
  sigiloso: boolean;
  data_abertura: string;
  data_conclusao?: string | null;
  created_at?: string;
  updated_at?: string;
  orgao_origem?: ProcessoOrgaoResumo | null;
  orgao_atual?: ProcessoOrgaoResumo | null;
  interessado?: ProcessoInteressadoResumo | null;
  processo_pai?: Processo | null;
  andamento_atual?: Andamento | null;
  ultimo_andamento?: Andamento | null;
  atributos?: Atributo[];
  documentos?: Documento[];
  vinculos?: Vinculo[];
  filhos?: Processo[];
}

export interface Andamento {
  id: number;
  tenant_id: number;
  processo_id: number;
  sequencia: number;
  tipo_tramitacao_id: number;
  orgao_origem_id: number;
  orgao_destino_id: number;
  usuario_id: number;
  usuario_recebedor_id?: number | null;
  despacho?: string | null;
  data_envio?: string | null;
  data_recebimento?: string | null;
  and_atual: boolean;
  created_at: string;
  updated_at?: string;
  orgao_origem?: ProcessoOrgaoResumo | null;
  orgao_destino?: ProcessoOrgaoResumo | null;
  usuario?: ProcessoUsuarioResumo | null;
  usuario_recebedor?: ProcessoUsuarioResumo | null;
  tipo_tramitacao?: TipoTramitacao | null;
}

export interface Documento {
  id: number;
  tenant_id: number;
  processo_id: number;
  titulo: string;
  categoria?: string | null;
  nome_arquivo: string;
  caminho_storage: string;
  tamanho_bytes: number;
  mime_type: string;
  hash_sha256: string;
  versao: number;
  criado_por?: number | null;
  created_at: string;
  criador?: ProcessoUsuarioResumo | null;
}

export interface Atributo {
  id: number;
  tenant_id: number;
  processo_id: number;
  chave: string;
  label: string;
  tipo: TipoAtributo;
  valor: unknown;
  valor_formatado?: string;
  criado_por?: number | null;
  created_at?: string;
}

export interface VinculoResumo {
  titulo: string;
  detalhes?: string | null;
  status?: string | null;
}

export interface Vinculo {
  id: number;
  tenant_id: number;
  processo_id: number;
  entidade_tipo: string;
  entidade_id: number;
  papel_vinculo: PapelVinculo;
  metadados?: Record<string, unknown> | null;
  criado_por?: number | null;
  created_at: string;
  resumo?: VinculoResumo;
}

export interface TipoTramitacao {
  id: number;
  tenant_id: number;
  nome: string;
  slug: string;
  prazo_dias?: number | null;
  exige_parecer: boolean;
  permite_anexo: boolean;
  efeito_status?: ProcessoStatus | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProcessoLocalizacao {
  processo_id: number;
  numero: number;
  ano: number;
  numero_formatado: string;
  status: ProcessoStatus;
  situacao: ProcessoSituacao;
  orgao_atual: ProcessoOrgaoResumo | null;
  usuario_atual: ProcessoUsuarioResumo | null;
  tempo_aberto_segundos: number;
  ultima_movimentacao?: string | null;
  tipo_tramitacao_atual?: string | null;
  prazo_dias?: number | null;
}

export interface ProcessoPermanenciaItem {
  andamento_id: number;
  sequencia: number;
  situacao: 'concluido' | 'em_posse' | 'em_transito';
  orgao_origem?: ProcessoOrgaoResumo | null;
  orgao_destino?: ProcessoOrgaoResumo | null;
  usuario_remetente?: string | null;
  usuario_recebedor?: string | null;
  tipo_tramitacao?: string | null;
  data_tramitacao: string;
  data_recebimento?: string | null;
  data_saida?: string | null;
  tempo_transito_segundos: number;
  tempo_permanencia_segundos: number;
  and_atual: boolean;
}

export interface PrazoExcedidoItem {
  andamento_id: number;
  processo_id: number;
  processo_numero: string;
  processo_assunto: string;
  orgao_id: number;
  orgao_nome: string;
  usuario_responsavel?: string | null;
  tipo_tramitacao?: string | null;
  prazo_dias: number;
  dias_corridos: number;
  dias_atraso: number;
  em_posse: boolean;
}

export interface DashboardOrgaoItem {
  orgao_id: number;
  orgao_nome: string;
  orgao_sigla: string;
  total: number;
}

export interface PermanenciaOrgaoItem {
  orgao_id: number;
  orgao_nome: string;
  orgao_sigla: string;
  tempo_medio_segundos: number;
  tempo_medio_dias: number;
  total_andamentos: number;
}

export interface PrazoExcedidoOrgaoItem {
  orgao_id: number;
  orgao_nome: string;
  total_excedidos: number;
}

export interface TipoProcessoCountItem {
  tipo: string;
  total: number;
}

export interface ProdutividadeUsuarioItem {
  usuario_id: number;
  usuario_nome: string;
  total_tramitacoes: number;
}

export interface DashboardData {
  total_processos: number;
  por_status: Record<ProcessoStatus, number>;
  por_origem: Record<ProcessoOrigem, number>;
  por_tipo_processo?: TipoProcessoCountItem[];
  por_orgao: DashboardOrgaoItem[];
  tempo_medio_tramitacao_segundos: number | null;
  tempo_medio_tramitacao_dias: number | null;
  tempo_permanencia_por_orgao: PermanenciaOrgaoItem[];
  total_prazos_excedidos: number;
  prazos_excedidos_por_orgao: PrazoExcedidoOrgaoItem[];
  produtividade_por_usuario?: ProdutividadeUsuarioItem[];
}

export interface ListProcessosParams {
  q?: string;
  status?: ProcessoStatus;
  orgao_id?: number;
  origem?: ProcessoOrigem;
  tipo_processo?: string;
  arquivamento_tipo?: string;
  sigiloso?: boolean;
  ano?: number;
  interessado_id?: number;
  processo_pai_id?: number;
  page?: number;
  per_page?: number;
}

export interface CreateProcessoInput {
  assunto: string;
  origem: ProcessoOrigem;
  orgao_origem_id: number;
  orgao_destino_id?: number;
  tipo_processo?: string;
  interessado_id?: number;
  processo_pai_id?: number;
  descricao?: string;
  sigiloso?: boolean;
  tipo_tramitacao_id?: number;
  despacho_inicial?: string;
  atributos?: Record<string, unknown>;
}

export interface UpdateProcessoInput {
  assunto?: string;
  descricao?: string;
  tipo_processo?: string;
  processo_pai_id?: number | null;
  sigiloso?: boolean;
}

export interface ConcluirProcessoInput {
  despacho?: string;
}

export interface ArquivarProcessoInput {
  tipo_arquivamento: 'corrente' | 'intermediario' | 'permanente';
  despacho?: string;
}

export interface DesarquivarProcessoInput {
  motivo?: string;
}

export interface ReabrirProcessoInput {
  motivo?: string;
}

export interface TramitarProcessoInput {
  orgao_destino_id: number;
  tipo_tramitacao_id: number;
  despacho?: string;
}

export interface ReceberProcessoInput {
  justificativa?: string;
}

export interface CreateAtributoInput {
  chave: string;
  label: string;
  tipo: TipoAtributo;
  valor: unknown;
}

export interface CreateVinculoInput {
  entidade_tipo: string;
  entidade_id: number;
  papel_vinculo?: PapelVinculo;
  metadados?: Record<string, unknown>;
}

export interface PromoverRequerimentoInput {
  requerimento_id: number;
  orgao_destino_id?: number;
  tipo_tramitacao_id?: number;
  despacho_inicial?: string;
  sigiloso?: boolean;
}

export interface CreateTipoTramitacaoInput {
  nome: string;
  slug?: string;
  prazo_dias?: number | null;
  exige_parecer?: boolean;
  permite_anexo?: boolean;
  efeito_status?: ProcessoStatus | null;
  ativo?: boolean;
}

export interface UpdateTipoTramitacaoInput {
  nome?: string;
  prazo_dias?: number | null;
  exige_parecer?: boolean;
  permite_anexo?: boolean;
  efeito_status?: ProcessoStatus | null;
  ativo?: boolean;
}

export interface DashboardFiltros {
  data_inicio?: string;
  data_fim?: string;
}

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}
