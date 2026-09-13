export type ApiCiclo = {
  id: number;
  tenant_id: number;
  ano_referencia: number;
  ano_competencia?: number;
  nome: string;
  data_inicio?: string;
  data_fim?: string;
  data_inicio_avaliacao: string;
  data_fim_avaliacao: string;
  data_limite_preenchimento?: string;
  data_limite_recurso: string;
  status: 'planejamento' | 'planejado' | 'aberto' | 'em_avaliacao' | 'recursivo' | 'em_recurso' | 'deliberacao' | 'homologado' | 'encerrado';
  cadencia_automatica?: boolean;
  etapa_cadencia?: number;
  modo_f1?: 'manual' | 'api';
  modo_f2?: 'manual' | 'api';
  tipo_assinatura_ata?: 'sha256' | 'icp_brasil';
  metadata?: Record<string, unknown>;
  regras_config?: ApiRegrasCicloConfig;
};

export type ApiFator = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  automatizado: boolean;
  peso_geral: number;
  peso_magisterio: number;
  ordem: number;
  ativo: boolean;
};

export type ApiEvidencia = {
  id: number;
  nome_arquivo: string;
  url_armazenamento: string;
  hash_sha256: string;
  mime_type: string;
  tamanho_bytes: number;
  created_at: string;
};

export type ApiDiarioBordo = {
  id: number;
  ciclo_id: number;
  servidor_id: number;
  avaliador_id: number;
  fator_id: number;
  tipo: 'positivo' | 'negativo';
  data_ocorrencia: string;
  descricao_fato: string;
  ciencia_servidor_em?: string | null;
  fator?: ApiFator;
  servidor?: ApiServidor;
  evidencias?: ApiEvidencia[];
  hash_sha256?: string | null;
  created_at: string;
};

export type RespostaFator = {
  grau: number;
  automatizado?: boolean;
};

export type ApiAvaliacao = {
  id: number;
  ciclo_id: number;
  servidor_id: number;
  avaliador_id: number;
  respostas_fatores: Record<string, RespostaFator>;
  nota_final: string;
  nota_final_nfd?: string | number | null;
  nota_f1_assiduidade?: string | number | null;
  nota_f2_disciplina?: string | number | null;
  nota_qualitativa?: string | number | null;
  status?: string;
  elegivel_progressao: boolean;
  data_conclusao?: string | null;
  ciencia_servidor_em?: string | null;
  ciencia_tipo?: string | null;
  ciencia_ip?: string | null;
  devolutiva_realizada?: boolean;
  devolutiva_em?: string | null;
  devolutiva_resumo?: string | null;
  devolutiva_acordos?: string | null;
  devolutiva_por?: number | null;
  homologada: boolean;
  homologada_em?: string | null;
  ciclo?: ApiCiclo;
  servidor?: ApiServidor;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  dias_exercicio?: number | null;
  avaliacao_consolidada_id?: number | null;
  tipo_avaliacao?: 'integral' | 'parcial' | 'consolidada';
  status_avaliacao?: 'ativa' | 'suspensa_licenca';
};

export type ApiComissao = {
  id: number;
  ciclo_id: number;
  numero_portaria: string;
  portaria_nomeacao?: string;
  nome?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  data_publicacao_portaria: string;
  ativa: boolean;
  membros?: ApiComissaoMembro[];
};

export type ApiComissaoMembro = {
  id: number;
  comissao_id: number;
  servidor_id: number;
  papel: 'presidente' | 'secretario' | 'titular_gestao' | 'titular_servidor' | 'suplente';
  ativo: boolean;
  servidor?: { id: number; name: string; email: string };
};

export type ApiRecurso = {
  id: number;
  avaliacao_id: number;
  recorrente_id: number;
  servidor_id?: number;
  fator_contestado_id: number;
  justificativa_servidor: string;
  status: 'interposto' | 'em_instrucao' | 'pautado' | 'julgado_provido' | 'julgado_desprovido' | 'cancelado';
  relator_id?: number | null;
  prazo_relator_ate?: string | null;
  prazo_julgamento?: string;
  contestacao_chefia?: string | null;
  fatorContestado?: ApiFator;
  fator_contestado?: ApiFator;
  servidor?: ApiServidor;
  relator?: { id: number; nome_completo?: string; name?: string };
  documentos?: ApiEvidencia[];
  created_at: string;
};

export type ApiSessao = {
  id: number;
  comissao_id: number;
  tipo_sessao: 'ordinaria' | 'extraordinaria';
  data_sessao: string;
  quorum_presente: number;
  quorum_minimo: number;
  ata_texto?: string | null;
  hash_ata_sha256?: string | null;
  finalizada: boolean;
  finalizada_em?: string | null;
};

