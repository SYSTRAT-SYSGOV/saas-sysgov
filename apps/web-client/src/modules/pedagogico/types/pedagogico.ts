export type StatusAluno = 'Ativo' | 'Transferido' | 'Remanejado';
export type NivelAtencao = 'baixo' | 'medio' | 'alto';
export type SeveridadeOcorrencia = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type DesempenhoGeral = 'Excelente' | 'Bom' | 'Regular' | 'Insatisfatório';
export type ObjetivosStatus = 'Totalmente' | 'Parcialmente' | 'Não atingidos';
export type EngajamentoStatus = 'Alta participação' | 'Participação moderada' | 'Baixa participação';
export type SocioemocionalStatus = 'Adequado' | 'Necessita atenção' | 'Crítico';

export interface ContatoAluno {
  telefone: string;
  descricao: string;
}

export interface AlunoPedagogico {
  id: number;
  tenant_id: string;
  escola_nome?: string;
  nome: string;
  cgm?: string;
  numero?: number;
  turma_id: number;
  turma_nome: string;
  mae?: string;
  pai?: string;
  contato?: string;
  contatos?: ContatoAluno[];
  nascimento?: string;
  foto?: string;
  status: StatusAluno;
  turma_origem?: string;
  media_geral?: number;
  nivel_atencao?: NivelAtencao;
  total_ocorrencias?: number;
}

export type TurnoNome = 'Manhã' | 'Tarde' | 'Noite';

// Vínculo turma × matéria, com professor opcional (tabela turma_materias do sistema original)
export interface TurmaMateria {
  materia_id: number;
  professor_id: number | null;
}

export interface TurmaPedagogica {
  id: number;
  tenant_id: string;
  escola_id?: number;
  nome: string;
  turno_id?: number;
  turno_nome: TurnoNome;
  total_alunos: number;
  materias?: TurmaMateria[];
  /** Pedagoga da turma (equipe cadastrada); sugerida na ata do conselho. */
  pedagoga_nome?: string;
  media_turma?: number;
  alunos_atencao_alta?: number;
}

export interface Materia {
  id: number;
  tenant_id: string;
  nome: string;
  codigo?: string;
  carga_horaria?: number;
}

export interface NotaPedagogica {
  id: number;
  tenant_id: string;
  aluno_id: number;
  aluno_nome?: string;
  materia_id: number;
  materia_nome?: string;
  trimestre: 1 | 2 | 3;
  nota: number;
  nota_recuperacao?: number;
  criado_em?: string;
}

export interface PreConselhoAluno {
  id: number;
  pre_conselho_id: number;
  aluno_id: number;
  aluno_nome: string;
  nivel_atencao: NivelAtencao;
  dificuldade_identificada: string;
  encaminhamentos_realizados: string;
  aluno_destaque?: boolean;
}

export interface PreConselho {
  id: number;
  tenant_id: string;
  turma_id: number;
  turma_nome: string;
  materia_id?: number;
  materia_nome?: string;
  ano_letivo: string;
  periodo: string;
  data_registro: string;
  desempenho_geral: DesempenhoGeral;
  desempenho_justificativa: string;
  conteudos_trabalhados: string;
  objetivos_atingidos: ObjetivosStatus;
  obs_pedagogicas: string;
  metodologias?: string[];
  metodologias_outras?: string;
  metodologias_eficacia?: string;
  instrumentos_avaliativos?: string[];
  instrumentos_adequados?: 'Sim' | 'Parcialmente' | 'Não';
  instrumentos_outros?: string;
  instrumentos_obs?: string;
  engajamento_nivel: EngajamentoStatus;
  engajamento_dificuldades?: string;
  engajamento_potencialidades?: string;
  dificuldades_aprendizagem?: string;
  estrategias_superacao?: string;
  socioemocional_status: SocioemocionalStatus;
  socioemocional_descricao?: string;
  alunos_avaliados: PreConselhoAluno[];
  criado_em?: string;
}

export interface OcorrenciaPedagogica {
  id: number;
  tenant_id: string;
  aluno_id: number;
  aluno_nome: string;
  turma_nome: string;
  categoria: string;
  descricao: string;
  data: string;
  severidade: SeveridadeOcorrencia;
  registrado_por?: string;
  anexo_nome?: string;
  anexo_url?: string;
}

export interface Professor {
  id: number;
  tenant_id: string;
  nome: string;
  email: string;
  telefone?: string;
  especialidade: string;
  turno: string;
  turmas_atribuidas: string[];
  materias: string[];
}

export interface AtaConselho {
  id: number;
  tenant_id: string;
  turma_id: number;
  turma_nome: string;
  periodo: string;
  ano_letivo: string;
  data_reuniao: string;
  diretor: string;
  pedagoga: string;
  secretario: string;
  deliberacoes: string;
  texto_introducao?: string;
  texto_conclusao?: string;
  assinaturas?: Record<string, string>; // papel → imagem da assinatura (data URL)
  aprovados_count: number;
  recuperacao_count: number;
  retidos_count: number;
  status: 'Rascunho' | 'Finalizada' | 'Arquivada';
  atualizado_em?: string;
}

export interface PedagogicoStats {
  total_alunos: number;
  total_turmas: number;
  total_professores: number;
  media_geral_escola: number;
  alunos_atencao_alta: number;
  alunos_atencao_media: number;
  conselhos_realizados: number;
  ocorrencias_mes: number;
  taxa_aprovacao_estimada: number;
}

export interface CategoriaOcorrencia {
  id: number;
  tenant_id: string;
  nome: string;
  cor: string; // hex, ex.: #f59e0b
}

export interface PeriodoTrimestre {
  id: number;
  tenant_id: string;
  ano: number;
  trimestre: 1 | 2 | 3;
  data_inicio: string; // aaaa-mm-dd
  data_fim: string;
}

export interface ConfigEscola {
  nome: string;
  logo?: string; // data URL da imagem
}

// Janela de preenchimento das fichas de pré-conselho (tabela pre_conselho_cronograma)
export interface CronogramaPreConselho {
  id: number;
  tenant_id: string;
  ano_letivo: number;
  periodo: '1º Trimestre' | '2º Trimestre' | '3º Trimestre';
  data_inicio: string;
  data_fim: string;
}
