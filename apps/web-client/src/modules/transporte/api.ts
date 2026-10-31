import { apiClient } from '@/core/api/client';

/* Tipos — espelham o JSON de api/transporte (Modules/Transporte/Support/Formata.php). */

export interface Ref { id: number; nome: string }
export interface OpcaoTexto { valor: string; rotulo: string }
export interface OpcaoOrigem extends OpcaoTexto { tipo_empresa: string | null }

export interface Opcoes {
  tipos_empresa: OpcaoTexto[];
  origens: OpcaoOrigem[];
  tipos_rede: OpcaoTexto[];
  turnos: OpcaoTexto[];
  escolas: Ref[];
  anos_letivos: number[];
  veiculos: { id: number; placa: string; descricao: string }[];
  categorias_cnh: string[];
  tipologias: { valor: number; rotulo: string }[];
  empresas: (Ref & { tipo: string })[];
  motoristas: Ref[];
  permissoes: { gerenciar_frota: boolean; gerenciar_rotas: boolean; auditar: boolean };
}

export interface Empresa {
  id: number;
  pessoa_id: number;
  nome: string;
  nome_fantasia: string | null;
  cnpj_mascarado: string | null;
  tipo: string;
  tipo_rotulo: string;
  contrato_numero: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  contrato_vencido: boolean;
  ativa: boolean;
  observacoes: string | null;
}

export interface EmpresaEntrada {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  tipo: string;
  contrato_numero: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  ativa: boolean;
  observacoes: string | null;
}

export interface Motorista {
  id: number;
  pessoa_id: number;
  nome: string;
  cpf_mascarado: string | null;
  empresa: Ref | null;
  cnh_numero: string;
  cnh_categoria: string;
  cnh_primeira_habilitacao: string | null;
  cnh_validade: string;
  curso_certificado: string | null;
  curso_validade: string | null;
  toxicologico_data: string | null;
  toxicologico_validade: string | null;
  ativo: boolean;
  elegivel: boolean;
  motivos_inelegibilidade: string[];
  observacoes: string | null;
}

export interface MotoristaEntrada {
  cpf?: string;
  nome?: string;
  data_nascimento?: string | null;
  empresa_id: number | null;
  cnh_numero: string;
  cnh_categoria: string;
  cnh_primeira_habilitacao: string | null;
  cnh_validade: string;
  curso_certificado: string | null;
  curso_validade: string | null;
  toxicologico_data: string | null;
  toxicologico_validade: string | null;
  ativo: boolean;
  observacoes: string | null;
}

export interface Veiculo {
  id: number;
  origem: string;
  origem_rotulo: string;
  empresa: Ref | null;
  motorista_padrao: Ref | null;
  descricao: string;
  placa: string;
  renavam: string | null;
  chassi: string | null;
  marca_modelo: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  data_licenca: string | null;
  capacidade: number;
  tipo_rede: string;
  tipologia_inep: number;
  tipologia_rotulo: string | null;
  uso_exclusivo: boolean;
  acessivel: boolean;
  ativo: boolean;
  motivo_inativacao: string | null;
  vistoria_validade: string | null;
  regular: boolean;
  motivos_irregularidade: string[];
  observacoes: string | null;
}

export interface VeiculoEntrada {
  origem: string;
  empresa_id: number | null;
  motorista_padrao_id: number | null;
  descricao: string;
  placa: string;
  renavam: string | null;
  chassi: string | null;
  marca_modelo: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  data_licenca: string | null;
  capacidade: number;
  tipo_rede: string;
  tipologia_inep: number;
  uso_exclusivo: boolean;
  acessivel: boolean;
  ativo: boolean;
  motivo_inativacao: string | null;
  observacoes: string | null;
}

export interface Vistoria {
  id: number;
  veiculo_id: number;
  data_vistoria: string;
  certificado: string;
  validade: string;
  vigente: boolean;
  observacoes: string | null;
}

export interface VistoriaEntrada { data_vistoria: string; certificado: string; validade: string; observacoes: string | null }

export interface Alerta {
  tipo: 'cnh' | 'curso' | 'toxicologico' | 'vistoria' | 'contrato';
  gravidade: 'critico' | 'atencao';
  item_tipo: 'motorista' | 'veiculo' | 'empresa';
  item_id: number;
  item: string;
  data: string;
  dias: number;
}

export interface Alertas { data: Alerta[]; resumo: { criticos: number; atencao: number } }

export interface RegistroAuditoria {
  id: number;
  data: string;
  usuario: string | null;
  acao: string;
  recurso: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  ip: string | null;
}

export interface Parada {
  id: number;
  nome: string;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  tem_coordenadas: boolean;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  referencia: string | null;
  ativa: boolean;
}

export type ParadaEntrada = Omit<Parada, 'id' | 'tem_coordenadas'>;

export interface Rota {
  id: number;
  nome: string;
  escola: Ref | null;
  ano_letivo: number;
  turno: string;
  turno_rotulo: string;
  tipo_rede: string;
  empresa: Ref | null;
  veiculo: { id: number; placa: string; descricao: string } | null;
  motorista: Ref | null;
  km_pavimentado: number;
  km_nao_pavimentado: number;
  km_total: number;
  horario_saida: string | null;
  horario_chegada: string | null;
  horario_retorno: string | null;
  ativa: boolean;
  paradas_count: number | null;
  regular: boolean;
  motivos_irregularidade: string[];
  observacoes: string | null;
}

