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
  veiculos: { id: number; placa: string; descricao: string; origem: string }[];
  caracteristicas_trecho: OpcaoTexto[];
  poderes_publicos: { valor: number; rotulo: string }[];
  mediacoes: OpcaoTexto[];
  categorias_cnh: string[];
  tipologias: { valor: number; rotulo: string }[];
  empresas: (Ref & { tipo: string })[];
  motoristas: Ref[];
  permissoes: { gerenciar_frota: boolean; gerenciar_rotas: boolean; gerenciar_alocacoes: boolean; exceder_capacidade: boolean; exportar_censo: boolean; importar_censo: boolean; configurar_leiaute_censo: boolean; ver_custos: boolean; gerenciar_parametros_custo: boolean; auditar: boolean };
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

export interface Ocupacao {
  alocados: number;
  capacidade: number | null;
  percentual: number | null;
  faixa: 'verde' | 'amarelo' | 'vermelho' | null;
  calculavel: boolean;
}

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
  ocupacao: Ocupacao;
  regular: boolean;
  motivos_irregularidade: string[];
  observacoes: string | null;
  caracteristicas: string[];
  custo_contratado_mensal: number | null;
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
  caracteristicas?: string[];
  custo_contratado_mensal?: number | null;
}

export interface FiltrosRota { ano_letivo?: number; escola_id?: number; turno?: string; tipo_rede?: string; situacao?: string; caracteristica?: string; q?: string; page?: number }

export interface ItemItinerario {
  ordem: number;
  embarque_previsto: string | null;
  desembarque_previsto: string | null;
  parada: Parada;
}

export interface Alocacao {
  id: number;
  rota_id: number;
  aluno: { id: number; nome: string; escola: string | null; turma: string | null; turno_turma: string | null } | null;
  parada: Ref | null;
  turno: string;
  usa_transporte_rural: boolean;
  poder_publico: number | null;
  poder_publico_rotulo: string | null;
  necessidade_especial: boolean;
  /** Só na ficha, para quem gerencia alocações (dado sensível). */
  necessidade_observacao?: string | null;
  atendimento_curricular: boolean;
  mediacao_didatica: string;
  mediacao_didatica_rotulo: string | null;
  pais_residencia: string;
  data_inicio: string;
  data_fim: string | null;
  motivo_fim: string | null;
  justificativa_excesso: string | null;
  observacoes: string | null;
  ativa: boolean;
  avisos: string[];
}

export interface AlocacaoEntrada {
  parada_id: number;
  usa_transporte_rural: boolean;
  poder_publico: number | null;
  necessidade_especial: boolean;
  necessidade_observacao: string | null;
  atendimento_curricular: boolean;
  mediacao_didatica: string;
  pais_residencia: string;
  observacoes: string | null;
}

export interface AlunoBusca { id: number; nome: string; cgm: string | null; escola: string | null; turma: string | null; turno: string | null }

export interface CampoCenso {
  chave: string;
  rotulo: string;
  grupo: 'identificacao' | 'matricula' | 'transporte';
  origem: string;
  obrigatorio: boolean;
  sensivel: boolean;
  confere: boolean;
}

export interface LeiauteCenso { chave: string; nome: string; descricao: string; campos: CampoCenso[] }

export interface ModeloExportacao { id: number; nome: string; leiaute: string; campos: string[]; padrao: boolean }

export type TipoPendencia = 'sem_alocacao_ativa' | 'rota_sem_veiculo' | 'rural_sem_declaracao' | 'veiculo_nao_adaptado' | 'sem_codigo_inep' | 'campo_sem_dado';

export interface PendenciaCenso {
  tipo: TipoPendencia;
  aluno_id: number | null;
  aluno: string | null;
  rota: string | null;
  campo?: string;
  rotulo?: string;
}

export interface PreValidacao {
  ano_letivo: number;
  leiaute: string;
  approved: boolean;
  total_linhas: number;
  resumo: Record<TipoPendencia, number>;
  pendencias: PendenciaCenso[];
  avisos: { tipo: string; aluno_id: number; aluno: string; rota: string | null }[];
  campos_sem_dado: { chave: string; rotulo: string }[];
  campos: string[];
  campos_ignorados: string[];
}

export interface SelecaoCenso {
  ano_letivo: number;
  leiaute?: string;
  campos: string[];
  confirmar_sensiveis: string[];
}