export type ApiDashboardMetricas = {
  ciclo: { id: number; nome: string; ano_referencia: number; status: string };
  avaliacoes: {
    total: number;
    concluidas: number;
    pendentes: number;
    elegiveis: number;
    homologadas: number;
    taxa_conclusao: number;
    taxa_elegivel: number;
    media_nfd: string;
    distribuicao: Record<string, number>;
  };
  diario_bordo_cit: {
    total: number;
    positivos: number;
    negativos: number;
    com_evidencia: number;
  };
  recursos: {
    total: number;
    providos: number;
    desprovidos: number;
    pendentes: number;
  };
  ranking_avaliadores: Array<{
    avaliador_id: number;
    total_avaliados: number;
    media_atribuida: number;
  }>;
};

export type CreateDiarioBordoInput = {
  ciclo_id: number;
  servidor_id: number;
  fator_id: number;
  tipo: 'positivo' | 'negativo';
  data_ocorrencia: string;
  descricao_fato: string;
};

export type CreateRecursoInput = {
  avaliacao_id: number;
  fator_contestado_id: number;
  justificativa_servidor: string;
};

export type VotarRecursoInput = {
  sessao_id: number;
  recurso_id: number;
  voto_favoravel: boolean;
  novo_grau_proposto?: number;
  parecer_voto?: string;
};

export type ApiServidor = {
  id: number;
  tenant_id: number;
  matricula: string;
  cpf: string;
  pis_pasep?: string | null;
  nome_completo: string;
  nome_social?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  regime_juridico: 'estatutario' | 'clt' | 'comissionado' | 'temporario' | 'estagiario';
  regime_previdenciario: 'rpps' | 'rgps';
  data_admissao?: string | null;
  data_posse?: string | null;
  data_exercicio?: string | null;
  carga_horaria_semanal: number;
  cargo_efetivo: string;
  funcao_gratificada?: string | null;
  nivel_padrao?: string | null;
  orgao_lotacao: string;
  lotacao_fisica?: string | null;
  org_unit_id?: number | null;
  chefia_imediata_id?: number | null;
  chefia_imediata?: { id: number; nome_completo: string; matricula: string; cargo_efetivo?: string };
  situacao_funcional: 'ativo' | 'afastado_saude' | 'licenca_premio' | 'licenca_maternidade' | 'cedido' | 'exonerado' | 'aposentado';
  estagio_probatorio: boolean;
  estagio_fase_atual?: number | null;
  estagio_data_fim?: string | null;
  estagio_status?: 'em_andamento' | 'aprovado' | 'reprovado' | 'suspenso';
  origem_sistema?: string;
  afastamentos?: ApiServidorAfastamento[];
};

export type ApiServidorAfastamento = {
  id: number;
  servidor_id: number;
  tipo_afastamento: string;
  data_inicio: string;
  data_fim?: string | null;
  dias_afastado?: number | null;
  substituto_id?: number | null;
  suspende_avaliacao: boolean;
  observacoes?: string | null;
};

export type ApiNivelHierarquia = {
  id: number;
  nivel: number;
  nome: string;
  cargo_referencia?: string | null;
  regra_substituicao: 'substituto_legal' | 'superior_hierarquico';
  is_topo: boolean;
  avaliador_topo_user_id?: number | null;
  avaliador_topo_role?: string | null;
  ativo: boolean;
};

export type ApiPendenciaHierarquia = {
  id: number;
  servidor_id: number;
  ciclo_id?: number | null;
  tipo_pendencia: 'sem_superior' | 'afastamento_sem_substituto' | 'topo_sem_config';
  motivo: string;
  status: 'aberta' | 'resolvida';
  avaliador_designado_id?: number | null;
  resolvido_por?: number | null;
  resolvido_em?: string | null;
  servidor?: { id: number; nome_completo: string; matricula: string };
  ciclo?: { id: number; nome: string; ano_referencia: number };
  created_at: string;
};

export type ApiRhIntegracao = {
  id: number;
  nome: string;
  driver: 'betha' | 'ipm' | 'senior' | 'totvs' | 'generic_rest';
  api_key: string;
  api_url?: string | null;
  webhook_url?: string | null;
  is_active: boolean;
  ultima_sincronizacao_em?: string | null;
  logs_count?: number;
};

export type ApiRhSyncLog = {
  id: number;
  integracao_id?: number | null;
  integracao?: { id: number; nome: string; driver: string };
  tipo: 'servidores' | 'frequencia' | 'afastamentos' | 'homologacao' | 'webhook';
  direcao: 'inbound' | 'outbound';
  status: 'sucesso' | 'erro' | 'parcial';
  registros_processados: number;
  registros_sucesso: number;
  registros_falha: number;
  detalhes?: Record<string, unknown> | null;
  created_at: string;
};

export type ApiEmbedContext = {
  session: {
    tenant_id: number;
    servidor_id?: number | null;
    matricula: string;
    nome: string;
    mode: 'autoavaliacao' | 'diario-bordo' | 'espelho' | 'recurso';
  };
  servidor?: {
    id: number;
    nome: string;
    matricula: string;
    cargo: string;
    lotacao: string;
    estagio: boolean;
  } | null;
  ciclo?: {
    id: number;
    nome: string;
    ano_referencia: number;
    status: string;
    data_limite: string;
  } | null;
  fatores: Array<{
    id: number;
    codigo: string;
    nome: string;
    descricao: string;
    peso: number;
  }>;
};

