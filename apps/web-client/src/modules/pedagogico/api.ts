import { apiClient } from '@/core/api/client';

import type { Aluno } from '../escola/api';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/pedagogico (docs/modules/pedagogico.md) */
/* ------------------------------------------------------------------ */

export type Severidade = 'baixa' | 'media' | 'alta' | 'critica';
export type NivelAtencao = 'baixo' | 'medio' | 'alto';
export type Presenca = 'presente' | 'falta' | 'falta_justificada';
export type StatusAta = 'rascunho' | 'finalizada' | 'arquivada';

export interface MinhaTurma { turma_id: number; turma: string; turno: string | null; ano_letivo: number; materia_id: number; materia: string }
export interface TurmaVisivel { id: number; nome: string; ano_letivo: number; turno: string | null; total_alunos: number }

export interface Nota {
  id: number;
  aluno_id: number;
  materia_id: number;
  ano_letivo: number;
  trimestre: 1 | 2 | 3;
  nota: string;
  nota_recuperacao: string | null;
  materia?: { id: number; nome: string };
}

export interface Ocorrencia {
  id: number;
  aluno_id: number;
  categoria_id: number;
  data: string;
  descricao: string;
  severidade: Severidade;
  responsavel: string | null;
  anexo_nome: string | null;
  registrado_por: number | null;
  categoria?: { id: number; nome: string; cor: string } | null;
  aluno?: { id: number; nome: string; numero: number | null; turma_id: number | null } | null;
  autor?: { id: number; name: string } | null;
}

export interface PreConselhoAluno {
  aluno_id: number;
  nivel_atencao: NivelAtencao;
  dificuldade: string | null;
  encaminhamentos: string | null;
  destaque: boolean;
  aluno?: { id: number; nome: string; numero: number | null; situacao: string } | null;
}

export interface PreConselho {
  id: number;
  turma_id: number;
  materia_id: number;
  ano_letivo: number;
  periodo: 1 | 2 | 3;
  data_registro: string;
  desempenho_geral: 'excelente' | 'bom' | 'regular' | 'insatisfatorio';
  desempenho_justificativa: string | null;
  conteudos_trabalhados: string | null;
  objetivos_atingidos: 'totalmente' | 'parcialmente' | 'nao_atingidos' | null;
  metodologias: string[] | null;
  metodologias_outras: string | null;
  metodologias_eficacia: string | null;
  instrumentos_avaliativos: string[] | null;
  instrumentos_adequados: 'sim' | 'parcialmente' | 'nao' | null;
  instrumentos_outros: string | null;
  instrumentos_obs: string | null;
  engajamento_nivel: 'alta' | 'moderada' | 'baixa' | null;
  engajamento_dificuldades: string | null;
  engajamento_potencialidades: string | null;
  dificuldades_aprendizagem: string | null;
  estrategias_superacao: string | null;
  socioemocional_status: 'adequado' | 'necessita_atencao' | 'critico' | null;
  socioemocional_descricao: string | null;
  obs_pedagogicas: string | null;
  created_at?: string;
  alunos?: PreConselhoAluno[];
  alunos_count?: number;
  turma?: { id: number; nome: string } | null;
  materia?: { id: number; nome: string } | null;
}

export type DadosPreConselho = Omit<PreConselho, 'id' | 'created_at' | 'alunos' | 'alunos_count' | 'turma' | 'materia'> & {
  alunos: Omit<PreConselhoAluno, 'aluno'>[];
};

export interface Cronograma { id: number; ano_letivo: number; periodo: 1 | 2 | 3; data_inicio: string; data_fim: string; situacao: 'agendado' | 'ativo' | 'encerrado' | 'arquivo' }