export interface RotaEntrada {
  escola_id: number;
  ano_letivo: number;
  empresa_id: number | null;
  veiculo_id: number | null;
  motorista_id: number | null;
  nome: string;
  turno: string;
  tipo_rede: string;
  km_pavimentado: number;
  km_nao_pavimentado: number;
  horario_saida: string | null;
  horario_chegada: string | null;
  horario_retorno: string | null;
  ativa: boolean;
  observacoes: string | null;
}

export interface FiltrosRota { ano_letivo?: number; escola_id?: number; turno?: string; tipo_rede?: string; situacao?: string; q?: string; page?: number }

export interface ItemItinerario {
  ordem: number;
  embarque_previsto: string | null;
  desembarque_previsto: string | null;
  parada: Parada;
}

export interface Pagina<T> { data: T[]; current_page: number; last_page: number; total: number }

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

const base = '/transporte';

export const transporteApi = {
  opcoes: async () => (await apiClient.get<{ data: Opcoes }>(`${base}/opcoes`)).data.data,
  alertas: async () => (await apiClient.get<Alertas>(`${base}/alertas`)).data,

  empresas: async () => (await apiClient.get<{ data: Empresa[] }>(`${base}/empresas`)).data.data,
  salvarEmpresa: async (id: number | null, dados: EmpresaEntrada) =>
    id ? (await apiClient.put<{ data: Empresa }>(`${base}/empresas/${id}`, dados)).data.data : (await apiClient.post<{ data: Empresa }>(`${base}/empresas`, dados)).data.data,
  excluirEmpresa: async (id: number) => { await apiClient.delete(`${base}/empresas/${id}`); },

  motoristas: async () => (await apiClient.get<{ data: Motorista[] }>(`${base}/motoristas`)).data.data,
  salvarMotorista: async (id: number | null, dados: MotoristaEntrada) =>
    id ? (await apiClient.put<{ data: Motorista }>(`${base}/motoristas/${id}`, dados)).data.data : (await apiClient.post<{ data: Motorista }>(`${base}/motoristas`, dados)).data.data,
  excluirMotorista: async (id: number) => { await apiClient.delete(`${base}/motoristas/${id}`); },

  veiculos: async () => (await apiClient.get<{ data: Veiculo[] }>(`${base}/veiculos`)).data.data,
  salvarVeiculo: async (id: number | null, dados: VeiculoEntrada) =>
    id ? (await apiClient.put<{ data: Veiculo }>(`${base}/veiculos/${id}`, dados)).data.data : (await apiClient.post<{ data: Veiculo }>(`${base}/veiculos`, dados)).data.data,
  excluirVeiculo: async (id: number) => { await apiClient.delete(`${base}/veiculos/${id}`); },
  vistorias: async (veiculoId: number) => (await apiClient.get<{ data: Vistoria[] }>(`${base}/veiculos/${veiculoId}/vistorias`)).data.data,
  registrarVistoria: async (veiculoId: number, dados: VistoriaEntrada) =>
    (await apiClient.post<{ data: Vistoria }>(`${base}/veiculos/${veiculoId}/vistorias`, dados)).data.data,

  paradas: async (params: { q?: string; ativa?: boolean; page?: number; per_page?: number } = {}) =>
    (await apiClient.get<Pagina<Parada>>(`${base}/paradas`, { params: { ...params, ativa: params.ativa === undefined ? undefined : Number(params.ativa) } })).data,
  salvarParada: async (id: number | null, dados: ParadaEntrada) =>
    id ? (await apiClient.put<{ data: Parada }>(`${base}/paradas/${id}`, dados)).data.data : (await apiClient.post<{ data: Parada }>(`${base}/paradas`, dados)).data.data,
  excluirParada: async (id: number) => { await apiClient.delete(`${base}/paradas/${id}`); },

  rotas: async (params: FiltrosRota = {}) => (await apiClient.get<Pagina<Rota>>(`${base}/rotas`, { params })).data,
  salvarRota: async (id: number | null, dados: RotaEntrada) =>
    id ? (await apiClient.put<{ data: Rota }>(`${base}/rotas/${id}`, dados)).data.data : (await apiClient.post<{ data: Rota }>(`${base}/rotas`, dados)).data.data,
  excluirRota: async (id: number) => { await apiClient.delete(`${base}/rotas/${id}`); },

  itinerario: async (rotaId: number) => (await apiClient.get<{ data: ItemItinerario[] }>(`${base}/rotas/${rotaId}/itinerario`)).data.data,
  adicionarParada: async (rotaId: number, dados: { parada_id: number; embarque_previsto?: string | null; desembarque_previsto?: string | null }) =>
    (await apiClient.post<{ data: ItemItinerario[] }>(`${base}/rotas/${rotaId}/itinerario`, dados)).data.data,
  horariosDaParada: async (rotaId: number, paradaId: number, dados: { embarque_previsto: string | null; desembarque_previsto: string | null }) =>
    (await apiClient.put<{ data: ItemItinerario[] }>(`${base}/rotas/${rotaId}/itinerario/${paradaId}`, dados)).data.data,
  removerParada: async (rotaId: number, paradaId: number) =>
    (await apiClient.delete<{ data: ItemItinerario[] }>(`${base}/rotas/${rotaId}/itinerario/${paradaId}`)).data.data,
  reordenarItinerario: async (rotaId: number, paradas: number[]) =>
    (await apiClient.put<{ data: ItemItinerario[] }>(`${base}/rotas/${rotaId}/itinerario`, { paradas })).data.data,

  auditoria: async (params: { acao?: string; page?: number; per_page?: number }) =>
    (await apiClient.get<Pagina<RegistroAuditoria>>(`${base}/auditoria`, { params })).data,
};