export type ApiRegrasCicloConfig = {
  dias_preenchimento?: number;
  dias_ciencia?: number;
  dias_recurso?: number;
  dias_relatoria?: number;
  intersticio_meses?: number;
  limite_faltas_injustificadas?: number;
  limite_dias_afastamento?: number;
  nota_corte_progressao?: string;
  percentual_amostragem_auditoria?: number;
  trava_graus_evidencia?: number[];
  excluir_estagiarios?: boolean;
  excluir_comissionados?: boolean;
};

export type TipoPergunta =
  | 'escala_grafica'
  | 'escolha_simples'
  | 'escolha_multipla'
  | 'texto_livre'
  | 'nota_0_10'
  | 'sim_nao'
  | 'condicional';

export type ApiPerguntaOpcao = {
  valor: number | string;
  rotulo: string;
  descricao?: string;
};

export type ApiPergunta = {
  id: number;
  tenant_id: number;
  modelo_id: number;
  codigo: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes?: ApiPerguntaOpcao[] | null;
  peso: number;
  grupo_key: string;
  ordem: number;
  obrigatoria: boolean;
  exige_evidencia: boolean;
  regras_condicionais?: { depende_de: string; valor_esperado: any } | null;
  cargos_permitidos?: string[] | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ApiModeloFormulario = {
  id: number;
  tenant_id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  plano_carreira_id?: number | null;
  cargo?: string | null;
  versao: number;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  grupos?: Record<string, { nome: string; peso: number; ordem: number }> | null;
  ativo: boolean;
  perguntas_ativas?: ApiPergunta[];
  perguntas?: ApiPergunta[];
  created_at?: string;
  updated_at?: string;
};

export type ApiPainelKpis = {
  total_servidores: number;
  percentual_concluidas: number;
  pendencias: number;
  recursos_abertos: number;
  notas_extremas_auditoria: number;
  prazos_vencendo: number;
};

export type ApiPainelFiltros = {
  org_unit_id?: number | string;
  secretaria?: string;
  cargo?: string;
  plano_carreira?: string;
  ciclo_id?: number | string;
  ano_competencia?: number | string;
  status_avaliacao?: 'pendente' | 'rascunho' | 'submetida' | 'em_recurso' | 'homologada';
  faixa_nota?: 'abaixo_6' | '6_a_7' | '7_a_8_5' | 'acima_8_5' | 'acima_9_5';
  nota_min?: number;
  nota_max?: number;
  avaliador_id?: number | string;
  servidor_id?: number | string;
  busca?: string;
  situacao_prazo?: 'ciencia_pendente' | 'recurso_vencido' | 'vencendo_7_dias';
  per_page?: number;
  page?: number;
};

export type ApiEspelhoAvaliacao = {
  avaliacao_id: number;
  ciclo: { id?: number; nome?: string; ano_referencia?: number };
  servidor: { id?: number; nome?: string; matricula?: string };
  avaliador: { id?: number; nome?: string };
  nota_final: string;
  elegivel_progressao: boolean;
  data_conclusao?: string | null;
  ciencia_servidor_em?: string | null;
  ciencia_tipo?: 'concordancia' | 'discordancia_recurso' | null;
  devolutiva_realizada?: boolean;
  devolutiva_em?: string | null;
  devolutiva_resumo?: string | null;
  parecer_avaliador?: string | null;
  fatores: Array<{
    codigo: string;
    nome: string;
    descricao?: string | null;
    grau?: number | null;
    nota: number | string;
    peso: number;
    justificativa?: string | null;
  }>;
  pode_recorrer: boolean;
};

export type ApiSimulacaoProgressao = {
  servidor: {
    id: number;
    nome: string;
    matricula: string;
    cargo: string;
    data_admissao?: string | null;
  };
  nfc_projetada: string;
  elegivel_progressao: boolean;
  nota_corte: string;
  historico_ciclos: Array<{
    ciclo_id: number;
    ano?: number;
    nota: string;
  }>;
  quinquenios: {
    qtd_quinquenios: number;
    percentual_total: number;
    proximo_em?: string | null;
  };
  percentual_progressao: number;
  percentual_total_aumento: number;
  regras_legais: {
    lei: string;
    progressao_horizontal: string;
    quinquenio: string;
    corte_minimo: string;
  };
};

export type ApiImpedimentoAuditoria = {
  id: number;
  tipo?: string;
  tipo_impedimento: string;
  motivo: string;
  declarado_em?: string | null;
  servidor_alvo: string | { id: number; nome_completo: string; matricula: string };
  servidor_alvo_id?: number;
  declarado_por: string;
  substituto_designado?: { id: number; nome_completo: string; matricula: string } | null;
  status: 'ativo' | 'revogado' | 'resolvido';
};