export interface Painel {
  ano_letivo: number | null;
  indicadores: {
    rotas_ativas: number;
    veiculos_ativos: number;
    alunos_transportados: number;
    ocupacao_media: number | null;
    rotas_superlotadas: number;
    rotas_sem_veiculo: number;
  };
  rotas: { id: number; nome: string; escola: string | null; turno: string; placa: string | null; ocupacao: Ocupacao; pendencia: string | null }[];
  alertas: Alertas;
}

export type TipoImportacao = 'veiculos' | 'motoristas' | 'paradas';

export interface ImportacaoCsv {
  id: number;
  tipo: TipoImportacao | 'censo';
  arquivo: string;
  status: 'previa' | 'na_fila' | 'processando' | 'concluida' | 'falha' | 'cancelada';
  total: number;
  validas: number;
  criadas: number;
  ignoradas: number;
  com_erro: number;
  divergencias: { linha: number; codigo: string; mensagem: string }[];
  avisos: { linha: number; mensagem: string }[];
  truncado: boolean;
  mensagem: string | null;
  concluida_em: string | null;
  /** Só na importação do Educacenso (`tipo: 'censo'`). */
  resumo?: Record<string, number>;
  escolas_pendentes?: { inep: string; alunos: number }[];
  opcoes?: { casar_por_nome: boolean };
  leiaute?: { id: number; nome: string; ano_censo: number } | null;
  sem_alocacao?: number;
}

/* Leiaute de importação do Educacenso (design D-I2). */
export type TipoCampoCenso = 'texto' | 'numero' | 'data' | 'booleano' | 'codigo';

export interface CampoLeiaute {
  chave: string;
  registro: string;
  registro_nome: string;
  posicao: number;
  posicao_padrao: number | null;
  rotulo: string;
  tipo: TipoCampoCenso;
  destino: string;
  ativo: boolean;
  ativo_padrao: boolean;
  travado: boolean;
  sensivel: boolean;
  nativo: boolean;
  mapa: Record<string, string> | null;
  formato: string;
  valor_verdadeiro: string;
}

export interface LeiauteImportacao {
  id: number;
  nome: string;
  base: string;
  ano_censo: number;
  delimitador: string;
  codificacao: string;
  padrao: boolean;
  campos?: CampoLeiaute[];
  registros?: Record<string, string>;
  formatos_data?: string[];
  codificacoes?: string[];
}

/** O que o usuário pode mudar num campo: o servidor ignora o resto de um campo nativo. */
export type AjusteCampo = Partial<Pick<CampoLeiaute, 'posicao' | 'rotulo' | 'ativo' | 'mapa' | 'formato' | 'valor_verdadeiro' | 'registro' | 'tipo' | 'sensivel'>> & { chave: string };

export interface TesteLeiaute {
  linhas_lidas: number;
  desconhecidos: number;
  registros: { registro: string; nome: string; linhas: number; amostras: { posicao: number; chave: string; rotulo: string; valor: string; alerta: string | null }[][] }[];
  alertas: { registro: string; chave: string; rotulo: string; posicao: number; codigo: string; mensagem: string; ocorrencias: number }[];
}

/* Custos (design D-C1 a D-C8). */
export interface ParametroCusto {
  chave: string; rotulo: string; unidade: string; escopo: 'comum' | 'rod' | 'aqua'; grupo: string; min: number; max: number; obrigatorio: boolean;
  padrao: number | null; ajuda: string; valor: number | null; origem: 'orgao' | 'padrao' | null;
}

export interface ParametrosCusto { ano: number; grupos: Record<string, string>; parametros: ParametroCusto[] }

export interface CustoRota {
  rota_id: number; rota: string; ano_letivo: number; turno: string; escola: string | null; escola_id: number; empresa: string | null; empresa_id: number | null;
  veiculo: string | null; origem_veiculo: string | null; custo_contratado_mensal: number | null; simulado: boolean;
  modal: 'rodoviario' | 'aquaviario' | null; completo: boolean; faltando: { chave: string; rotulo: string }[];
  km_viagem: number; km_mes?: number; km_ano?: number; alunos: number;
  fixo?: Record<string, number>; variavel?: Record<string, number>;
  custo_fixo_mensal?: number | null; custo_variavel_km?: number | null; custo_mensal?: number | null; custo_anual?: number | null;
  custo_por_km?: number | null; custo_por_dia_letivo?: number | null; custo_por_aluno_mes?: number | null; custo_por_aluno_ano?: number | null;
  comparativo: { contratado: number; estimado: number; diferenca: number; percentual: number | null; acima_do_limite: boolean } | null;
}

