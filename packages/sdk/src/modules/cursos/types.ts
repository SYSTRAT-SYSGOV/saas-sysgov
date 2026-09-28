// Contrato do módulo Cursos e Formações (apps/api/Modules/Cursos).

export type TipoCurso = 'curso' | 'evento';
export type StatusCurso = 'rascunho' | 'publicado' | 'encerrado';
export type StatusTurma = 'aberta' | 'encerrada' | 'cancelada';
export type Modalidade = 'presencial' | 'online' | 'hibrido';
export type StatusInscricao = 'pendente' | 'confirmada' | 'lista_espera' | 'cancelada' | 'concluida' | 'nao_concluida';
export type OrigemPresenca = 'manual' | 'qr_code';
export type SituacaoAula = 'presente' | 'falta' | 'em_andamento' | 'nao_realizada';
export type TipoCertificado = 'curso' | 'formacao';
export type TipoMaterial = 'arquivo' | 'video' | 'link' | 'texto';
export type RegraLiberacao = 'imediata' | 'inicio_aula' | 'dias_apos_inicio';
export type TipoQuestao = 'objetiva' | 'dissertativa';
export type StatusTentativa = 'em_andamento' | 'aguardando_correcao' | 'corrigida';

export interface Curso {
  id: number;
  tipo: TipoCurso;
  titulo: string;
  descricao: string | null;
  carga_horaria_minutos: number;
  capa_path: string | null;
  capa_url: string | null;
  status: StatusCurso;
  frequencia_minima: number;
  nota_minima: string | null;
  modelo_certificado_id: number | null;
  turmas_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CursoDetalhe extends Curso {
  aulas: Aula[];
  turmas: Turma[];
  formacoes: Formacao[];
}

export interface CursoInput {
  tipo?: TipoCurso;
  titulo: string;
  descricao?: string | null;
  carga_horaria_minutos: number;
  frequencia_minima?: number;
  /** 0 a 10; nulo/ausente = sem nota mínima. Eventos não aceitam. */
  nota_minima?: number | null;
  modelo_certificado_id?: number | null;
}

export interface Aula {
  id: number;
  curso_id: number;
  titulo: string;
  descricao: string | null;
  ordem: number;
  duracao_minutos: number;
}

export interface AulaInput {
  titulo: string;
  descricao?: string | null;
  duracao_minutos: number;
  ordem?: number;
}

export interface FormacaoCursoPivot {
  ordem: number;
  obrigatorio: boolean;
}

export interface Formacao {
  id: number;
  titulo: string;
  descricao: string | null;
  modelo_certificado_id: number | null;
  cursos: (Curso & { pivot: FormacaoCursoPivot })[];
}

export interface FormacaoInput {
  titulo: string;
  descricao?: string | null;
  modelo_certificado_id?: number | null;
  cursos: { curso_id: number; obrigatorio: boolean; ordem?: number }[];
}

export interface InstrutorResumo {
  id: number;
  name: string;
  email?: string;
}

export interface AulaAgendamento {
  id: number;
  turma_id: number;
  aula_id: number;
  inicio: string;
  fim: string;
  aula?: Pick<Aula, 'id' | 'titulo'> & Partial<Aula>;
}

export interface Turma {
  id: number;
  curso_id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  vagas: number;
  modalidade: Modalidade;
  local: string | null;
  link: string | null;
  aprovacao_manual: boolean;
  status: StatusTurma;
  encerrada_em: string | null;
  instrutores?: InstrutorResumo[];
  vagas_ocupadas?: number;
  vagas_restantes?: number;
  lista_espera?: number;
  curso?: Pick<Curso, 'id' | 'titulo' | 'tipo' | 'carga_horaria_minutos'> & Partial<Curso>;
}

export interface TurmaDetalhe extends Turma {
  curso: Curso;
  agendamentos: AulaAgendamento[];
  instrutores: InstrutorResumo[];
  vagas_ocupadas: number;
  vagas_restantes: number;
  lista_espera: number;
}

export interface TurmaInput {
  nome: string;
  data_inicio: string;
  data_fim: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  vagas: number;
  modalidade: Modalidade;
  local?: string | null;
  link?: string | null;
  aprovacao_manual?: boolean;
  instrutores: number[];
}

export interface CatalogoTurma {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  vagas: number;
  modalidade: Modalidade;
  local: string | null;
  aprovacao_manual: boolean;
  vagas_restantes: number;
  inscricoes_abertas: boolean;
  minha_inscricao: { id: number; status: StatusInscricao; posicao_fila: number | null } | null;
}

export interface CatalogoCurso {
  id: number;
  tipo: TipoCurso;
  titulo: string;
  descricao: string | null;
  carga_horaria_minutos: number;
  capa_url: string | null;
  frequencia_minima: number;
  turmas: CatalogoTurma[];
}

export interface Frequencia {
  aulas: number;
  presencas: number;
  percentual: number;
}

export interface Inscricao {
  id: number;
  turma_id: number;
  participante_id: number;
  status: StatusInscricao;
  aprovada_em: string | null;
  cancelada_em: string | null;
  motivo_cancelamento: string | null;
  frequencia_apurada: string | null;
  nota_apurada: string | null;
  concluida_em: string | null;
  created_at: string;
}

export interface MinhaInscricao extends Inscricao {
  turma: Turma & { curso: Pick<Curso, 'id' | 'titulo' | 'tipo' | 'carga_horaria_minutos' | 'capa_url'> };
  certificado: { id: number; inscricao_id: number; codigo: string; revogado_em: string | null } | null;
  posicao_fila: number | null;
  frequencia: Frequencia;
  /** Nota parcial (turma aberta) ou apurada (encerrada); nulo sem avaliações publicadas. */
  nota: number | null;
}

export interface AulaFrequencia {
  agendamento_id: number;
  aula: string;
  inicio: string;
  fim: string;
  situacao: SituacaoAula;
}

export interface InscricaoDetalhe extends Omit<MinhaInscricao, 'turma'> {
  turma: Turma & { curso: Curso };
  participante: { id: number; nome: string; email: string };
  aulas: AulaFrequencia[];
}

export interface InscritoTurma {
  id: number;
  participante_id: number;
  nome: string;
  email: string;
  status: StatusInscricao;
  status_label: string;
  inscrito_em: string;
  posicao_fila: number | null;
  frequencia: Frequencia;
  nota: number | null;
}

export interface ItemChamada {
  inscricao_id: number;
  participante: string;
  email: string;
  presente: boolean | null;
  origem: OrigemPresenca | null;
}

export interface Chamada {
  agendamento: AulaAgendamento;
  chamada: ItemChamada[];
}

export interface QrCheckIn {
  token: string;
  url: string;
  /** SVG em data URI, pronto para <img src>. */
  qr_code: string;
  expira_em: string;
  validade_segundos: number;
}

export interface CheckInResultado {
  presenca: { id: number; presente: boolean; origem: OrigemPresenca; agendamento: AulaAgendamento };
  ja_registrada: boolean;
}

export interface ResumoEncerramento {
  concluidas: number;
  nao_concluidas: number;
  canceladas: number;
  certificados_emitidos: number;
  certificados_pendentes: { inscricao_id: number; participante: string }[];
  formacoes_pendentes: number[];
}

export interface Certificado {
  id: number;
  codigo: string;
  tipo: TipoCertificado;
  participante_id: number;
  participante: string | null;
  curso: string | null;
  carga_horaria: string | null;
  periodo: string | null;
  emitido_em: string;
  revogado_em: string | null;
  motivo_revogacao: string | null;
  url_validacao: string;
}

export interface Assinatura {
  nome: string;
  cargo: string;
  imagem_path: string | null;
}

export interface ModeloCertificado {
  id: number;
  nome: string;
  titulo: string;
  corpo: string;
  logotipo_path: string | null;
  assinaturas: Assinatura[] | null;
  padrao: boolean;
}

export interface ModeloCertificadoInput {
  nome: string;
  titulo: string;
  corpo: string;
  padrao?: boolean;
  assinaturas?: { nome: string; cargo: string }[];
}

export interface CertificadoPublico {
  codigo: string;
  status: 'valido' | 'revogado';
  tipo: TipoCertificado;
  participante: string;
  curso: string;
  carga_horaria: string;
  periodo: string;
  data_emissao: string;
  orgao: string;
}

export type ValidacaoCertificado =
  | { encontrado: true; certificado: CertificadoPublico }
  | { encontrado: false; mensagem: string };

export interface CursoFiltros {
  status?: StatusCurso;
  tipo?: TipoCurso;
  busca?: string;
  page?: number;
  per_page?: number;
}

// ------------------------------------------------------------------ Fase 2: conteúdo e avaliação

export interface Material {
  id: number;
  curso_id: number;
  aula_id: number | null;
  tipo: TipoMaterial;
  titulo: string;
  descricao: string | null;
  ordem: number;
  publicado: boolean;
  conteudo: string | null;
  url: string | null;
  video_provedor: string | null;
  video_id: string | null;
  /** Endereço do player, montado no servidor a partir de provedor + ID. */
  embed_url: string | null;
  arquivo_nome: string | null;
  arquivo_tamanho: number | null;
  liberacao_regra: RegraLiberacao;
  liberacao_dias: number | null;
  created_at: string;
  updated_at: string;
}

export interface LiberacaoInput {
  aula_id?: number | null;
  liberacao_regra?: RegraLiberacao;
  liberacao_dias?: number | null;
}

export interface MaterialInput extends LiberacaoInput {
  tipo?: TipoMaterial;
  titulo?: string;
  descricao?: string | null;
  ordem?: number;
  publicado?: boolean;
  /** Tipo texto. */
  conteudo?: string | null;
  /** Tipos link e vídeo. */
  url?: string | null;
}

export interface Alternativa {
  id: number;
  questao_id: number;
  texto: string;
  correta: boolean;
  ordem: number;
}

export interface Questao {
  id: number;
  curso_id: number;
  tipo: TipoQuestao;
  enunciado: string;
  pontuacao: string;
  orientacao_correcao: string | null;
  ativa: boolean;
  alternativas: Alternativa[];
  avaliacoes_count?: number;
}

export interface QuestaoInput {
  tipo?: TipoQuestao;
  enunciado?: string;
  pontuacao?: number;
  orientacao_correcao?: string | null;
  /** Objetiva: de 2 a 6, exatamente uma correta. */
  alternativas?: { texto: string; correta?: boolean }[];
}

export interface AvaliacaoQuestao {
  questao_id: number;
  ordem: number;
  questao: Questao;
}

export interface Avaliacao {
  id: number;
  curso_id: number;
  aula_id: number | null;
  titulo: string;
  instrucoes: string | null;
  peso: number;
  tentativas_max: number;
  tempo_limite_minutos: number | null;
  publicada: boolean;
  liberacao_regra: RegraLiberacao;
  liberacao_dias: number | null;
  questoes_count: number;
  tentativas_count: number;
  /** Só o Administrador recebe as questões (com gabarito). */
  questoes?: AvaliacaoQuestao[];
}

export interface AvaliacaoInput extends LiberacaoInput {
  titulo?: string;
  instrucoes?: string | null;
  peso?: number;
  tentativas_max?: number;
  tempo_limite_minutos?: number | null;
  /** Ids do banco de questões do curso, na ordem da prova. */
  questoes?: number[];
}

/** Questão como o participante a recebe: nunca traz `correta` nem a orientação de correção. */
export interface TentativaQuestaoParticipante {
  questao_id: number;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  pontuacao: number;
  alternativas: { id: number; texto: string; ordem: number }[];
  resposta: { alternativa_id: number | null; texto: string | null };
  /** Só depois de corrigida. `acertou` existe nas objetivas. */
  resultado?: { pontos: number | null; comentario: string | null; acertou?: boolean };
}

export interface TentativaParticipante {
  id: number;
  avaliacao: { id: number; titulo: string; instrucoes: string | null; tempo_limite_minutos: number | null; tentativas_max: number };
  inscricao_id: number;
  numero: number;
  status: StatusTentativa;
  iniciada_em: string;
  prazo_em: string | null;
  enviada_em: string | null;
  corrigida_em: string | null;
  /** Hora do servidor: o cronômetro usa esta, não o relógio do navegador. */
  servidor_agora: string;
  nota: string | null;
  questoes: TentativaQuestaoParticipante[];
}

export interface RespostaSalva {
  questao_id: number;
  alternativa_id: number | null;
  texto: string | null;
  prazo_em: string | null;
  servidor_agora: string;
}

export interface FilaCorrecaoItem {
  id: number;
  avaliacao: { id: number; titulo: string };
  participante: { id: number; nome: string };
  inscricao_id: number;
  numero: number;
  status: StatusTentativa;
  enviada_em: string | null;
  nota: string | null;
  pendentes: number;
}

export interface TentativaCorrecao {
  id: number;
  avaliacao: { id: number; titulo: string };
  inscricao_id: number;
  turma_id: number;
  participante: { id: number; nome: string; email: string };
  numero: number;
  status: StatusTentativa;
  iniciada_em: string;
  enviada_em: string | null;
  corrigida_em: string | null;
  nota: string | null;
  questoes: {
    questao_id: number;
    ordem: number;
    tipo: TipoQuestao;
    enunciado: string;
    pontuacao: number;
    orientacao_correcao: string | null;
    alternativas: { id: number; texto: string; ordem: number; correta: boolean }[];
    resposta: { alternativa_id: number | null; texto: string | null };
    correcao: { pontos: number | null; comentario: string | null; corrigida_por: number | null; corrigida_em: string | null; pendente: boolean };
  }[];
}

export interface SituacaoLiberacao {
  liberado: boolean;
  /** ISO da liberação prevista; nulo quando já liberado ou aguardando agendamento. */
  prevista_em: string | null;
  aguardando_agendamento: boolean;
}

/** Material na área do participante: o que não foi liberado vem só com título e data prevista. */
export interface ConteudoMaterial extends SituacaoLiberacao {
  id: number;
  tipo: TipoMaterial;
  titulo: string;
  ordem: number;
  aula_id: number | null;
  descricao?: string | null;
  conteudo?: string | null;
  url?: string | null;
  embed_url?: string | null;
  arquivo_nome?: string | null;
  arquivo_tamanho?: number | null;
}

export interface ConteudoTentativa {
  id: number;
  numero: number;
  status: StatusTentativa;
  iniciada_em: string;
  prazo_em: string | null;
  enviada_em: string | null;
  nota: string | null;
}

export interface ConteudoAvaliacao extends SituacaoLiberacao {
  id: number;
  titulo: string;
  peso: number;
  tentativas_max: number;
  tempo_limite_minutos: number | null;
  questoes_total: number;
  instrucoes?: string | null;
  tentativas_usadas: number;
  tentativas_restantes: number;
  melhor_nota: number | null;
  tentativa_em_andamento_id: number | null;
  pode_iniciar: boolean;
  tentativas: ConteudoTentativa[];
}

export interface ConteudoInscricao {
  inscricao_id: number;
  turma_id: number;
  status: StatusInscricao;
  /** Falso em inscrição pendente, em lista de espera ou cancelada: sem materiais nem avaliações. */
  acesso: boolean;
  nota: number | null;
  nota_tipo: 'parcial' | 'final' | null;
  materiais: ConteudoMaterial[];
  avaliacoes: ConteudoAvaliacao[];
}
