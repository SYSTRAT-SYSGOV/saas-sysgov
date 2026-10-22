import { apiClient } from '@/core/api/client';

/* Tipos — espelham o JSON de api/multiprofissional (Modules/Multiprofissional/Support/Formata.php). */

export interface Ref { id: number; nome: string }
export interface CondicaoRef extends Ref { cid: string | null }

export interface Opcoes {
  escolas: Ref[];
  equipes: Ref[];
  profissionais: Ref[];
  tipos_atendimento: Ref[];
  cargos: Ref[];
  condicoes: CondicaoRef[];
  turnos: { valor: string; rotulo: string }[];
  meu_profissional_id: number | null;
  permissoes: { atender: boolean; acompanhar: boolean; gerenciar: boolean; auditar: boolean };
}

export interface Indicadores { atendimentos_mes: number; atendimentos_ano: number; estudantes_atendidos_mes: number; acompanhados_ativos: number }

export interface Aluno {
  id: number;
  nome: string;
  cgm: string | null;
  nascimento: string | null;
  situacao: string;
  escola: string | null;
  turma: string | null;
}

export interface Atendimento {
  id: number;
  data_hora: string | null;
  turno: string;
  turno_rotulo: string;
  escola: { id: number; nome: string | null };
  equipe: Ref | null;
  sigiloso: boolean;
  relato_visivel: boolean;
  relato: string | null;
  alunos: Ref[];
  profissionais: Ref[];
  tipos: Ref[];
  autor: string | null;
  pode_editar: boolean;
  criado_em: string | null;
}

export interface AtendimentoEntrada {
  data_hora: string;
  turno: string;
  escola_id: number;
  equipe_id: number | null;
  relato: string;
  sigiloso: boolean;
  alunos: number[];
  profissionais: number[];
  tipos: number[];
}

export interface Pagina<T> { data: T[]; current_page: number; last_page: number; total: number }

export interface Laudo {
  id: number;
  descricao: string;
  emitente: string | null;
  emitido_em: string | null;
  condicao: CondicaoRef | null;
  arquivo_nome: string;
  arquivo_mime: string;
  arquivo_tamanho: number;
  enviado_em: string | null;
}

export interface Acompanhado {
  id: number;
  aluno: Aluno | null;
  ativo: boolean;
  profissionais: (Ref & { cargo: string | null; papel: string | null })[];
  /** null = usuário sem acesso aos dados clínicos. */
  condicoes: (CondicaoRef & { diagnosticado_em: string | null })[] | null;
  criado_em: string | null;
  observacoes?: string | null;
  laudos?: Laudo[] | null;
  contatos?: { telefone: string; descricao: string | null }[];
}

export interface AcompanhadoEntrada {
  aluno_id?: number;
  observacoes?: string | null;
  ativo?: boolean;
  profissionais?: { id: number; papel: string | null }[];
  condicoes?: { id: number; diagnosticado_em: string | null }[];
}

export interface Profissional {
  id: number;
  nome: string;
  cpf_mascarado: string;
  cargo: Ref | null;
  registro_profissional: string | null;
  telefone: string | null;
  usuario: { id: number; nome: string; email: string } | null;
  ativo: boolean;
}

export interface ProfissionalEntrada {
  cpf?: string;
  nome?: string;
  cargo_id: number;
  user_id: number | null;
  registro_profissional: string | null;
  telefone: string | null;
  ativo: boolean;
}

export interface Equipe { id: number; nome: string; turno: string | null; ativo: boolean; profissionais: Ref[]; escolas: Ref[] }
export interface EquipeEntrada { nome: string; turno: string | null; ativo: boolean; profissionais: number[]; escolas: number[] }

export type TipoCadastro = 'cargos' | 'condicoes' | 'tipos-atendimento';
export interface ItemCadastro { id: number; nome: string; objetivos?: string | null; cid?: string | null; ativo: boolean }

export interface RegistroAuditoria {
  id: number;
  data: string;
  usuario: string | null;
  acao: string;
  recurso: string;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
}

export interface FiltrosAtendimento { de?: string; ate?: string; escola_id?: number; equipe_id?: number; profissional_id?: number; aluno_id?: number; tipo_id?: number; page?: number }

/** Mensagem de erro da API ({"error"} das regras de negócio ou {"message"} da validação). */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  const dados = (erro as { response?: { data?: unknown } })?.response?.data;
  if (dados && typeof dados === 'object') {
    const d = dados as { error?: string; message?: string };
    if (d.error) return d.error;
    if (d.message) return d.message;
  }
  return padrao;
}

const base = '/multiprofissional';

