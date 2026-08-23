export type DataSourceOrigin = 'OFICIAL' | 'DEMONSTRACAO';

export interface DataSourceMetadata {
  origin: DataSourceOrigin;
  source: string; // Ex: 'SICONFI / STN (Tesouro Nacional)', 'TCE-PR CAp Fiscal', 'Transferegov / Obrasgov', 'Modelo Preditivo LOA'
  collectedAt?: string;
  confidence?: 'OFICIAL_HOMOLOGADO' | 'ESTIMATIVA_ALTA_CONFIANCA' | 'PROJECAO_PREDITIVA';
  anexo?: string;
}

export interface SiconfiRreoItem {
  exercicio: number;
  periodo: number;
  periodicidade: string;
  anexo: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
  populacao?: number;
}

export interface SiconfiRgfItem {
  exercicio: number;
  periodo: number;
  periodicidade: string;
  anexo: string;
  poder: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
}

export interface FiscalKPIs {
  receitaTotalOrcada: number;
  receitaTotalRealizada: number;
  receitaTotalReestimada: number;
  despesaTotalOrcada: number;
  despesaTotalEmpenhada: number;
  despesaTotalLiquidada: number;
  despesaTotalPaga: number;
  rcl: number; // Receita Corrente Líquida
  despesaPessoalTotal: number;
  despesaPessoalPercentualRCL: number;
  limiteAlertaPessoal: number; // 48.6%
  limitePrudencialPessoal: number; // 51.3%
  limiteLegalPessoal: number; // 54.0%
  statusPessoal: 'OK' | 'ATENCAO' | 'CRITICO';
  aportePrevidenciarioFPMA: number;
  servicoDivida: number;
  resultadoPrimario: number;
  resultadoNominal: number;
  superavitOrcamentario: number;
  aplicacaoEducacaoValor: number;
  aplicacaoEducacaoPercentual: number; // min 25%
  aplicacaoSaudeValor: number;
  aplicacaoSaudePercentual: number; // min 15%
  fundebTotal: number;
  fundebMagisterioPercentual: number; // min 70%
  metaCaptacaoAnual: number; // R$ 124.000.000
  captacaoRealizada: number;
  dataSource?: DataSourceMetadata;
}

export interface RevenueSource {
  id: string;
  nome: string;
  categoria: 'Tributária Própria' | 'Transferências do Estado' | 'Transferências da União' | 'Royalties/Compensações' | 'Outras';
  dataSource?: DataSourceMetadata;
  orcado: number;
  reestimado: number;
  realizado: number;
  variacaoPercentual: number; // em relação ao ano anterior
  historicoMensal: { mes: string; orcado: number; realizado: number }[];
  detalhes: { item: string; valor: number }[];
}

export interface ExpenseNature {
  id: string;
  categoria: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  orcado: number;
  percentualTotal: number;
}

export interface ExpenseFunction {
  id: string;
  funcao: string;
  icone: string;
  orcado: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  percentualOrcamento: number;
}

export interface LRFLimit {
  id: string;
  nome: string;
  baseCalculoNome: string;
  baseCalculoValor: number;
  valorRealizado: number;
  percentualRealizado: number;
  limiteMinimoOuMaximo: 'minimo' | 'maximo';
  limiteAlerta?: number;
  limitePrudencial?: number;
  limiteLegal: number;
  status: 'OK' | 'ATENCAO' | 'CRITICO';
  fundamentoLegal: string;
  observacao: string;
}

export interface FiscalAlert {
  id: string;
  tipo: 'CRITICO' | 'ATENCAO' | 'OK' | 'INFO';
  titulo: string;
  descricao: string;
  impacto: string;
  orgao: string;
  dataAlerta: string;
  acaoRecomendada: string;
}

