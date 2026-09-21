/**
 * Módulo Licita — ciclo pré-editalício da Lei 14.133/2021 (DFD, ETP, Mapa de
 * Riscos, Pesquisa de Preços, TR, Edital). Fase 1: Processo + DFD.
 */

/**
 * `Etp`/`MapaRiscos`/`PesquisaPrecos`/`Tr`/`Edital` seguem existindo como
 * identificadores de "tipo de documento" (campos configuráveis, PDF), mas
 * **não são mais valores possíveis de `Processo.fase_atual`** — depois do
 * DFD aprovado, a equipe de planejamento edita esses documentos livremente
 * e em qualquer ordem, sem gate de aprovação entre eles. `fase_atual` só
 * transita entre `dfd → em_elaboracao → aprovacao_ordenador → concluido`.
 */
export type FaseLicita =
  | 'dfd'
  | 'em_elaboracao'
  | 'aprovacao_ordenador'
  | 'etp'
  | 'mapa_riscos'
  | 'pesquisa_precos'
  | 'tr'
  | 'edital'
  | 'concluido';
export type StatusProcesso = 'em_andamento' | 'concluido' | 'cancelado';
export type StatusDfd = 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
/**
 * Sem máquina de estados própria — `aprovado` só é setado em lote pela
 * aprovação final do Ordenador (ver AprovacaoFinal), nunca pelo próprio
 * documento. Enquanto `rascunho`, fica sempre editável.
 */
export type StatusEtp = 'rascunho' | 'aprovado';
export type StatusMapaRisco = 'rascunho' | 'aprovado';
export type StatusPesquisaPreco = 'rascunho' | 'aprovado';
export type StatusTr = 'rascunho' | 'aprovado';
export type StatusAprovacaoFinal = 'pendente' | 'aprovada' | 'rejeitada';
export type MetodoReferenciaPreco = 'media' | 'mediana' | 'menor_valor' | 'media_saneada';
export type GrauPrioridade = 'baixa' | 'media' | 'alta' | 'critica';
export type AcaoVersaoDfd =
  | 'criado'
  | 'revisado'
  | 'enviado_revisao'
  | 'aprovado'
  | 'rejeitado'
  | 'reaberto'
  | 'equipe_alterada_pelo_aprovador';
export type AcaoVersaoEtp = 'criado' | 'revisado' | 'aprovado';
export type AcaoVersaoMapaRisco = 'criado' | 'revisado' | 'aprovado';
export type AcaoVersaoPesquisaPreco = 'criado' | 'revisado' | 'aprovado';
export type AcaoVersaoTr = 'criado' | 'revisado' | 'aprovado';

/** Critérios de julgamento das propostas (art. 33 da Lei 14.133/2021). */
export type CriterioJulgamentoTr = 'menor_preco' | 'maior_desconto' | 'melhor_tecnica' | 'tecnica_e_preco' | 'maior_lance';

export type FaseRisco = 'planejamento' | 'selecao_fornecedor' | 'gestao_contratual';
export type AlocacaoRisco = 'contratante' | 'contratada' | 'compartilhado';

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

/**
 * `tipo` de um campo nativo (`nativo: true`) que não corresponde a nenhum
 * `TipoCampoConfiguravel` genérico porque tem um renderer próprio e fixo no
 * formulário do documento (ex.: `equipe_planejamento` do TR é uma lista
 * estruturada, `criterio_julgamento` é um select com opções fixas do
 * enum) — nunca aparece como opção no seletor "Tipo" da tela de
 * configuração, que fica desabilitado para campos nativos.
 */
export type TipoCampoNativo = 'equipe' | 'selecao_fixa';