export const multiApi = {
  opcoes: async () => (await apiClient.get<Opcoes>(`${base}/opcoes`)).data,
  indicadores: async () => (await apiClient.get<Indicadores>(`${base}/indicadores`)).data,
  alunos: async (q: string) => (await apiClient.get<{ data: Aluno[] }>(`${base}/alunos`, { params: { q } })).data.data,
  usuarios: async (q: string) => (await apiClient.get<{ data: { id: number; nome: string; email: string }[] }>(`${base}/usuarios`, { params: { q } })).data.data,

  atendimentos: async (filtros: FiltrosAtendimento = {}) => (await apiClient.get<Pagina<Atendimento>>(`${base}/atendimentos`, { params: filtros })).data,
  salvarAtendimento: async (id: number | null, dados: AtendimentoEntrada) =>
    id ? (await apiClient.put<{ data: Atendimento }>(`${base}/atendimentos/${id}`, dados)).data.data : (await apiClient.post<{ data: Atendimento }>(`${base}/atendimentos`, dados)).data.data,
  excluirAtendimento: async (id: number) => { await apiClient.delete(`${base}/atendimentos/${id}`); },

  acompanhados: async (filtros: { q?: string; escola_id?: number; condicao_id?: number; ativos?: boolean } = {}) =>
    (await apiClient.get<{ data: Acompanhado[] }>(`${base}/acompanhados`, { params: { ...filtros, ativos: filtros.ativos === false ? 0 : 1 } })).data.data,
  acompanhado: async (id: number) => (await apiClient.get<{ data: Acompanhado }>(`${base}/acompanhados/${id}`)).data.data,
  salvarAcompanhado: async (id: number | null, dados: AcompanhadoEntrada) =>
    id ? (await apiClient.put<{ data: { id: number } }>(`${base}/acompanhados/${id}`, dados)).data.data : (await apiClient.post<{ data: { id: number } }>(`${base}/acompanhados`, dados)).data.data,
  anexarLaudo: async (id: number, corpo: FormData) =>
    (await apiClient.post<{ data: Laudo }>(`${base}/acompanhados/${id}/laudos`, corpo, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data,
  arquivoLaudo: async (id: number, laudo: number) => (await apiClient.get<Blob>(`${base}/acompanhados/${id}/laudos/${laudo}`, { responseType: 'blob' })).data,
  removerLaudo: async (id: number, laudo: number) => { await apiClient.delete(`${base}/acompanhados/${id}/laudos/${laudo}`); },

  profissionais: async () => (await apiClient.get<{ data: Profissional[] }>(`${base}/profissionais`)).data.data,
  salvarProfissional: async (id: number | null, dados: ProfissionalEntrada) =>
    id ? (await apiClient.put<{ data: Profissional }>(`${base}/profissionais/${id}`, dados)).data.data : (await apiClient.post<{ data: Profissional }>(`${base}/profissionais`, dados)).data.data,
  excluirProfissional: async (id: number) => (await apiClient.delete<{ excluido: boolean }>(`${base}/profissionais/${id}`)).data.excluido,

  equipes: async () => (await apiClient.get<{ data: Equipe[] }>(`${base}/equipes`)).data.data,
  salvarEquipe: async (id: number | null, dados: EquipeEntrada) =>
    id ? (await apiClient.put<{ data: Equipe }>(`${base}/equipes/${id}`, dados)).data.data : (await apiClient.post<{ data: Equipe }>(`${base}/equipes`, dados)).data.data,
  excluirEquipe: async (id: number) => (await apiClient.delete<{ excluido: boolean }>(`${base}/equipes/${id}`)).data.excluido,

  cadastro: async (tipo: TipoCadastro) => (await apiClient.get<{ data: ItemCadastro[] }>(`${base}/cadastros/${tipo}`)).data.data,
  salvarCadastro: async (tipo: TipoCadastro, item: Partial<ItemCadastro> & { nome: string }) =>
    item.id ? (await apiClient.put(`${base}/cadastros/${tipo}/${item.id}`, item)).data : (await apiClient.post(`${base}/cadastros/${tipo}`, item)).data,
  excluirCadastro: async (tipo: TipoCadastro, id: number) => (await apiClient.delete<{ excluido: boolean }>(`${base}/cadastros/${tipo}/${id}`)).data.excluido,
  carregarPadroes: async () => (await apiClient.post<{ data: { cargos: number; tipos: number } }>(`${base}/cadastros/padroes`)).data.data,

  auditoria: async (params: { acao?: string; page?: number }) =>
    (await apiClient.get<Pagina<RegistroAuditoria>>(`${base}/auditoria`, { params })).data,
};

/** Abre o arquivo (laudo) numa nova aba, a partir do Blob autenticado. */
export function abrirBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** "2026-10-13T09:00" → "13/10/2026 09:00". */
export function dataHora(valor: string | null): string {
  if (!valor) return '—';
  const [d, h] = valor.split('T');
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}${h ? ` ${h.slice(0, 5)}` : ''}`;
}