export interface ProgramaTransferegov {
  id: string;
  codigoPrograma: string;
  orgaoConcedente: string;
  ministerio: 'Saúde' | 'Educação' | 'Cidades / Infraestrutura' | 'Desenvolvimento Social' | 'Meio Ambiente' | 'Segurança / Justiça' | 'Agricultura';
  eixo?: string;
  titulo: string;
  areaTematica: string;
  objeto: string;
  valorMinimo: number;
  valorMaximo: number;
  percentualContrapartidaMinima: number;
  dataInicioInscricao: string;
  dataFimInscricao: string;
  diasRestantes: number;
  statusPrazo: 'URGENTE' | 'MODERADO' | 'CONFORTAVEL' | 'ENCERRADO';
  probabilidade?: 'ALTA' | 'MEDIA' | 'BAIXA';
  valorPonderado?: number;
  elegibilidade: {
    status: 'ELEGIVEL' | 'RESTRICAO' | 'INELEGIVEL';
    motivos: string[];
    capagMinima: 'A' | 'B' | 'C';
    caucExigido: boolean;
  };
  linkTransferegov: string;
}

export interface ProjetoPronto {
  id: string;
  titulo: string;
  secretaria: string;
  valorEstimado: number;
  etpStatus: 'PRONTO' | 'EM_ELABORACAO' | 'REVISAO';
  projetoExecutivoStatus: 'PRONTO' | 'EM_ELABORACAO' | 'DISPENSADO';
  licencaAmbiental: 'EMITIDA' | 'DISPENSADA' | 'EM_ANALISE';
  maturidade: 'PRONTO_SUBMISSAO' | 'EM_PREPARACAO' | 'SUBMETIDO';
  potencialConcedente: string;
}

export interface ChamadaCalendario {
  id: string;
  ministerio: string;
  eixo: string;
  periodoAbertura: string;
  mesAbertura: string;
  status: 'ABERTO' | 'EM_BREVE' | 'ENCERRADO';
  diasRestantes?: number;
  valorEstimadoGlobal: number;
}

export interface SimulacaoContrapartida {
  valorGlobal: number;
  percentualContrapartida: number;
  valorRepasseFederal: number;
  valorContrapartidaMunicipal: number;
  saldoCaixaLivreDisponivel: number;
  impactoCaixaLivrePercentual: number;
  percentualComprometimentoCaixaLivre?: number;
  viabilidade: 'ALTA' | 'MODERADA' | 'CRITICA';
  recomendacaoTecnica: string;
}

export interface ProjecaoReformaAno {
  ano: number;
  icmsSemReforma: number;
  issSemReforma: number;
  ibsProjetado: number;
  fundoCompensacaoFederativo: number;
  receitaTotalSemReforma: number;
  receitaTotalComReforma: number;
  diferencaNominal: number;
  diferencaPercentual: number;
  faseTransicao: string;
}

export interface MedidaCompensatoria {
  id: string;
  titulo: string;
  categoria: 'IPTU' | 'ISSQN' | 'DÍVIDA ATIVA' | 'CIP / COSIP' | 'TAXAS MUNICIPAIS';
  impactoAnualEstimado: number;
  complexidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  prazoMeses: number;
  descricao: string;
  acaoPratica: string;
}

export interface SimuladorReformaPayload {
  municipio: {
    nome: string;
    cidade: string;
    uf: string;
    codigoIbge: string;
    perfilEconomico: string;
  };
  resumo: {
    perdaOuGanhoAcumulado2033: number;
    anoPicoImpacto: number;
    mediaVariacaoAnualPct: number;
    recomendacaoGeral: string;
    fatorDestinoConsumo: number;
  };
  projecoes: ProjecaoReformaAno[];
  medidasCompensatorias: MedidaCompensatoria[];
  dataSource?: DataSourceMetadata;
}

export interface MunicipioBenchmark {
  id: string;
  codigoIbge: string;
  cidade: string;
  uf: string;
  populacao: number;
  porte: 'Pequeno' | 'Médio' | 'Grande' | 'Metrópole';
  rclTotal: number;
  rclPerCapita: number;
  despesaPessoalPct: number;
  arrecadacaoPropriaPerCapita: number;
  arrecadacaoPropriaPct?: number;
  captacaoPerCapita?: number;
  gastoSaudePct?: number;
  gastoEducacaoPct?: number;
  gastoObrasPct?: number;
  investimentoPerCapita: number;
  dependenciaTransferenciasPct: number;
  scoreEficienciaFiscal: number;
  posicaoRanking: number;
  autonomiaRankingPosicao?: number;
  isMunicipioAtivo?: boolean;
}

