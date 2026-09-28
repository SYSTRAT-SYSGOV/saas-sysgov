// ════════════════════════════════════════════════════════════════════════════
// MÓDULO CEMITÉRIOS — SDK TYPES
// ════════════════════════════════════════════════════════════════════════════

// ── Enums ────────────────────────────────────────────────────────────────────

export enum ViaSucessao {
  InventarioJudicial = 'inventario_judicial',
  InventarioExtrajudicial = 'inventario_extrajudicial',
  AlvaráJudicial = 'alvara_judicial',
  Arrolamento = 'arrolamento',
}

export enum EstadoSucessao {
  Solicitada = 'solicitada',
  EmAnalise = 'em_analise',
  AguardandoDocumentos = 'aguardando_documentos',
  Validada = 'validada',
  Sucedida = 'sucedida',
  Indeferida = 'indeferida',
  Arquivada = 'arquivada',
}

export enum TipoDocumentoSucessao {
  CertidaoObito = 'certidao_obito',
  Inventario = 'inventario',
  FormalPartilha = 'formal_partilha',
  Escritura = 'escritura',
  Alvará = 'alvara',
  Procuracao = 'procuracao',
  Outro = 'outro',
}

export enum Parentesco {
  Companheiro = 'companheiro',
  Filho = 'filho',
  Pai = 'pai',
  Mae = 'mae',
  Irmao = 'irmao',
  Neto = 'neto',
  Avo = 'avo',
  Tio = 'tio',
  Sobrinho = 'sobrinho',
  Outro = 'outro',
  Representante = 'representante',
}

// ── Tipos de Resposta da API ────────────────────────────────────────────────

export type ApiSucessao = {
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
  herdeiros?: ApiSucessaoHerdeiro[];
  documentos?: ApiSucessaoDocumento[];
  historico?: ApiSucessaoHistorico[];
  requerente?: { id: number; name: string };
  titularFalecido?: { id: number; nome: string; documento: string };
};

export type ApiSucessaoHerdeiro = {
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
  deleted_at: string | null;

  // Relacionamentos
  sucessao?: ApiSucessao;
  herdeiroRepresentado?: ApiSucessaoHerdeiro;
  representados?: ApiSucessaoHerdeiro[];
};

export type ApiSucessaoDocumento = {
  id: number;
  tenant_id: number;
  sucessao_id: number;
  tipo: TipoDocumentoSucessao;
  arquivo: string;
  hash: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos
  sucessao?: ApiSucessao;
};

export type ApiSucessaoHistorico = {
  id: number;
  tenant_id: number;
  sucessao_id: number;
  de_estado: string;
  para_estado: string;
  motivo: Record<string, unknown> | null;
  usuario_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos
  sucessao?: ApiSucessao;
  usuario?: { id: number; name: string };
};

export type ApiSucessaoPaginado = {
  data: ApiSucessao[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
};

export type ApiDashboardPendentes = {
  resumo: {
    em_analise: number;
    aguardando_documentos: number;
    validada: number;
    total: number;
  };
  processos: Array<{
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
  }>;
};

export type ApiDashboardRegularizacao = {
  total: number;
  processos: Array<{
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
  }>;
};

// ── Tipos de Entrada (Inputs) ──────────────────────────────────────────────

export type AbrirSucessaoInput = {
  concession_id: number;
  park_id?: number | null;
  plot_id?: number | null;
  via: ViaSucessao;
  requerente_id?: number | null;
  titular_falecido_id?: number | null;
  data_falecimento?: string | null;
  processo_referencia?: string | null;
};

export type AtualizarSucessaoInput = {
  park_id?: number | null;
  plot_id?: number | null;
  requerente_id?: number | null;
  titular_falecido_id?: number | null;
  data_falecimento?: string | null;
  processo_referencia?: string | null;
  parecer?: string | null;
  lock_version: number;
};

export type TransicaoSucessaoInput = {
  para: EstadoSucessao;
  motivo: string;
  lock_version: number;
};

export type HerdeiroInput = {
  nome: string;
  parentesco: Parentesco;
  documento?: string | null;
  ordem: number;
  direito_representacao?: boolean;
  titular_indicado?: boolean;
  herdeiro_representado_id?: number | null;
};

export type HerdeirosSucessaoInput = {
  herdeiros: HerdeiroInput[];
};

export type DocumentoSucessaoInput = {
  tipo: TipoDocumentoSucessao;
  arquivo: File;
};

// ── Filtros de Listagem ────────────────────────────────────────────────────

export type SucessaoFiltros = {
  estado?: EstadoSucessao;
  via?: ViaSucessao;
  park_id?: number;
  concession_id?: number;
  data_falecimento_inicio?: string;
  data_falecimento_fim?: string;
  q?: string;
  per_page?: number;
  page?: number;
};

// ── Configuração de Sucessão (por Tenant) ──────────────────────────────────

export type SucessaoConfig = {
  ordem_prioridade: Parentesco[];
  prazo_regularizacao_dias: number;
  documentos_por_via: Record<ViaSucessao, TipoDocumentoSucessao[]>;
  direito_representacao_habilitado: boolean;
  base_legal: string;
  retencao_documentos_dias: number;
  notificacao_antecedencia_dias: number[];
};