export interface Ata {
  id: number;
  turma_id: number;
  ano_letivo: number;
  periodo: 1 | 2 | 3;
  data_reuniao: string;
  direcao: string | null;
  pedagogia: string | null;
  secretaria: string | null;
  texto_introducao: string | null;
  texto_conclusao: string | null;
  deliberacoes: string | null;
  assinaturas: Record<string, string> | null;
  aprovados: number;
  recuperacao: number;
  retidos: number;
  status: StatusAta;
  updated_at?: string;
  turma?: { id: number; nome: string } | null;
}

export type DadosAta = Partial<Omit<Ata, 'id' | 'status' | 'turma' | 'updated_at'>>;

export interface Frequencia { id: number; turma_id: number; aluno_id: number; data: string; presenca: Presenca; aulas: number; observacao: string | null }
export interface TotalFaltas { aluno_id: number; faltas: number; justificadas: number }
export interface MediaAluno { aluno_id: number; media: number }

export interface ResultadoImportacaoNotas { importadas: number; rejeitadas: { linha: number; motivo: string }[] }

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const base = '/pedagogico';
const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> =>
  (await apiClient.post<T>(`${base}${url}`, body, body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async (url: string): Promise<void> => { await apiClient.delete(`${base}${url}`); };

/** Ocorrência com anexo vai em multipart; o PUT com arquivo usa _method (o PHP não lê multipart em PUT). */
function formOcorrencia(dados: Record<string, unknown>, anexo?: File | null, metodo?: 'PUT'): FormData | Record<string, unknown> {
  if (!anexo) return dados;
  const form = new FormData();
  Object.entries(dados).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null) form.append(chave, String(valor));
  });
  form.append('anexo', anexo);
  if (metodo) form.append('_method', metodo);
  return form;
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

