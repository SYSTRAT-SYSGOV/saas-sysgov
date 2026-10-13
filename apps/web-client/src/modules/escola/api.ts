import axios from 'axios';
import { apiClient } from '@/core/api/client';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/escola (docs/modules/escola.md)       */
/* ------------------------------------------------------------------ */

export type SituacaoAluno = 'ativo' | 'transferido' | 'remanejado';
export type SituacaoPeriodo = 'agendado' | 'em_andamento' | 'encerrado' | 'arquivo';

export interface Paginado<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface Unidade { id: number; nome: string; tem_logo: boolean }
/** Escola do órgão (várias por prefeitura). */
export interface Escola {
  id: number;
  nome: string;
  inep: string | null;
  ativa: boolean;
  org_unit_id: number | null;
  tem_logo: boolean;
  org_unit?: { id: number; name: string; code: string } | null;
}
export type ModuloEducacao = 'escola' | 'pedagogico' | 'formatura' | 'passeio' | 'portfolio';
export interface Turno { id: number; nome: string; ordem: number; turmas_count?: number }
export interface VinculoMateria { materia_id: number; materia: string | null; professor_user_id: number | null; professor: string | null }
export interface Turma {
  id: number;
  nome: string;
  ano_letivo: number;
  turno: { id: number; nome: string } | null;
  pedagoga?: { id: number; nome: string } | null;
  total_alunos?: number;
  materias?: VinculoMateria[];
}
export interface Contato { telefone: string; descricao: string | null }
export interface Aluno {
  id: number;
  numero: number | null;
  nome: string;
  /** CPF nunca vem completo; com pessoa_id o aluno está ligado ao Cadastro de Pessoas. */
  cpf_mascarado: string | null;
  pessoa_id: number | null;
  cgm: string | null;
  nascimento: string | null;
  mae: string | null;
  pai: string | null;
  situacao: SituacaoAluno;
  tem_foto: boolean;
  turma?: { id: number; nome: string; ano_letivo: number; turno: string | null } | null;
  turma_origem?: { id: number; nome: string } | null;
  contatos?: Contato[];
}
export interface Materia { id: number; nome: string; turmas?: { id: number; nome: string }[] }
export interface Trimestre { id: number; ano_letivo: number; numero: 1 | 2 | 3; data_inicio: string; data_fim: string; situacao: SituacaoPeriodo }
export interface Categoria { id: number; nome: string; cor: string }
export interface Professor { id: number; name: string; email: string }
/** Equipe gestora cadastrada por nome (D17). */
export type CargoEquipe = 'diretor' | 'diretor_auxiliar' | 'secretaria' | 'pedagoga';
export interface MembroEquipe { id: number; nome: string; cargo: CargoEquipe; ordem: number; pessoa_id?: number | null }
/** Pessoa do Cadastro de Pessoas (só o mínimo, para escolher membros da equipe). */
export interface PessoaResumo { id: number; nome: string; cpf_mascarado: string }

export interface DadosAluno {
  nome?: string;
  cpf?: string | null;
  cgm?: string | null;
  numero?: number | null;
  turma_id?: number | null;
  nascimento?: string | null;
  mae?: string | null;
  pai?: string | null;
  situacao?: SituacaoAluno;
  contatos?: Contato[];
}

export interface ResultadoImportacaoAlunos { criados: number; atualizados: number; rejeitadas: { linha: number; motivo: string }[] }
export interface ResultadoImportacaoMaterias { importadas: number; ignoradas: number }

/* ------------------------------------------------------------------ */
/* Erros                                                                */
/* ------------------------------------------------------------------ */

export interface ErroApi { status: number; mensagem: string; campos?: Record<string, string[]> }

/**
 * Normaliza erros da API: regra de negócio (422 {"error"}), validação (422 {"message","errors"}),
 * permissão (403), inexistente (404). A mensagem já vem pronta para exibir ao usuário.
 */
