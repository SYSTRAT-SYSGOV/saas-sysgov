/**
 * Módulo Licita — ciclo pré-editalício da Lei 14.133/2021 (DFD, ETP, Mapa de
 * Riscos, Pesquisa de Preços, TR, Edital). Fase 1: Processo + DFD.
 */

export type FaseLicita = 'dfd' | 'etp' | 'mapa_riscos' | 'pesquisa_precos' | 'tr' | 'edital' | 'concluido';
export type StatusProcesso = 'em_andamento' | 'concluido' | 'cancelado';
export type StatusDfd = 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
export type GrauPrioridade = 'baixa' | 'media' | 'alta' | 'critica';
export type AcaoVersaoDfd = 'criado' | 'revisado' | 'enviado_revisao' | 'aprovado' | 'rejeitado';

export type TipoItemDfd = 'material' | 'servico';

export interface ItemDfd {
  tipo: TipoItemDfd;
  /** CATMAT (material) ou CATSER (serviço) — o rótulo exibido muda conforme `tipo`. */
  codigo: string;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  /** Campos extras configurados pelo órgão para este tipo de item (ver 'dfd_item_material'/'dfd_item_servico' em CampoConfiguracao). */
  campos_extras?: Record<string, unknown>;
}

export interface MembroEquipePlanejamento {
  nome: string;
  cargo: string;
  matricula: string;
}

export interface UsuarioResumo {
  id: number;
  name: string;
}

export interface DfdVersao {
  id: number;
  dfd_id: number;
  versao: number;
  acao: AcaoVersaoDfd;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  dados: Record<string, unknown> | null;
  user_id: number;
  usuario: UsuarioResumo | null;
  created_at: string;
}

export type TipoCampoConfiguravel = 'texto' | 'texto_longo' | 'numero' | 'data' | 'booleano' | 'selecao';

export interface CampoConfig {
  key: string;
  label: string;
  tipo: TipoCampoConfiguravel;
  opcoes?: string[];
  obrigatorio: boolean;
  ordem: number;
  ajuda?: string;
  /**
   * Nome da aba do formulário em que este campo aparece — campos sem `aba`
   * (ou com string vazia) caem na aba padrão (a primeira, sempre presente).
   * Campos com o mesmo nome de aba ficam agrupados juntos; a ordem das
   * abas segue a ordem dos campos (`ordem`), e a ordem de impressão no PDF
   * segue `ordem` normalmente, independente da aba.
   */
  aba?: string;
}

/**
 * Tipos de documento que aceitam campos extras configuráveis pelo órgão
 * (ver CampoConfiguracaoPage): as fases do processo (FaseLicita) + os
 * sub-tipos de item do DFD, que não são fases (não avançam o processo),
 * são sub-entidades do DFD com campos exigidos próprios (material e
 * serviço podem ter exigências diferentes).
 */
export type TipoDocumentoConfiguravel = FaseLicita | 'dfd_item_material' | 'dfd_item_servico';

export interface CampoConfiguracao {
  id: number;
  tenant_id: number;
  tipo_documento: TipoDocumentoConfiguravel;
  campos: CampoConfig[];
  ativo: boolean;
}

export type TipoLegalDocumento = 'lei' | 'decreto' | 'instrucao_normativa' | 'jurisprudencia' | 'outro';

export interface LegalDocumento {
  id: number;
  tenant_id: number | null;
  tipo: TipoLegalDocumento;
  numero: string | null;
  titulo: string;
  ementa: string | null;
  texto_completo: string;
  tags: string[] | null;
  ativo: boolean;
  criado_por: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLegalDocumentoInput {
  tipo: TipoLegalDocumento;
  numero?: string | null;
  titulo: string;
  ementa?: string | null;
  texto_completo: string;
  tags?: string[];
  global?: boolean;
}

export type UpdateLegalDocumentoInput = Partial<Omit<CreateLegalDocumentoInput, 'global'>>;

export interface Dfd {
  id: number;
  tenant_id: number;
  processo_id: number;
  data_previsao: string;
  grau_prioridade: GrauPrioridade;
  justificativa: string;
  objeto: string;
  previsao_pca: boolean;
  numero_pca: string | null;
  area_requisitante: string | null;
  equipe_planejamento: MembroEquipePlanejamento[] | null;
  campos_extras: Record<string, unknown> | null;
  itens: ItemDfd[] | null;
  status: StatusDfd;
  gerado_por_ia: boolean;
  elaborado_por: number;
  aprovado_por: number | null;
  aprovado_em: string | null;
  elaborador: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
  versoes: DfdVersao[];
  created_at: string;
  updated_at: string;
}

export interface Processo {
  id: number;
  tenant_id: number;
  numero: string;
  ano: number;
  objeto: string | null;
  fase_atual: FaseLicita;
  status_geral: StatusProcesso;
  licitacao_id: number | null;
  criado_por: number | null;
  dfd: Dfd | null;
  created_at: string;
  updated_at: string;
}

/**
 * Número e ano são gerados automaticamente pelo backend (ano corrente,
 * número sequencial) — o usuário só informa o objeto preliminar.
 */
export interface CreateProcessoInput {
  objeto?: string | null;
}

export interface CreateDfdInput {
  data_previsao: string;
  grau_prioridade: GrauPrioridade;
  justificativa: string;
  objeto: string;
  previsao_pca?: boolean;
  numero_pca?: string | null;
  area_requisitante?: string | null;
  equipe_planejamento?: MembroEquipePlanejamento[];
  campos_extras?: Record<string, unknown>;
  itens?: ItemDfd[];
}

export type UpdateDfdInput = Partial<CreateDfdInput>;

export interface ProcessoFilters {
  fase_atual?: FaseLicita | '';
  status_geral?: StatusProcesso | '';
  search?: string;
  page?: number;
  per_page?: number;
}
