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
  /** Endereço curto, único no órgão — identifica o curso na página pública (design D11). */
  slug: string | null;
  descricao: string | null;
  /** Texto de divulgação da página pública, sanitizado no servidor (design D11). */
  texto_publico: string | null;
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
  /** Gerado do título quando ausente; único no órgão (design D11). */
  slug?: string | null;
  descricao?: string | null;
  texto_publico?: string | null;
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
  /** Abre a turma à inscrição pública de participantes externos (design D11, padrão falso). */
  aceita_externos: boolean;
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
  aceita_externos?: boolean;
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

export type OrigemParticipante = 'servidor' | 'externo';

export interface InscritoTurma {
  id: number;
  participante_id: number;
  nome: string;
  email: string;
  origem: OrigemParticipante;
  origem_label: string;
  status: StatusInscricao;
  status_label: string;
  inscrito_em: string;
  posicao_fila: number | null;
  frequencia: Frequencia;
  nota: number | null;
  /** Respostas do formulário de inscrição (design D9), por campo_id. */
  respostas: Record<number, string>;
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

// ---------------------------------------------------------------- relatórios

export interface ResumoRelatorioTurma {
  por_situacao: Record<StatusInscricao, number>;
  vagas_ocupadas: number;
  vagas: number;
  frequencia_media: number | null;
  nota_media: number | null;
  taxa_conclusao: number | null;
  certificados_emitidos: number;
}

export interface InscritoRelatorioTurma extends InscritoTurma {
  resultado: string;
}

export interface RelatorioTurma {
  resumo: ResumoRelatorioTurma;
  inscritos: InscritoRelatorioTurma[];
}

export interface TurmaDetalheRelatorioCursos {
  turma_id: number;
  turma_nome: string;
  turma_status: StatusTurma;
  inscricoes: number;
  concluidos: number;
  nao_concluidos: number;
  taxa_conclusao: number | null;
  frequencia_media: number | null;
  nota_media: number | null;
  certificados_emitidos: number;
}

export interface CursoRelatorio {
  curso_id: number;
  titulo: string;
  tipo: TipoCurso;
  turmas: number;
  inscricoes: number;
  concluidos: number;
  nao_concluidos: number;
  taxa_conclusao: number | null;
  frequencia_media: number | null;
  nota_media: number | null;
  certificados_emitidos: number;
  horas_certificadas_minutos: number;
  turmas_detalhe: TurmaDetalheRelatorioCursos[];
}

export interface TotaisRelatorioCursos {
  turmas: number;
  inscricoes: number;
  concluidos: number;
  nao_concluidos: number;
  taxa_conclusao: number | null;
  frequencia_media: number | null;
  nota_media: number | null;
  horas_certificadas_minutos: number;
  certificados_emitidos: number;
}

export interface RelatorioCursos {
  cursos: CursoRelatorio[];
  totais: TotaisRelatorioCursos;
}

export interface RelatorioCursosFiltros {
  inicio: string;
  fim: string;
  tipo?: TipoCurso;
  curso_id?: number;
}

export type OrdenacaoCapacitacao = 'nome' | 'horas' | 'ultima_conclusao';

export interface RelatorioCapacitacaoFiltros {
  inicio?: string;
  fim?: string;
  curso_id?: number;
  unidade_id?: number;
  ordenar_por?: OrdenacaoCapacitacao;
  direcao?: 'asc' | 'desc';
  por_pagina?: number;
  pagina?: number;
}

export interface CapacitacaoServidor {
  participante_id: number;
  nome: string;
  email: string;
  cursos_concluidos: number;
  horas_capacitacao_minutos: number;
  cursos_em_andamento: number;
  ultima_conclusao: string | null;
  unidades: string[];
}

export interface CapacitacaoCursoConcluido {
  curso_titulo: string;
  carga_horaria_minutos: number;
  concluida_em: string;
  certificado_codigo: string | null;
  certificado_valido: boolean;
}

export interface CapacitacaoServidorDetalhe {
  participante_id: number;
  nome: string;
  email: string;
  cursos: CapacitacaoCursoConcluido[];
}

export interface UnidadeRelatorio {
  id: number;
  nome: string;
  path: string;
}

// ---------------------------------------------------------------- Fase 3: inscrição pública e e-mail

export interface IdentidadeOrgao {
  titulo: string;
  cor_primaria: string | null;
  logo_url: string | null;
  /** White-label: esconde a assinatura "Portal SYSGOV — SYSTRAT" no rodapé quando true. */
  assinatura_oculta: boolean;
}

/** Casca da página pública do órgão (design D7) — GET /public/cursos/{orgao}. */
export interface PaginaOrgao {
  nome: string;
  slug: string;
  boas_vindas: string | null;
  /** Termo de uso configurado em `/configuracao-publica` (D10); null = órgão não configurou nenhum. */
  termo_texto: string | null;
  /** Se o cadastro externo exige CPF (D11, `ConfiguracaoPublicaTab`). */
  documento_obrigatorio: boolean;
  identidade: IdentidadeOrgao;
}

/** Curso na oferta pública (design D7) — só sai se tiver turma aberta a externos. */
export interface CatalogoPublicoCurso {
  slug: string;
  tipo: TipoCurso;
  titulo: string;
  carga_horaria_minutos: number;
  capa_url: string | null;
}

export interface TurmaPublica {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  modalidade: Modalidade;
  local: string | null;
  /** Nunca a capacidade total (`vagas`) — só o que sobra, informação de gestão fica de fora (D7). */
  vagas_restantes: number;
}

export interface CursoPublicoDetalhe extends CatalogoPublicoCurso {
  descricao: string | null;
  texto_publico: string | null;
  turmas: TurmaPublica[];
}

export interface CadastroExternoInput {
  nome: string;
  email: string;
  senha: string;
  senha_confirmation: string;
  documento?: string | null;
  aceite: boolean;
  /** Campo isca oculto por CSS (design D8) — nunca preencher de verdade; só bot preenche. */
  website?: string;
}

export interface MensagemResposta {
  mensagem: string;
}

// -------------------------------------------------- formulário de inscrição configurável (D9)

export type TipoCampoInscricao = 'texto' | 'texto_longo' | 'numero' | 'data' | 'selecao' | 'caixa_marcacao';

export interface CampoInscricao {
  id: number;
  curso_id: number;
  rotulo: string;
  tipo: TipoCampoInscricao;
  obrigatorio: boolean;
  /** Só preenchido (e obrigatório) no tipo `selecao`. */
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
}

export interface CampoInscricaoInput {
  rotulo: string;
  tipo: TipoCampoInscricao;
  obrigatorio?: boolean;
  opcoes?: string[] | null;
  ordem?: number;
}

export interface RespostaInscricaoInput {
  campo_id: number;
  valor: string | number | null;
}

/** Resposta como veio gravada — `rotulo`/`tipo` são o snapshot do campo no momento da resposta (D9). */
export interface RespostaInscricao {
  id: number;
  campo_id: number;
  rotulo: string;
  tipo: TipoCampoInscricao;
  valor: string | null;
}

// -------------------------------------------------- configuração da página pública (D10/D11)

export interface ConfiguracaoPublica {
  publico_habilitado: boolean;
  boas_vindas: string | null;
  termo: { texto: string | null; versao: number };
  documento_obrigatorio: boolean;
}

export interface ConfiguracaoPublicaInput {
  publico_habilitado?: boolean;
  boas_vindas?: string | null;
  documento_obrigatorio?: boolean;
  termo?: { texto: string | null };
}

// -------------------------------------------------- envios de e-mail (Fase 1, tarefa 1.8)

export type SituacaoEnvio = 'pendente' | 'enviado' | 'falhou' | 'ignorado';

export interface Envio {
  id: number;
  tipo: string;
  destinatario: string | null;
  situacao: SituacaoEnvio;
  tentativas: number;
  erro: string | null;
  enviado_em: string | null;
  criado_em: string;
}

export interface EnvioFiltros {
  situacao?: SituacaoEnvio;
  por_pagina?: number;
  pagina?: number;
}