export const pedagogicoApi = {
  // Turmas
  minhasTurmas: () => get<MinhaTurma[]>('/minhas-turmas'),
  turmas: () => get<TurmaVisivel[]>('/turmas'),
  alunosDaTurma: (turmaId: number) => get<Aluno[]>(`/turmas/${turmaId}/alunos`),

  // Notas
  notas: (params: { turma_id: number; materia_id: number; ano_letivo: number; trimestre?: number }) => get<Nota[]>('/notas', params),
  lancarNotas: (dados: { turma_id: number; materia_id: number; ano_letivo: number; trimestre: number; notas: { aluno_id: number; nota: number; nota_recuperacao?: number | null }[] }) =>
    put<Nota[]>('/notas', dados),
  importarNotas: (file: File, anoLetivo: number) => {
    const form = new FormData();
    form.append('arquivo', file);
    form.append('ano_letivo', String(anoLetivo));
    return post<ResultadoImportacaoNotas>('/notas/importar', form);
  },
  /** Média anual de cada aluno visível (maior entre nota e recuperação, truncada em uma casa). */
  medias: (anoLetivo: number) => get<MediaAluno[]>('/notas/medias', { ano_letivo: anoLetivo }),
  boletim: (alunoId: number, anoLetivo: number) => get<Nota[]>(`/alunos/${alunoId}/notas`, { ano_letivo: anoLetivo }),

  // Ocorrências
  ocorrencias: (params?: { aluno_id?: number; turma_id?: number; categoria_id?: number; per_page?: number; page?: number }) =>
    get<{ data: Ocorrencia[]; current_page: number; last_page: number; total: number }>('/ocorrencias', params),
  /** Todas as ocorrências visíveis (percorre as páginas). */
  todasOcorrencias: async (params?: { aluno_id?: number; turma_id?: number }): Promise<Ocorrencia[]> => {
    type Pagina = { data: Ocorrencia[]; last_page: number };
    const primeira = await get<Pagina>('/ocorrencias', { ...params, per_page: 100, page: 1 });
    const restantes = await Promise.all(
      Array.from({ length: Math.max(0, primeira.last_page - 1) }, (_, i) => get<Pagina>('/ocorrencias', { ...params, per_page: 100, page: i + 2 })),
    );
    return [primeira, ...restantes].flatMap((p) => p.data);
  },
  totaisOcorrencias: (turmaId?: number) => get<{ aluno_id: number; total: number }[]>('/ocorrencias/totais', turmaId ? { turma_id: turmaId } : undefined),
  registrarOcorrencia: (dados: { aluno_id: number; categoria_id: number; data: string; descricao: string; severidade: Severidade; responsavel?: string | null }, anexo?: File | null) =>
    post<Ocorrencia>('/ocorrencias', formOcorrencia(dados, anexo)),
  atualizarOcorrencia: (id: number, dados: Partial<{ categoria_id: number; data: string; descricao: string; severidade: Severidade; responsavel: string | null }>, anexo?: File | null) =>
    (anexo ? post<Ocorrencia>(`/ocorrencias/${id}`, formOcorrencia(dados, anexo, 'PUT')) : put<Ocorrencia>(`/ocorrencias/${id}`, dados)),
  excluirOcorrencia: (id: number) => del(`/ocorrencias/${id}`),
  urlAnexo: (id: number) => `${base}/ocorrencias/${id}/anexo`,

  // Pré-conselho
  preConselhos: (params?: { turma_id?: number; materia_id?: number; ano_letivo?: number; periodo?: number }) => get<PreConselho[]>('/pre-conselhos', params),
  preConselho: (id: number) => get<PreConselho>(`/pre-conselhos/${id}`),
  salvarPreConselho: (dados: DadosPreConselho) => put<PreConselho>('/pre-conselhos', dados),
  excluirPreConselho: (id: number) => del(`/pre-conselhos/${id}`),
  progresso: (anoLetivo: number, periodo: number) => get<{ turma_id: number; entregues: number; total: number }[]>('/pre-conselhos/progresso', { ano_letivo: anoLetivo, periodo }),

  // Cronograma
  cronogramas: () => get<Cronograma[]>('/cronogramas'),
  cronogramaVigente: () => get<Cronograma | null>('/cronogramas/vigente'),
  salvarCronograma: (dados: { ano_letivo: number; periodo: number; data_inicio: string; data_fim: string }, id?: number) =>
    (id ? put<Cronograma>(`/cronogramas/${id}`, dados) : post<Cronograma>('/cronogramas', dados)),
  excluirCronograma: (id: number) => del(`/cronogramas/${id}`),

  // Atas
  atas: (params?: { turma_id?: number; ano_letivo?: number; status?: StatusAta }) => get<Ata[]>('/atas', params),
  ata: (id: number) => get<Ata>(`/atas/${id}`),
  criarAta: (dados: DadosAta) => post<Ata>('/atas', dados),
  atualizarAta: (id: number, dados: DadosAta) => put<Ata>(`/atas/${id}`, dados),
  finalizarAta: (id: number) => post<Ata>(`/atas/${id}/finalizar`),
  arquivarAta: (id: number) => post<Ata>(`/atas/${id}/arquivar`),
  excluirAta: (id: number) => del(`/atas/${id}`),

  // Frequência
  frequencias: (turmaId: number, data: string) => get<Frequencia[]>('/frequencias', { turma_id: turmaId, data }),
  frequenciasPeriodo: (turmaId: number, dataInicio: string, dataFim: string) =>
    get<Frequencia[]>('/frequencias', { turma_id: turmaId, data_inicio: dataInicio, data_fim: dataFim }),
  /** Faltas por aluno no período: soma das aulas dos dias com falta; justificadas contadas à parte. */
  totaisFaltas: (dataInicio: string, dataFim: string, turmaId?: number) =>
    get<TotalFaltas[]>('/frequencias/totais', { data_inicio: dataInicio, data_fim: dataFim, ...(turmaId ? { turma_id: turmaId } : {}) }),
  registrarFrequencia: (dados: { turma_id: number; data: string; aulas?: number; registros: { aluno_id: number; presenca: Presenca; observacao?: string | null }[] }) =>
    put<{ registrados: number }>('/frequencias', dados),
};
