import { apiClient } from '@/core/api/client';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/passeio (valores em centavos)          */
/* ------------------------------------------------------------------ */

export type StatusPasseio = 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
export type SituacaoAluno = 'ativo' | 'transferido' | 'remanejado';

export interface Passeio {
  id: number;
  nome: string;
  data_passeio: string;
  data_limite_autorizacao: string | null;
  horario_saida: string;
  horario_retorno: string | null;
  local_saida: string;
  destino: string;
  cidade: string;
  valor_centavos: number;
  responsavel: string;
  observacoes: string | null;
  status: StatusPasseio;
  created_at?: string;
  inscricoes_count?: number;
  veiculos_count?: number;
}

export type DadosPasseio = Omit<Passeio, 'id' | 'created_at' | 'inscricoes_count' | 'veiculos_count'>;

export interface Inscricao {
  id: number;
  passeio_id: number;
  aluno_id: number;
  vai: boolean;
  autorizacao_entregue: boolean;
  pago: boolean;
  observacao: string | null;
  aluno?: {
    id: number;
    nome: string;
    numero: number | null;
    turma_id: number | null;
    situacao: SituacaoAluno;
    /** Telefone principal do Cadastro Escolar (só leitura). */
    telefone: string | null;
    turma?: { id: number; nome: string } | null;
  } | null;
}

export type AlteracaoInscricao = Partial<Pick<Inscricao, 'vai' | 'autorizacao_entregue' | 'pago' | 'observacao'>>;

export interface Veiculo {
  id: number;
  passeio_id: number;
  identificacao: string;
  placa: string | null;
  motorista: string | null;
  telefone: string | null;
  capacidade: number;
  cor: string | null;
  assentos_count?: number;
}

export type DadosVeiculo = Omit<Veiculo, 'id' | 'passeio_id' | 'assentos_count'>;

export interface AssentoOcupado { numero: number; aluno_id: number; aluno: string | null; turma: string | null }
export interface MapaAssentos { veiculo_id: number; capacidade: number; ocupados: AssentoOcupado[] }

export interface Indicadores {
  total_passeios: number;
  alunos_inscritos: number;
  alunos_que_vao: number;
  autorizacoes_entregues: number;
  autorizacoes_percentual: number;
  arrecadado_centavos: number;
  pendente_centavos: number;
  total_veiculos: number;
  capacidade_total: number;
  assentos_ocupados: number;
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

const base = '/passeio';
const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.post<T>(`${base}${url}`, body)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async (url: string): Promise<void> => { await apiClient.delete(`${base}${url}`); };

export const passeioApi = {
  indicadores: (passeioId?: number) => get<Indicadores>(passeioId ? `/passeios/${passeioId}/indicadores` : '/indicadores'),
  passeios: (status?: StatusPasseio) => get<Passeio[]>('/passeios', status ? { status } : undefined),
  criarPasseio: (dados: DadosPasseio) => post<Passeio>('/passeios', dados),
  atualizarPasseio: (id: number, dados: Partial<DadosPasseio>) => put<Passeio>(`/passeios/${id}`, dados),
  excluirPasseio: (id: number) => del(`/passeios/${id}`),

  inscricoes: (passeioId: number) => get<Inscricao[]>(`/passeios/${passeioId}/inscricoes`),
  inscreverAluno: (passeioId: number, alunoId: number) => post<Inscricao>(`/passeios/${passeioId}/inscricoes`, { aluno_id: alunoId }),
  inscreverTurma: (passeioId: number, turmaId: number) => post<{ criadas: number; ja_inscritos: number }>(`/passeios/${passeioId}/inscricoes`, { turma_id: turmaId }),
  /** Marca ou desmarca "vai" para a turma inteira (transferidos ficam de fora ao marcar). */
  inscricoesEmLote: (passeioId: number, turmaId: number, vai: boolean) => put<{ afetadas: number; criadas: number }>(`/passeios/${passeioId}/inscricoes/lote`, { turma_id: turmaId, vai }),
  atualizarInscricao: (id: number, dados: AlteracaoInscricao) => put<Inscricao>(`/inscricoes/${id}`, dados),
  excluirInscricao: (id: number) => del(`/inscricoes/${id}`),

  veiculos: (passeioId: number) => get<Veiculo[]>(`/passeios/${passeioId}/veiculos`),
  criarVeiculo: (passeioId: number, dados: DadosVeiculo) => post<Veiculo>(`/passeios/${passeioId}/veiculos`, dados),
  atualizarVeiculo: (id: number, dados: Partial<DadosVeiculo>) => put<Veiculo>(`/veiculos/${id}`, dados),
  excluirVeiculo: (id: number) => del(`/veiculos/${id}`),
  assentos: (veiculoId: number) => get<MapaAssentos>(`/veiculos/${veiculoId}/assentos`),
  ocuparAssento: (veiculoId: number, numero: number, alunoId: number) => put(`/veiculos/${veiculoId}/assentos/${numero}`, { aluno_id: alunoId }),
  liberarAssento: (veiculoId: number, numero: number) => del(`/veiculos/${veiculoId}/assentos/${numero}`),
};
