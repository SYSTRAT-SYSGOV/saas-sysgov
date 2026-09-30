import axios from 'axios';
import { apiClient } from '@/core/api/client';

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export type TipoVinculo = 'servidor_carreira' | 'estagiario' | 'comissionado' | 'clt' | 'municipe' | 'contribuinte' | 'aluno' | 'paciente';

export const TIPOS_VINCULO: Record<TipoVinculo, string> = {
  servidor_carreira: 'Servidor de carreira',
  estagiario: 'Estagiário',
  comissionado: 'Cargo comissionado',
  clt: 'CLT',
  municipe: 'Munícipe',
  contribuinte: 'Contribuinte',
  aluno: 'Aluno',
  paciente: 'Paciente',
};

export interface PessoaVinculo {
  id: number;
  pessoa_id: number;
  tipo_vinculo: TipoVinculo;
  matricula: string | null;
  inicio: string | null;
  fim: string | null;
}

export interface PessoaDocumento { id: number; tipo: 'rg' | 'cnh' | 'titulo_eleitor'; numero: string; orgao_emissor: string | null; uf_emissao: string | null; data_emissao: string | null }
export interface PessoaEndereco { id: number; cep: string | null; logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null; uf: string | null }
export interface PessoaContato { id: number; tipo: 'celular' | 'email' | 'telefone'; valor: string; principal: boolean; autoriza_notificacoes: boolean }
export interface PessoaUsuarioVinculo { id: number; user_id: number; promovido_em: string }

export interface Pessoa {
  id: number;
  nome: string;
  nome_social: string | null;
  cpf_mascarado: string;
  data_nascimento: string | null;
  sexo: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  estado_civil: string | null;
  nacionalidade: string | null;
  naturalidade: string | null;
  nis: string | null;
  status: 'ativo' | 'inativo';
  vinculos?: PessoaVinculo[];
  documentos?: PessoaDocumento[];
  enderecos?: PessoaEndereco[];
  contatos?: PessoaContato[];
  usuario?: PessoaUsuarioVinculo | null;
}

export interface PessoaIntegracao {
  id: number;
  nome: string;
  driver: string;
  api_url: string | null;
  api_token_mascarado: string | null;
  field_mappings: Record<string, string> | null;
  is_active: boolean;
  ultima_sincronizacao_em: string | null;
}

export type StatusSyncLog = 'sucesso' | 'erro' | 'nao_encontrado';

export interface PessoaSyncLog {
  id: number;
  integracao_id: number | null;
  status: StatusSyncLog;
  registros_processados: number;
  registros_sucesso: number;
  registros_falha: number;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

export const STATUS_SYNC_LOG: Record<StatusSyncLog, string> = {
  sucesso: 'Sucesso',
  erro: 'Falha',
  nao_encontrado: 'Não encontrado',
};

export interface ErroApi { status: number; mensagem: string; codigo?: string; campos?: Record<string, string[]> }

export function erroApi(erro: unknown): ErroApi {
  if (axios.isAxiosError(erro) && erro.response) {
    const { status, data } = erro.response as { status: number; data: Record<string, unknown> };
    const padrao: Record<number, string> = { 403: 'Você não tem permissão para esta ação.', 404: 'Registro não encontrado.', 422: 'Dados inválidos.' };
    const { message, code, errors } = data ?? {};
    return {
      status,
      mensagem: (typeof message === 'string' && message) || padrao[status] || 'Não foi possível concluir a operação.',
      codigo: typeof code === 'string' ? code : undefined,
      campos: errors as Record<string, string[]> | undefined,
    };
  }
  return { status: 0, mensagem: 'Falha de comunicação com o servidor.' };
}

const base = '/pessoas';
const get = async <T,>(url: string, params?: Record<string, unknown>) => (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T,>(url: string, body?: unknown) => (await apiClient.post<T>(`${base}${url}`, body)).data;
const put = async <T,>(url: string, body?: unknown) => (await apiClient.put<T>(`${base}${url}`, body)).data;
const del = async <T,>(url: string) => (await apiClient.delete<T>(`${base}${url}`)).data;

export const pessoasApi = {
  listar: (filtros: Record<string, unknown> = {}) => get<Paginado<Pessoa>>('', filtros),
  obter: (id: number) => get<Pessoa>(`/${id}`),
  criar: (dados: Record<string, unknown>) => post<Pessoa>('', dados),
  atualizar: (id: number, dados: Record<string, unknown>) => put<Pessoa>(`/${id}`, dados),
  excluir: (id: number) => del<{ deleted: boolean }>(`/${id}`),
  adicionarVinculo: (pessoaId: number, dados: { tipo_vinculo: TipoVinculo; matricula?: string; inicio?: string }) => post<PessoaVinculo>(`/${pessoaId}/vinculos`, dados),
  encerrarVinculo: (pessoaId: number, vinculoId: number, fim?: string) => post<PessoaVinculo>(`/${pessoaId}/vinculos/${vinculoId}/encerrar`, fim ? { fim } : {}),
  adicionarDocumento: (pessoaId: number, dados: { tipo: PessoaDocumento['tipo']; numero: string; orgao_emissor?: string; uf_emissao?: string; data_emissao?: string }) => post<PessoaDocumento>(`/${pessoaId}/documentos`, dados),
  adicionarEndereco: (pessoaId: number, dados: Partial<PessoaEndereco>) => post<PessoaEndereco>(`/${pessoaId}/enderecos`, dados),
  adicionarContato: (pessoaId: number, dados: { tipo: PessoaContato['tipo']; valor: string; principal?: boolean; autoriza_notificacoes?: boolean }) => post<PessoaContato>(`/${pessoaId}/contatos`, dados),
  promover: (pessoaId: number, dados: { email: string; role_id: number }) => post<PessoaUsuarioVinculo>(`/${pessoaId}/promover`, dados),
  importar: (documento: string) => post<{ message: string }>('/importacoes', { documento }),
  exportarCsv: async () => {
    const resposta = await apiClient.get(`${base}/export`, { params: { format: 'csv' }, responseType: 'blob' });
    const url = URL.createObjectURL(resposta.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pessoas.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
  listarIntegracoes: () => get<PessoaIntegracao[]>('/integracoes'),
  criarIntegracao: (dados: Record<string, unknown>) => post<PessoaIntegracao>('/integracoes', dados),
  atualizarIntegracao: (id: number, dados: Record<string, unknown>) => put<PessoaIntegracao>(`/integracoes/${id}`, dados),
  listarSyncLogs: (filtros: Record<string, unknown> = {}) => get<Paginado<PessoaSyncLog>>('/sync-logs', filtros),
  reprocessarSyncLog: (id: number) => post<{ message: string }>(`/sync-logs/${id}/reprocessar`),
};