export function erroApi(erro: unknown): ErroApi {
  if (axios.isAxiosError(erro) && erro.response) {
    const { status, data } = erro.response as { status: number; data: Record<string, unknown> | undefined };
    const padrao: Record<number, string> = {
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para esta ação.',
      404: 'Registro não encontrado.',
      429: 'Muitas requisições. Aguarde um minuto.',
    };
    const errors = data?.errors as Record<string, string[]> | undefined;
    const primeiroCampo = errors ? Object.values(errors)[0]?.[0] : undefined;
    const mensagem =
      (typeof data?.error === 'string' && data.error) ||
      primeiroCampo ||
      (status !== 422 && padrao[status]) ||
      (typeof data?.message === 'string' && data.message) ||
      padrao[status] ||
      'Não foi possível concluir a operação.';

    return { status, mensagem, campos: errors };
  }

  return { status: 0, mensagem: 'Falha de comunicação com o servidor.' };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const base = '/escola';
const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> =>
  (await apiClient.post<T>(`${base}${url}`, body, body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async (url: string): Promise<void> => { await apiClient.delete(`${base}${url}`); };

const arquivo = (campo: string, file: File): FormData => {
  const form = new FormData();
  form.append(campo, file);
  return form;
};

/** Baixa um arquivo autenticado e dispara o download no navegador. */
export async function baixarArquivo(url: string, nome: string): Promise<void> {
  const dados = (await apiClient.get<Blob>(url, { responseType: 'blob' })).data;
  const link = URL.createObjectURL(dados);
  const a = document.createElement('a');
  a.href = link;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(link);
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

export const escolaApi = {
  // Escolas do órgão (sem escola de trabalho no cabeçalho — é aqui que ela é escolhida)
  minhasEscolas: async (modulo: ModuloEducacao) => (await get<{ escolas: Escola[] }>('/escolas/minhas', { modulo })).escolas,
  escolas: async () => (await get<{ escolas: Escola[] }>('/escolas')).escolas,
  criarEscola: (dados: { nome: string; inep?: string | null; org_unit_id: number }) => post<Escola>('/escolas', dados),
  atualizarEscola: (id: number, dados: Partial<{ nome: string; inep: string | null; org_unit_id: number; ativa: boolean }>) => put<Escola>(`/escolas/${id}`, dados),
  enviarLogoEscola: (id: number, file: File) => post<Escola>(`/escolas/${id}/logo`, arquivo('logo', file)),
  unidadesOrganograma: async () =>
    (await get<{ unidades: { id: number; name: string; code: string; type: string; level: number }[] }>('/escolas/unidades-organograma')).unidades,

  // Unidade (= escola de trabalho: nome e logo dos relatórios)
  unidade: () => get<Unidade>('/unidade'),
  salvarUnidade: (nome: string) => put<Unidade>('/unidade', { nome }),
  enviarLogo: (file: File) => post<Unidade>('/unidade/logo', arquivo('logo', file)),
  urlLogo: `${base}/unidade/logo`,

  // Turnos
  turnos: () => get<Turno[]>('/turnos'),

  // Turmas e professores
  professores: () => get<Professor[]>('/professores'),
  turmas: (params?: { turno_id?: number; ano_letivo?: number }) => get<Turma[]>('/turmas', params),
  criarTurma: (dados: { nome: string; turno_id: number; ano_letivo: number; pedagoga_id?: number | null }) => post<Turma>('/turmas', dados),
  atualizarTurma: (id: number, dados: Partial<{ nome: string; turno_id: number; ano_letivo: number; pedagoga_id: number | null }>) => put<Turma>(`/turmas/${id}`, dados),
  excluirTurma: (id: number) => del(`/turmas/${id}`),
  duplicarTurma: (id: number) => post<Turma>(`/turmas/${id}/duplicar`),
  vincularMaterias: (id: number, vinculos: { materia_id: number; professor_user_id?: number | null }[]) =>
    put<Turma>(`/turmas/${id}/materias`, { vinculos }),
  limparTurma: (id: number) => post<{ excluidos: number }>(`/turmas/${id}/limpar`, { confirmacao: 'EXCLUIR' }),

  // Alunos
  alunos: (params?: { busca?: string; turma_id?: number; situacao?: SituacaoAluno; per_page?: number; page?: number }) =>
    get<Paginado<Aluno>>('/alunos', params),
  /** Todos os alunos (percorre as páginas de 100 em 100). */
  todosAlunos: async (params?: { turma_id?: number }): Promise<Aluno[]> => {
    const primeira = await get<Paginado<Aluno>>('/alunos', { ...params, per_page: 100, page: 1 });
    const restantes = await Promise.all(
      Array.from({ length: Math.max(0, primeira.meta.last_page - 1) }, (_, i) =>
        get<Paginado<Aluno>>('/alunos', { ...params, per_page: 100, page: i + 2 })),
    );
    return [primeira, ...restantes].flatMap((p) => p.data);
  },
  aluno: (id: number) => get<Aluno>(`/alunos/${id}`),
  criarAluno: (dados: DadosAluno) => post<Aluno>('/alunos', dados),
  atualizarAluno: (id: number, dados: DadosAluno) => put<Aluno>(`/alunos/${id}`, dados),
  excluirAluno: (id: number) => del(`/alunos/${id}`),
  excluirAlunos: (ids: number[]) => post<{ excluidos: number }>('/alunos/excluir', { ids }),
  importarAlunos: (file: File) => post<ResultadoImportacaoAlunos>('/alunos/importar', arquivo('arquivo', file)),
  enviarFoto: (id: number, file: File) => post<Aluno>(`/alunos/${id}/foto`, arquivo('foto', file)),
  urlFoto: (id: number) => `${base}/alunos/${id}/foto`,

  // Matérias
  materias: () => get<Materia[]>('/materias'),
  criarMateria: (nome: string) => post<Materia>('/materias', { nome }),
  atualizarMateria: (id: number, nome: string) => put<Materia>(`/materias/${id}`, { nome }),
  excluirMateria: (id: number) => del(`/materias/${id}`),
  exportarMaterias: () => baixarArquivo(`${base}/materias/exportar`, 'materias_cadastradas.csv'),
  importarMaterias: (file: File) => post<ResultadoImportacaoMaterias>('/materias/importar', arquivo('arquivo', file)),

  // Trimestres
  trimestres: () => get<Trimestre[]>('/trimestres'),
  salvarTrimestre: (dados: { ano_letivo: number; numero: number; data_inicio: string; data_fim: string }, id?: number) =>
    (id ? put<Trimestre>(`/trimestres/${id}`, dados) : post<Trimestre>('/trimestres', dados)),
  excluirTrimestre: (id: number) => del(`/trimestres/${id}`),

  // Categorias de ocorrência
  categorias: () => get<Categoria[]>('/categorias'),
  salvarCategoria: (dados: { nome: string; cor: string }, id?: number) =>
    (id ? put<Categoria>(`/categorias/${id}`, dados) : post<Categoria>('/categorias', dados)),
  excluirCategoria: (id: number) => del(`/categorias/${id}`),

  // Equipe gestora (D17)
  equipe: () => get<MembroEquipe[]>('/equipe'),
  buscarPessoas: (busca: string) => get<PessoaResumo[]>('/pessoas', { busca }),
  salvarMembroEquipe: (id: number | null, dados: { nome?: string; cargo?: CargoEquipe; pessoa_id?: number | null }) =>
    (id ? put<MembroEquipe>(`/equipe/${id}`, dados) : post<MembroEquipe>('/equipe', dados)),
  excluirMembroEquipe: (id: number) => del(`/equipe/${id}`),
};