export interface BenchmarkPayload {
  municipioAtivo: MunicipioBenchmark;
  grupoComparativo: {
    nomeGrupo: string;
    totalMunicipios: number;
    posicaoAtivo: number;
    mediaRclPerCapita: number;
    mediaDespesaPessoalPct: number;
    mediaArrecadacaoPropriaPerCapita: number;
    mediaArrecadacaoPropriaPct?: number;
    mediaInvestimentoPerCapita: number;
    mediaCaptacaoPerCapita?: number;
    mediaGastoSaudePct?: number;
    mediaGastoEducacaoPct?: number;
    scoreMedio: number;
    resumoComparativo?: string;
  };
  ranking: MunicipioBenchmark[];
  destaques: {
    pontosFortes: string[];
    oportunidadesMelhoria: string[];
  };
  dataSource?: DataSourceMetadata;
}

export interface CriterioConformidade {
  id: string;
  nome: string;
  exigenciaLegal: string;
  valorObtido: string;
  status: 'CUMPRIDO' | 'ALERTA' | 'DESCUMPRIDO';
  pontuacao: number;
  peso: number;
  fundamentoLegal: string;
}

export interface SeloConformidadePayload {
  municipio: {
    nome: string;
    cidade: string;
    uf: string;
    codigoIbge: string;
    prefeitoAtual: string;
  };
  ano: number;
  nivelSelo: 'DIAMANTE' | 'OURO' | 'PRATA' | 'BRONZE' | 'IRREGULAR';
  notaConceito?: string;
  pontuacaoTotal: number;
  historicoScore?: Array<{
    ano: number;
    score: number;
    nota: string;
    status: string;
  }>;
  dataEmissao: string;
  codigoAutenticidade: string;
  criterios: CriterioConformidade[];
  parecerConclusivo: string;
  embedWidgetHtml: string;
  dataSource?: DataSourceMetadata;
}

export interface AlertaPrazoCritico {
  id: string;
  categoria: 'SICONFI' | 'CAUC' | 'LRF_PESSOAL' | 'ORCAMENTO' | 'CONVENIOS' | 'FUNDEB';
  titulo: string;
  descricao: string;
  dataLimite: string;
  diasRestantes: number;
  severidade: 'CRITICO' | 'ALERTA' | 'INFORMATIVO';
  sancaoPrevista: string;
  acaoRecomendada: string;
  orgaoFiscalizador: string;
  status: 'PENDENTE' | 'RECONHECIDO' | 'CONCLUIDO';
}

export interface ChecklistFundebItem {
  id: string;
  obrigacao: string;
  orgao: string;
  frequencia: 'MENSAL' | 'BIMESTRAL' | 'ANUAL';
  prazoLimite: string;
  diasRestantes: number;
  status: 'URGENTE' | 'PENDENTE' | 'CONCLUIDO' | 'HOMOLOGADO';
  impactoVaat: string;
  fundamentoLegal: string;
}

export interface MapaRiscoVaat {
  habilitaVaatStatus: 'REGULAR' | 'EM_RISCO';
  percentualComplementacaoVaat: number;
  valorEstimadoEmRisco: number;
  alertaExecutivo: string;
  requisitos: Array<{
    id: string;
    nome: string;
    status: 'REGULAR' | 'EM_ANDAMENTO' | 'CRITICO';
    prazo: string;
    diasRestantes: number;
    detalhes: string;
  }>;
}

export interface AlertasProativosPayload {
  totalAlertas: number;
  totalCriticos: number;
  totalAtencao: number;
  alertas: AlertaPrazoCritico[];
  checklistFundeb?: ChecklistFundebItem[];
  mapaRiscoVaat?: MapaRiscoVaat;
  dataSource?: DataSourceMetadata;
}

export interface EmendaParlamentar {
  id: string;
  autor: string;
  partido: string;
  esfera: 'Federal' | 'Estadual';
  tipo: 'RP6 (Individual)' | 'RP7 (Bancada)' | 'RP8 (Comissão)' | 'Emenda Estadual ALEP';
  numero: string;
  objeto: string;
  orgaoDestino: string;
  valorIndicado: number;
  valorEmpenhado: number;
  valorPago: number;
  status: 'Paga' | 'Empenhada' | 'Em Análise' | 'Aguardando Liberação';
  ano: number;
  dataProcessamento?: string; // Data em que a emenda foi processada ou atualizada na API
}

