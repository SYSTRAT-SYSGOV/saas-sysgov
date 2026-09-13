export type ApiCiclo = {
  id: number;
  tenant_id: number;
  ano_referencia: number;
  nome: string;
  data_inicio_avaliacao: string;
  data_fim_avaliacao: string;
  data_limite_recurso: string;
  status: 'planejamento' | 'em_avaliacao' | 'recursivo' | 'deliberacao' | 'homologado' | 'encerrado';
  modo_f1: 'manual' | 'api';
  modo_f2: 'manual' | 'api';
  tipo_assinatura_ata: 'sha256' | 'icp_brasil';
  metadata?: Record<string, unknown>;
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
  homologada: boolean;
  homologada_em?: string | null;
  ciclo?: ApiCiclo;
  servidor?: ApiServidor;
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
  suspende_avaliacao: boolean;
  observacoes?: string | null;
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