export interface RelatorioCustos {
  ano_letivo: number;
  linhas: CustoRota[];
  por_escola: GrupoCusto[];
  por_empresa: GrupoCusto[];
  totais: { rotas: number; completas: number; incompletas: number; custo_anual: number; alunos: number; custo_por_aluno_ano: number | null };
}

export interface GrupoCusto { id: number | null; nome: string; rotas: number; incompletas: number; alunos: number; custo_anual: number; custo_por_aluno_ano: number | null }

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

  alunosDaRota: async (rotaId: number, encerradas = false) =>
    (await apiClient.get<{ data: Alocacao[]; ocupacao: Ocupacao }>(`${base}/rotas/${rotaId}/alunos`, { params: { encerradas: encerradas ? 1 : 0 } })).data,
  buscarAlunos: async (rotaId: number, q: string) => (await apiClient.get<{ data: AlunoBusca[] }>(`${base}/rotas/${rotaId}/alunos/busca`, { params: { q } })).data.data,
  alocacao: async (rotaId: number, id: number) => (await apiClient.get<{ data: Alocacao }>(`${base}/rotas/${rotaId}/alunos/${id}`)).data.data,
  alocar: async (rotaId: number, dados: AlocacaoEntrada & { aluno_id: number; justificativa_excesso?: string | null }) =>
    (await apiClient.post<{ data: Alocacao }>(`${base}/rotas/${rotaId}/alunos`, dados)).data.data,
  atualizarAlocacao: async (rotaId: number, id: number, dados: AlocacaoEntrada) =>
    (await apiClient.put<{ data: Alocacao }>(`${base}/rotas/${rotaId}/alunos/${id}`, dados)).data.data,
  encerrarAlocacao: async (rotaId: number, id: number, dados: { data_fim: string; motivo: string }) =>
    (await apiClient.post<{ data: Alocacao }>(`${base}/rotas/${rotaId}/alunos/${id}/encerrar`, dados)).data.data,

  painel: async (ano?: number) => (await apiClient.get<{ data: Painel }>(`${base}/painel`, { params: { ano_letivo: ano } })).data.data,

  leiautes: async () => (await apiClient.get<{ data: LeiauteCenso[] }>(`${base}/censo/leiautes`)).data.data,
  modelos: async () => (await apiClient.get<{ data: ModeloExportacao[] }>(`${base}/censo/modelos`)).data.data,
  salvarModelo: async (id: number | null, dados: { nome: string; leiaute: string; campos: string[] }) =>
    id ? (await apiClient.put<{ data: ModeloExportacao }>(`${base}/censo/modelos/${id}`, dados)).data.data : (await apiClient.post<{ data: ModeloExportacao }>(`${base}/censo/modelos`, dados)).data.data,
  excluirModelo: async (id: number) => { await apiClient.delete(`${base}/censo/modelos/${id}`); },
  aplicarModelo: async (id: number, leiaute: string) =>
    (await apiClient.get<{ data: { campos: string[]; ignorados: string[] } }>(`${base}/censo/modelos/${id}/aplicar`, { params: { leiaute } })).data.data,
  preValidar: async (dados: SelecaoCenso) => (await apiClient.post<{ data: PreValidacao }>(`${base}/censo/pre-validacao`, dados)).data.data,
  /** Arquivo gerado sob demanda (não fica no servidor): devolve o conteúdo e o nome sugerido. */
  baixarCenso: async (tipo: 'arquivo' | 'conferencia', dados: SelecaoCenso) => {
    const r = await apiClient.post<Blob>(`${base}/censo/${tipo}`, dados, { responseType: 'blob' });
    const nome = /filename="([^"]+)"/.exec(String(r.headers['content-disposition'] ?? ''))?.[1] ?? `transporte-${tipo}.csv`;
    return { blob: r.data, nome };
  },

  modeloImportacao: async (tipo: TipoImportacao) => {
    const r = await apiClient.get<Blob>(`${base}/importacoes/modelo/${tipo}`, { responseType: 'blob' });
    return { blob: r.data, nome: `modelo-transporte-${tipo}.csv` };
  },
  previaImportacao: async (tipo: TipoImportacao, arquivo: File) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return (await apiClient.post<{ data: ImportacaoCsv }>(`${base}/importacoes/${tipo}/previa`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  confirmarImportacao: async (id: number, opcoes?: { casar_por_nome: boolean }) => (await apiClient.post<{ data: ImportacaoCsv }>(`${base}/importacoes/${id}/confirmar`, opcoes)).data.data,
  importacao: async (id: number) => (await apiClient.get<{ data: ImportacaoCsv }>(`${base}/importacoes/${id}`)).data.data,
  cancelarImportacao: async (id: number) => (await apiClient.delete<{ data: ImportacaoCsv }>(`${base}/importacoes/${id}`)).data.data,

  leiautesImportacao: async () => (await apiClient.get<{ data: LeiauteImportacao[] }>(`${base}/censo/importacao/leiautes`)).data.data,
  leiauteImportacao: async (id: number) => (await apiClient.get<{ data: LeiauteImportacao }>(`${base}/censo/importacao/leiautes/${id}`)).data.data,
  salvarLeiauteImportacao: async (id: number, dados: { nome?: string; ano_censo?: number; delimitador?: string; codificacao?: string; campos?: AjusteCampo[] }) =>
    (await apiClient.put<{ data: LeiauteImportacao }>(`${base}/censo/importacao/leiautes/${id}`, dados)).data.data,
  duplicarLeiauteImportacao: async (dados: { nome: string; ano_censo: number; copiar_de?: number }) =>
    (await apiClient.post<{ data: LeiauteImportacao }>(`${base}/censo/importacao/leiautes`, dados)).data.data,
  restaurarLeiauteImportacao: async (id: number) => (await apiClient.post<{ data: LeiauteImportacao }>(`${base}/censo/importacao/leiautes/${id}/restaurar`)).data.data,
  padraoLeiauteImportacao: async (id: number) => (await apiClient.post<{ data: LeiauteImportacao }>(`${base}/censo/importacao/leiautes/${id}/padrao`)).data.data,
  excluirLeiauteImportacao: async (id: number) => { await apiClient.delete(`${base}/censo/importacao/leiautes/${id}`); },
  testarLeiaute: async (arquivo: File, leiauteId?: number) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    if (leiauteId) form.append('leiaute_id', String(leiauteId));
    return (await apiClient.post<{ data: TesteLeiaute }>(`${base}/censo/importacao/testar`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  previaCenso: async (arquivo: File, leiauteId?: number) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    if (leiauteId) form.append('leiaute_id', String(leiauteId));
    return (await apiClient.post<{ data: ImportacaoCsv }>(`${base}/censo/importacao/previa`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },

  parametrosCusto: async (ano: number) => (await apiClient.get<{ data: ParametrosCusto }>(`${base}/custos/parametros`, { params: { ano } })).data.data,
  salvarParametrosCusto: async (ano: number, valores: Record<string, number | string | null>) =>
    (await apiClient.put<{ data: ParametrosCusto }>(`${base}/custos/parametros`, { ano, valores })).data.data,
  copiarParametrosCusto: async (de: number, para: number, sobrescrever = false) =>
    (await apiClient.post<{ copiados: number }>(`${base}/custos/parametros/copiar`, { de, para, sobrescrever })).data.copiados,
  custosRotas: async (ano: number, escolaId?: number) => (await apiClient.get<{ data: CustoRota[] }>(`${base}/custos/rotas`, { params: { ano, escola_id: escolaId } })).data.data,
  custoRota: async (id: number, simular?: Record<string, string>) => (await apiClient.get<{ data: CustoRota }>(`${base}/custos/rotas/${id}`, { params: simular && Object.keys(simular).length > 0 ? { simular } : undefined })).data.data,
  relatorioCustos: async (ano: number) => (await apiClient.get<{ data: RelatorioCustos }>(`${base}/custos/relatorio`, { params: { ano } })).data.data,
  baixarCustos: async (ano: number) => {
    const r = await apiClient.get<Blob>(`${base}/custos/relatorio/csv`, { params: { ano }, responseType: 'blob' });
    return { blob: r.data, nome: `transporte-custos-${ano}.csv` };
  },

  auditoria: async (params: { acao?: string; de?: string; ate?: string; usuario?: string; page?: number; per_page?: number }) =>
    (await apiClient.get<Pagina<RegistroAuditoria>>(`${base}/auditoria`, { params })).data,
};
