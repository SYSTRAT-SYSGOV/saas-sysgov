// Contrato do módulo Cursos e Formações (apps/api/Modules/Cursos).

export type TipoCurso = 'curso' | 'evento';
export type StatusCurso = 'rascunho' | 'publicado' | 'encerrado';
export type StatusTurma = 'aberta' | 'encerrada' | 'cancelada';
export type Modalidade = 'presencial' | 'online' | 'hibrido';
export type StatusInscricao = 'pendente' | 'confirmada' | 'lista_espera' | 'cancelada' | 'concluida' | 'nao_concluida';
export type OrigemPresenca = 'manual' | 'qr_code';
export type SituacaoAula = 'presente' | 'falta' | 'em_andamento' | 'nao_realizada';
export type TipoCertificado = 'curso' | 'formacao';

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
  concluida_em: string | null;
  created_at: string;
}

export interface MinhaInscricao extends Inscricao {
  turma: Turma & { curso: Pick<Curso, 'id' | 'titulo' | 'tipo' | 'carga_horaria_minutos' | 'capa_url'> };
  certificado: { id: number; inscricao_id: number; codigo: string; revogado_em: string | null } | null;
  posicao_fila: number | null;
  frequencia: Frequencia;
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
