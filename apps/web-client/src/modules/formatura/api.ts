import { apiClient } from '@/core/api/client';
import type { SituacaoAluno } from '../escola/api';

export { erroApi } from '../escola/api';

/* ------------------------------------------------------------------ */
/* Tipos — espelham o JSON de api/formatura (docs/modules/formatura.md) */
/* Valores monetários SEMPRE em centavos inteiros.                      */
/* ------------------------------------------------------------------ */

export type TipoCalculo = 'por_pessoa' | 'fixo_mais_convidados';
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'boleto';
export type SituacaoFinanceira = 'quitado' | 'parcial' | 'pendente';

export interface Configuracao {
  id: number;
  ano_letivo: number;
  titulo: string;
  tipo_calculo: TipoCalculo;
  valor_base_centavos: number;
  valor_pessoa_extra_centavos: number;
  convidados_incluidos_padrao: number;
  max_parcelas: number;
  chaves_pix: string[] | null;
  formas_pagamento: FormaPagamento[];
  turmas_ids: number[] | null;
}
export type DadosConfiguracao = Omit<Configuracao, 'id' | 'chaves_pix' | 'turmas_ids'> & { chaves_pix: string[]; turmas_ids: number[] };

export interface Formando {
  aluno_id: number;
  numero: number | null;
  nome: string;
  cgm: string | null;
  turma_id: number | null;
  turma: string | null;
  telefone: string | null;
  /** Situação no Cadastro Escolar: transferido não entra nem paga; remanejado participa na turma atual. */
  situacao_aluno: SituacaoAluno;
  participa: boolean;
  /** Número único de convidados (D16). */
  convidados: number;
  convidados_incluidos: number;
  convidados_extras: number;
  observacoes: string | null;
  valor_devido_centavos: number;
  total_pago_centavos: number;
  saldo_devedor_centavos: number;
  situacao: SituacaoFinanceira;
}
export interface DadosParticipacao {
  participa: boolean;
  convidados?: number;
  convidados_incluidos?: number;
  convidados_extras?: number;
  observacoes?: string | null;
  telefone?: string | null;
}

export interface Pagamento {
  id: number;
  participacao_id: number;
  numero_parcela: number;
  data_pagamento: string;
  valor_centavos: number;
  forma_pagamento: FormaPagamento;
  chave_pix: string | null;
  observacao: string | null;
}
/** `participa: false` = pagamento de quem deixou de participar; não conta no recebido. */
export interface PagamentoDoAno extends Pagamento { aluno_id: number; aluno_nome: string; turma: string | null; participa: boolean }
export interface DadosPagamento {
  ano_letivo: number;
  aluno_id: number;
  numero_parcela: number;
  data_pagamento: string;
  valor_centavos: number;
  forma_pagamento: FormaPagamento;
  chave_pix?: string | null;
  observacao?: string | null;
}

export interface ResumoRelatorio {
  valor_total_receber_centavos: number;
  valor_total_recebido_centavos: number;
  valor_total_pendente_centavos: number;
  percentual_arrecadado: number;
  total_formandos: number;
  total_convidados: number;
  qtd_quitados: number;
  qtd_parciais: number;
  qtd_pendentes: number;
  recebido_periodo_centavos?: number;
}
export interface Relatorio {
  resumo: ResumoRelatorio;
  formas_pagamento: { forma_pagamento: FormaPagamento; total_centavos: number; quantidade: number; percentual: number }[];
  turmas: (Omit<ResumoRelatorio, 'recebido_periodo_centavos'> & { turma: string; alunos: Formando[] })[];
}
export interface Periodo { data_inicio?: string; data_fim?: string }

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

const base = '/formatura';
const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.post<T>(`${base}${url}`, body)).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async (url: string): Promise<void> => { await apiClient.delete(`${base}${url}`); };

export const formaturaApi = {
  configuracao: (ano: number) => get<Configuracao | null>('/configuracao', { ano_letivo: ano }),
  salvarConfiguracao: (dados: DadosConfiguracao) => put<Configuracao>('/configuracao', dados),
  formandos: (ano: number) => get<Formando[]>('/formandos', { ano_letivo: ano }),
  salvarParticipacao: (alunoId: number, ano: number, dados: DadosParticipacao) => put<Formando>(`/formandos/${alunoId}`, { ano_letivo: ano, ...dados }),
  participacaoEmLote: (ano: number, turmaId: number, participa: boolean) =>
    put<Formando[]>('/formandos/participacao-em-lote', { ano_letivo: ano, turma_id: turmaId, participa }),
  pagamentosDoFormando: (alunoId: number, ano: number) => get<Pagamento[]>(`/formandos/${alunoId}/pagamentos`, { ano_letivo: ano }),
  pagamentos: (ano: number, periodo: Periodo = {}) => get<PagamentoDoAno[]>('/pagamentos', { ano_letivo: ano, ...periodo }),
  registrarPagamento: (dados: DadosPagamento) => post<Pagamento>('/pagamentos', dados),
  estornarPagamento: (id: number) => del(`/pagamentos/${id}`),
  relatorio: (ano: number, periodo: Periodo = {}) => get<Relatorio>('/relatorio', { ano_letivo: ano, ...periodo }),
};