export interface CampoConfig {
  key: string;
  label: string;
  tipo: TipoCampoConfiguravel | TipoCampoNativo;
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
  /**
   * true para uma seção nativa do documento (ex.: as seções legais do TR,
   * que já existem como coluna própria) que o tenant pode reorganizar
   * (rótulo/aba/obrigatoriedade), mas não excluir nem trocar o tipo —
   * `tipo`/`key` nesse caso vêm sempre do backend, nunca editáveis aqui.
   * Ausente/false para um campo extra normal, livremente criado pelo tenant.
   */
  nativo?: boolean;
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
  /**
   * Ausentes quando a configuração retornada é só a mesclagem de defaults
   * nativos (ver `nativo` em CampoConfig) — o tenant ainda não salvou nada
   * para este tipo de documento, então não existe uma linha persistida.
   */
  id?: number;
  tenant_id?: number;
  tipo_documento: TipoDocumentoConfiguravel;
  campos: CampoConfig[];
  ativo?: boolean;
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

export interface EtpVersao {
  id: number;
  etp_id: number;
  versao: number;
  acao: AcaoVersaoEtp;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  dados: Record<string, unknown> | null;
  user_id: number;
  usuario: UsuarioResumo | null;
  created_at: string;
}

/**
 * Estudo Técnico Preliminar (art. 18, §1º da Lei 14.133/2021) — conteúdo em
 * texto único estruturado (rich text com apoio de IA), não em campos fixos
 * por inciso. Só pode ser criado depois do DFD do mesmo processo aprovado.
 */
export interface Etp {
  id: number;
  tenant_id: number;
  processo_id: number;
  conteudo: string;
  /** Nasce como cópia da equipe do DFD (ver EtpService::criar), mas é editável independentemente dali em diante. */
  equipe_planejamento: MembroEquipePlanejamento[] | null;
  campos_extras: Record<string, unknown> | null;
  status: StatusEtp;
  gerado_por_ia: boolean;
  elaborado_por: number;
  aprovado_por: number | null;
  aprovado_em: string | null;
  elaborador: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
  versoes: EtpVersao[];
  created_at: string;
  updated_at: string;
}

export interface MapaRiscoVersao {
  id: number;
  mapa_risco_id: number;
  versao: number;
  acao: AcaoVersaoMapaRisco;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  dados: Record<string, unknown> | null;
  user_id: number;
  usuario: UsuarioResumo | null;
  created_at: string;
}

export interface Risco {
  descricao: string;
  fase: FaseRisco;
  /** Escala 1-5 — ver classificacaoRisco.ts para nível/classificação (Probabilidade x Impacto). */
  probabilidade: number;
  impacto: number;
  causa?: string | null;
  dano?: string | null;
  alocacao: AlocacaoRisco;
  acao_preventiva?: string | null;
  responsavel_prevencao?: string | null;
  acao_contingencia?: string | null;
  responsavel_contingencia?: string | null;
}

/**
 * Mapa de Riscos (art. 22 da Lei 14.133/2021) — matriz de riscos da
 * contratação. Só pode ser criado depois de existir um ETP no mesmo
 * processo (não precisa estar aprovado — sem aprovação individual por
 * fase, ver AprovacaoFinal).
 */
export interface MapaRisco {
  id: number;
  tenant_id: number;
  processo_id: number;
  /** Nasce como cópia da equipe do ETP (ver MapaRiscoService::criar), mas é editável independentemente dali em diante. */
  equipe_planejamento: MembroEquipePlanejamento[] | null;
  riscos: Risco[] | null;
  campos_extras: Record<string, unknown> | null;
  status: StatusMapaRisco;
  elaborado_por: number;
  aprovado_por: number | null;
  aprovado_em: string | null;
  elaborador: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
  versoes: MapaRiscoVersao[];
  created_at: string;
  updated_at: string;
}

export interface CotacaoItemPesquisaPreco {
  /** Fonte da cotação (ex.: "Painel de Preços", "Fornecedor direto", "Ata de registro de preços") — ver IN SEGES/ME nº 65/2021. */
  fonte: string;
  fornecedor?: string | null;
  valor_unitario: number;
  data_cotacao?: string | null;
  /** Link/identificação da cotação (URL do Painel de Preços, número da proposta, etc.). */
  referencia?: string | null;
}

/**
 * Item da Pesquisa de Preços — nasce como cópia de um item do DFD do
 * processo (codigo/descricao/unidade_medida/quantidade), ganhando sua
 * própria lista de cotações. O valor de referência (média/mediana/menor)
 * nunca é persistido — sempre calculado a partir das cotações (ver
 * utils/precoReferencia.ts), mesmo padrão do nível/classificação do Mapa de
 * Riscos.
 */
export interface ItemPesquisaPreco {
  codigo: string;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  /** Copiado do item do DFD — usado pela busca de preços por IA para saber se o código é CATMAT (material) ou CATSER (serviço). Ausente em itens criados antes desta funcionalidade. */
  tipo?: TipoItemDfd | null;
  cotacoes: CotacaoItemPesquisaPreco[];
}

export interface EstatisticaSaneamentoItem {
  total_encontrado: number;
  cv_percentual_final: number;
  outliers_removidos: number;
}

export interface SugestaoCotacoesItem {
  codigo: string;
  cotacoes_sugeridas: CotacaoItemPesquisaPreco[];
  estatisticas: EstatisticaSaneamentoItem;
}

export interface SugerirCotacoesPesquisaPrecoOutput {
  itens: SugestaoCotacoesItem[];
  justificativa_metodo_sugerida: string;
}

export interface PesquisaPrecoVersao {
  id: number;
  pesquisa_preco_id: number;
  versao: number;
  acao: AcaoVersaoPesquisaPreco;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  dados: Record<string, unknown> | null;
  user_id: number;
  usuario: UsuarioResumo | null;
  created_at: string;
}

/**
 * Pesquisa de Preços (IN SEGES/ME nº 65/2021) — apuração do valor estimado
 * da contratação a partir de cotações por item (mínimo 3 fontes por item
 * para poder entrar na aprovação final, ver RN-006 em
 * PesquisaPrecoService::validarCompletude). Só pode ser criada depois de
 * existir um Mapa de Riscos no mesmo processo (não precisa estar aprovado).
 */
export interface PesquisaPreco {
  id: number;
  tenant_id: number;
  processo_id: number;
  /** Nasce como cópia da equipe do Mapa de Riscos (ver PesquisaPrecoService::criar), mas é editável independentemente dali em diante. */
  equipe_planejamento: MembroEquipePlanejamento[] | null;
  itens: ItemPesquisaPreco[] | null;
  metodo_referencia: MetodoReferenciaPreco;
  justificativa_metodo: string | null;
  campos_extras: Record<string, unknown> | null;
  status: StatusPesquisaPreco;
  elaborado_por: number;
  aprovado_por: number | null;
  aprovado_em: string | null;
  elaborador: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
  versoes: PesquisaPrecoVersao[];
  created_at: string;
  updated_at: string;
}

export interface TrVersao {
  id: number;
  tr_id: number;
  versao: number;
  acao: AcaoVersaoTr;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  dados: Record<string, unknown> | null;
  user_id: number;
  usuario: UsuarioResumo | null;
  created_at: string;
}

/**
 * Termo de Referência (art. 6º, XXIII da Lei 14.133/2021) — consolida a
 * instrução processual em seções estruturadas (diferente do ETP, que é um
 * texto único). Nasce vazio e a equipe de planejamento preenche as seções
 * progressivamente; nenhuma é obrigatória para criar ou salvar. Só pode ser
 * criado depois de existir uma Pesquisa de Preços no mesmo processo (não
 * precisa estar aprovada).
 */
export interface Tr {
  id: number;
  tenant_id: number;
  processo_id: number;
  /** Nasce como cópia da equipe da Pesquisa de Preços (ver TrService::criar), mas é editável independentemente dali em diante. */
  equipe_planejamento: MembroEquipePlanejamento[] | null;
  fundamentacao_contratacao: string | null;
  descricao_solucao: string | null;
  requisitos_contratacao: string | null;
  modelo_execucao: string | null;
  modelo_gestao_contrato: string | null;
  criterio_julgamento: CriterioJulgamentoTr | null;
  obrigacoes_contratante: string | null;
  obrigacoes_contratada: string | null;
  sancoes_administrativas: string | null;
  vigencia_contrato: string | null;
  adequacao_orcamentaria: string | null;
  campos_extras: Record<string, unknown> | null;
  status: StatusTr;
  elaborado_por: number;
  aprovado_por: number | null;
  aprovado_em: string | null;
  elaborador: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
  versoes: TrVersao[];
  created_at: string;
  updated_at: string;
}

/**
 * Aprovação final do Ordenador de Despesas sobre o pacote inteiro de
 * artefatos do processo (ETP, Mapa de Riscos, Pesquisa de Preços — e TR/
 * Edital quando existirem), de uma vez só — é a única aprovação formal que
 * resta depois do DFD. Uma linha por processo; cada nova solicitação
 * (inclusive após rejeição) atualiza a mesma linha.
 */
export interface AprovacaoFinal {
  id: number;
  tenant_id: number;
  processo_id: number;
  status: StatusAprovacaoFinal;
  solicitado_por: number | null;
  solicitado_em: string | null;
  aprovado_por: number | null;
  aprovado_em: string | null;
  parecer: string | null;
  motivo_rejeicao: string | null;
  solicitante: UsuarioResumo | null;
  aprovador: UsuarioResumo | null;
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
  etp: Etp | null;
  // snake_case (não mapaRisco): Eloquent serializa relações com Str::snake()
  // no toArray()/toJson() — mapaRisco() no model vira "mapa_risco" no JSON.
  mapa_risco: MapaRisco | null;
  // snake_case (não pesquisaPreco): Eloquent serializa relações com Str::snake()
  // no toArray()/toJson() — pesquisaPreco() no model vira "pesquisa_preco" no JSON.
  pesquisa_preco: PesquisaPreco | null;
  tr: Tr | null;
  // snake_case (não aprovacaoFinal): Eloquent serializa relações com
  // Str::snake() no toArray()/toJson() — aprovacaoFinal() no model vira
  // "aprovacao_final" no JSON.
  aprovacao_final: AprovacaoFinal | null;
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
  /** true quando algum campo (ex.: justificativa) foi salvo a partir de uma sugestão de IA aceita sem edição — ver `sugerirJustificativaDfd`. */
  gerado_por_ia?: boolean;
}

export type UpdateDfdInput = Partial<CreateDfdInput>;

export interface CreateEtpInput {
  conteudo: string;
  /** Se omitido na criação, o backend copia a equipe do DFD do processo (ver EtpService::criar). */
  equipe_planejamento?: MembroEquipePlanejamento[];
  campos_extras?: Record<string, unknown>;
  gerado_por_ia?: boolean;
}

export type UpdateEtpInput = Partial<CreateEtpInput>;

export interface CreateMapaRiscoInput {
  riscos: Risco[];
  /** Se omitido na criação, o backend copia a equipe do ETP do processo (ver MapaRiscoService::criar). */
  equipe_planejamento?: MembroEquipePlanejamento[];
  campos_extras?: Record<string, unknown>;
}

export type UpdateMapaRiscoInput = Partial<CreateMapaRiscoInput>;

export interface CreatePesquisaPrecoInput {
  /** Se omitido na criação, o backend copia os itens do DFD do processo, cada um sem cotações (ver PesquisaPrecoService::criar). */
  itens?: ItemPesquisaPreco[];
  metodo_referencia: MetodoReferenciaPreco;
  justificativa_metodo?: string | null;
  /** Se omitido na criação, o backend copia a equipe do Mapa de Riscos do processo (ver PesquisaPrecoService::criar). */
  equipe_planejamento?: MembroEquipePlanejamento[];
  campos_extras?: Record<string, unknown>;
}

export type UpdatePesquisaPrecoInput = Partial<CreatePesquisaPrecoInput>;

/** Todas as seções são opcionais — o TR nasce vazio e é preenchido progressivamente (ver TrController::validatedData). */
export interface CreateTrInput {
  fundamentacao_contratacao?: string | null;
  descricao_solucao?: string | null;
  requisitos_contratacao?: string | null;
  modelo_execucao?: string | null;
  modelo_gestao_contrato?: string | null;
  criterio_julgamento?: CriterioJulgamentoTr | null;
  obrigacoes_contratante?: string | null;
  obrigacoes_contratada?: string | null;
  sancoes_administrativas?: string | null;
  vigencia_contrato?: string | null;
  adequacao_orcamentaria?: string | null;
  /** Se omitido na criação, o backend copia a equipe da Pesquisa de Preços do processo (ver TrService::criar). */
  equipe_planejamento?: MembroEquipePlanejamento[];
  campos_extras?: Record<string, unknown>;
}

export type UpdateTrInput = Partial<CreateTrInput>;

export interface SugerirJustificativaDfdInput {
  objeto: string;
  area_requisitante?: string | null;
  itens?: { descricao: string }[];
  /** Justificativa já escrita (HTML do editor) — quando informado, a IA MELHORA esse texto em vez de escrever do zero. */
  texto_atual?: string | null;
}

/** Legislação cadastrada na plataforma (global ou do tenant) usada como base para o texto sugerido — ver LegalDocumento. */
export interface LegislacaoUtilizadaIa {
  id: number;
  tipo: TipoLegalDocumento;
  numero: string | null;
  titulo: string;
}

export interface SugerirJustificativaDfdOutput {
  justificativa: string;
  legislacao_utilizada: LegislacaoUtilizadaIa[];
}

export interface SugerirItensDfdInput {
  objeto: string;
  area_requisitante?: string | null;
  /** Justificativa já escrita (HTML do editor), usada só como contexto adicional — não é modificada por esta chamada. */
  justificativa?: string | null;
}

export interface SugerirItensDfdOutput {
  /** Código/quantidade/valor unitário são estimativas de planejamento a confirmar — a Pesquisa de Preços, mais adiante, apura o valor real. */
  itens: ItemDfd[];
}

/**
 * "Sugerir com IA" genérico — usado por qualquer campo de texto rico
 * (TinyMCE) do Licita que não tenha um prompt dedicado (ver
 * `RichTextEditorWithIa` no front, e `SugerirJustificativaDfdInput` para o
 * caso dedicado da Justificativa do DFD).
 */
export interface SugerirTextoIaInput {
  /** Descrição do campo para a IA entender o que redigir (ex.: "Justificativa técnica do item", label do campo extra). */
  campo: string;
  /** Texto livre com dados já preenchidos em outros campos do mesmo documento — ajuda a IA e a busca de legislação relevante. */
  contexto?: string;
  /** Conteúdo já escrito no campo (HTML do editor) — quando informado, a IA MELHORA esse texto em vez de escrever do zero. */
  texto_atual?: string | null;
}

export interface SugerirTextoIaOutput {
  texto: string;
  legislacao_utilizada: LegislacaoUtilizadaIa[];
}

/**
 * Geração de riscos por IA para o Mapa de Riscos (ver
 * MapaRiscoIaService::sugerirRiscos) — usa objeto do processo + DFD + ETP
 * como contexto. Os riscos retornados são somados aos já existentes no
 * formulário, nunca substituem — a equipe de planejamento sempre revisa
 * antes de salvar.
 */
export interface SugerirRiscosMapaRiscoOutput {
  riscos: Risco[];
  /** Sugestões para os campos extras (texto/texto_longo) configurados pelo tenant para o Mapa de Riscos — só preenche campos ainda vazios no formulário. */
  campos_extras: Record<string, string>;
  legislacao_utilizada: LegislacaoUtilizadaIa[];
}

export interface ProcessoFilters {
  fase_atual?: FaseLicita | '';
  status_geral?: StatusProcesso | '';
  search?: string;
  page?: number;
  per_page?: number;
}