export interface ConvenioRecurso {
  id: string;
  numeroProposta: string;
  concedente: string;
  ministerio: string;
  objeto: string;
  valorGlobal: number;
  valorRepasse: number;
  contrapartida: number;
  valorLiberado: number;
  status: 'Em Execução' | 'Prestação de Contas' | 'Aprovado' | 'Proposta Enviada';
  vigenciaFim: string;
}

export interface FundebData {
  exercicio: number;
  repassesRecebidosTotal: number;
  repassesMensais: { mes: string; vaaf: number; vaat: number; vaar: number; total: number }[];
  gastoProfissionaisEducacao: number;
  percentualMagisterio: number; // min 70%
  gastoManutencaoDesenvolvimento: number;
  percentualManutencao: number;
  statusSIOPE: 'Transmitido e Homologado' | 'Em Validação' | 'Pendente';
  statusMSC: 'Enviado sem Inconsistências' | 'Pendente';
  riscoPerdaVAAT: boolean;
  parecerTCEPR: 'Regular (Fora da Lista de Risco 2027)' | 'Em Acompanhamento' | 'Risco';
}

export interface SiconfiApiStatus {
  online: boolean;
  endpoint: string;
  lastChecked: string;
  latencyMs: number;
  enteNome: string;
  enteCodIbge: string;
  exercicioAtivo: number;
  totalConsultasHoje: number;
  cacheAtivo: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  limitName?: string;
  metricValue?: string;
  threshold?: string;
  ano?: number;
  actionLabel?: string;
  actionTabId?: string;
  duration?: number;
  timestamp?: number;
}

export interface MetricDelta {
  atual: number;
  anterior: number;
  variacaoPct: number; // percentage change, e.g. -3.15 or +4.80
  diferencaNominal: number; // atual - anterior
}

export type ComparativeMode = 'nenhum' | 'anual' | 'trimestral' | 'mensal';

