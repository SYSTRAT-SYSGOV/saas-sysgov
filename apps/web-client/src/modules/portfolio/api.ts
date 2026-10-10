import { apiClient } from '@/core/api/client';

/* Tipos — espelham o JSON de api/portfolio (avaliação de 0 a 10 com uma casa). */

export interface TurmaPortfolio { id: number; nome: string; ano_letivo: number; alunos: number }
export interface AlunoPortfolio { id: number; nome: string; numero: number | null; situacao: 'ativo' | 'transferido' | 'remanejado'; total_trabalhos: number; media: number | null }
export interface MateriaPortfolio { id: number; nome: string }
export interface MateriasDaTurma { materias: MateriaPortfolio[]; sem_vinculos: boolean }
export interface ImagemTrabalho { id: number; nome: string; url: string }
export interface Trabalho {
  id: number;
  aluno_id: number;
  turma: { id: number; nome: string | null };
  materia: { id: number; nome: string | null };
  ano_letivo: number;
  trimestre: number | null;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  data: string;
  avaliacao: number;
  autor: { id: number; nome: string | null };
  imagens: ImagemTrabalho[];
  pode_editar: boolean;
  created_at: string | null;
}
export interface DadosTrabalho { titulo: string; materia_id: number; data: string; avaliacao: number; descricao: string | null; observacoes: string | null }
export interface Desempenho {
  total: number;
  media: number | null;
  por_materia: { materia_id: number; materia: string | null; quantidade: number; media: number | null }[];
  por_trimestre: { trimestre: number; quantidade: number; media: number | null }[] | null;
}
export interface Periodo { ano: number; trimestre: number | null }

const base = '/portfolio';
const params = (p: Periodo): Record<string, number> => (p.trimestre ? { ano: p.ano, trimestre: p.trimestre } : { ano: p.ano });
const get = async <T,>(url: string, query?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params: query })).data;

export const portfolioApi = {
  turmas: async (ano: number) => (await get<{ turmas: TurmaPortfolio[] }>('/turmas', { ano })).turmas,
  alunos: async (turmaId: number, periodo: Periodo) => (await get<{ alunos: AlunoPortfolio[] }>(`/turmas/${turmaId}/alunos`, params(periodo))).alunos,
  /** Matérias em que o usuário pode lançar; `sem_vinculos` = a turma não tem nenhuma matéria no Cadastro Escolar. */
  materias: (turmaId: number) => get<MateriasDaTurma>(`/turmas/${turmaId}/materias`),
  trabalhos: async (alunoId: number, periodo: Periodo) => (await get<{ data: Trabalho[] }>(`/alunos/${alunoId}/trabalhos`, params(periodo))).data,
  desempenho: (alunoId: number, periodo: Periodo) => get<Desempenho>(`/alunos/${alunoId}/desempenho`, params(periodo)),
  criar: async (alunoId: number, dados: DadosTrabalho) => (await apiClient.post<{ data: Trabalho }>(`${base}/alunos/${alunoId}/trabalhos`, dados)).data.data,
  atualizar: async (id: number, dados: Partial<DadosTrabalho>) => (await apiClient.put<{ data: Trabalho }>(`${base}/trabalhos/${id}`, dados)).data.data,
  excluir: async (id: number): Promise<void> => { await apiClient.delete(`${base}/trabalhos/${id}`); },
  enviarImagem: async (trabalhoId: number, arquivo: Blob, nome: string) => {
    const form = new FormData();
    form.append('imagem', arquivo, nome);
    // O apiClient fixa Content-Type JSON: sem anular aqui, o axios serializa o FormData em JSON e o arquivo
    // some (o servidor responde "imagem obrigatória"). Sem o header, o navegador põe multipart + boundary.
    return (await apiClient.post<{ data: ImagemTrabalho }>(`${base}/trabalhos/${trabalhoId}/imagens`, form, {
      headers: { 'Content-Type': undefined },
    })).data.data;
  },
  excluirImagem: async (trabalhoId: number, imagemId: number): Promise<void> => { await apiClient.delete(`${base}/trabalhos/${trabalhoId}/imagens/${imagemId}`); },
  relatorio: async (alunoId: number, periodo: Periodo) => (await apiClient.get<Blob>(`${base}/alunos/${alunoId}/relatorio`, { params: params(periodo), responseType: 'blob' })).data,
};