export interface QuarterlyComparativeAnalysis {
  ano: number;
  anoAnterior: number;
  trimestre: number; // 1, 2, 3, 4
  trimestreNome: string; // 'Q1', 'Q2', 'Q3', 'Q4'
  trimestreRotulo: string; // '1º Trimestre (Jan-Mar)'
  meses: string[]; // ['Janeiro', 'Fevereiro', 'Março']
  receitaTotal: MetricDelta;
  despesaTotalLiquidada: MetricDelta;
  despesaTotalEmpenhada: MetricDelta;
  despesaTotalPaga: MetricDelta;
  resultadoTrimestral: MetricDelta;
  rclTrimestral: MetricDelta;
  despesaPessoalTrimestral: MetricDelta;
  folhaRclPercentual: {
    atual: number;
    anterior: number;
    deltaPp: number;
  };
  receitasPorFonte: Array<{
    id: string;
    nome: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorNatureza: Array<{
    id: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorFuncao: Array<{
    id: string;
    funcao: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  historicoTrimestral: Array<{
    trimestre: number;
    trimestreNome: string;
    trimestreRotulo: string;
    meses: string;
    receitaAtual: number;
    receitaAnterior: number;
    variacaoReceitaYoY: number;
    despesaAtual: number;
    despesaAnterior: number;
    variacaoDespesaYoY: number;
    resultadoAtual: number;
    resultadoAnterior: number;
    pessoalPercentAtual: number;
  }>;
}

export interface ComparativeAnalysis {
  anoAtual: number;
  anoAnterior: number;
  receitaTotalOrcada: MetricDelta;
  receitaTotalRealizada: MetricDelta;
  receitaTotalReestimada: MetricDelta;
  despesaTotalOrcada: MetricDelta;
  despesaTotalLiquidada: MetricDelta;
  despesaTotalEmpenhada: MetricDelta;
  despesaTotalPaga: MetricDelta;
  rcl: MetricDelta;
  despesaPessoalTotal: MetricDelta;
  despesaPessoalPercentualRCL: {
    atual: number;
    anterior: number;
    deltaPp: number; // percentage points change
  };
  resultadoPrimario: MetricDelta;
  aportePrevidenciarioFPMA: MetricDelta;
  servicoDivida: MetricDelta;
  aplicacaoEducacaoPercentual: {
    atual: number;
    anterior: number;
    deltaPp: number;
  };
  aplicacaoSaudePercentual: {
    atual: number;
    anterior: number;
    deltaPp: number;
  };
  fundebTotal: MetricDelta;
  receitasPorFonte: Array<{
    id: string;
    nome: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorNatureza: Array<{
    id: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorFuncao: Array<{
    id: string;
    funcao: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
}

export interface MonthlyMetricDelta extends MetricDelta {
  mesAtualNome: string;
  mesAnteriorNome: string;
}

export interface MonthlyComparativeAnalysis {
  ano: number;
  mesAtual: string; // e.g. 'Agosto'
  mesAnterior: string; // e.g. 'Julho'
  mesIndex: number; // e.g. 8 (1-indexed)
  mesAnteriorIndex: number; // e.g. 7
  receitaTotal: MetricDelta;
  despesaTotalLiquidada: MetricDelta;
  despesaTotalEmpenhada: MetricDelta;
  despesaTotalPaga: MetricDelta;
  resultadoMensal: MetricDelta;
  rclMensal: MetricDelta;
  despesaPessoalMensal: MetricDelta;
  receitasPorFonte: Array<{
    id: string;
    nome: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorNatureza: Array<{
    id: string;
    categoria: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  despesasPorFuncao: Array<{
    id: string;
    funcao: string;
    atual: number;
    anterior: number;
    variacaoPct: number;
    diferencaNominal: number;
  }>;
  historicoMensal: Array<{
    mes: string;
    mesNome: string;
    receitaTotal: number;
    despesaTotal: number;
    resultado: number;
    variacaoReceitaMoM: number;
    variacaoDespesaMoM: number;
  }>;
}

export interface MonthTrendPoint {
  mesIndex: number;
  mes: string;
  mesNome: string;
  receita: number;
  despesa: number;
  despesaEmpenhada: number;
  despesaPaga: number;
  resultado: number;
  rcl: number;
  despesaPessoal: number;
  pessoalPercent: number;
  margemPercent: number;
}

export type ObraStatus =
  | 'Em Execução'
  | 'Em Licitação'
  | 'Em Projeto'
  | 'Concluída'
  | 'Paralisada';

export type ObraSecretaria =
  | 'SMOP' // Obras Públicas
  | 'SMED' // Educação
  | 'SMSA' // Saúde
  | 'SMURB' // Urbanismo
  | 'SMMA' // Meio Ambiente
  | 'SMSP' // Segurança Pública
  | 'SMAS' // Assistência Social
  | 'SMEL'; // Esporte e Lazer

export type ObraFonteRecurso =
  | 'Tesouro Municipal'
  | 'Finisa / Caixa'
  | 'Convênio Federal / Transferegov'
  | 'Paranacidade / Estado'
  | 'FUNDEB / MDE'
  | 'Emenda Parlamentar';

export interface ObraAraucaria {
  id: string;
  codigo: string;
  titulo: string;
  secretaria: ObraSecretaria;
  secretariaNome: string;
  status: ObraStatus;
  valorPrevisto: number;
  valorLiquidado: number;
  progressoFisico: number; // 0 a 100
  progressoFinanceiro: number; // 0 a 100
  bairro: string;
  regiao: 'Urbana Central' | 'Urbana Norte' | 'Urbana Sul' | 'Zona Industrial (REPAR)' | 'Zona Rural';
  coordenadasSvg: { x: number; y: number }; // normalized x,y for SVG canvas (0-800 x 0-600)
  coordenadasGeo: { lat: number; lng: number };
  fonteRecurso: ObraFonteRecurso;
  empresaContratada: string;
  numeroContrato: string;
  dataInicio: string;
  dataPrevisaoFim: string;
  prazoDias: number;
  diasDecorridos: number;
  descricao: string;
  destaque: boolean;
  beneficiariosEstimados?: number;
  impactoSocial: string;
}

export interface ObrasSummary {
  totalObras: number;
  totalInvestimento: number;
  totalLiquidado: number;
  totalEmExecucao: number;
  progressoMedioFisico: number;
  progressoMedioFinanceiro: number;
  obrasPorSecretaria: Record<string, number>;
  obrasPorStatus: Record<string, number>;
}


