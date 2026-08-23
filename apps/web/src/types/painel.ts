// src/types/painel.ts
// Tipos para o Painel Gerencial de Saúde Financeira Municipal

export type CriticidadeType = "ESSENCIAL" | "IMPORTANTE" | "DIFERIVEL";
export type ImpactoMunicipalType = "ALTO" | "MEDIO" | "BAIXO";
export type EscopoPainel = "prefeitura" | "secretaria";
export type MetodoProjecao = "MEDIA_MOVEL_SAZONAL" | "EXTRAPOLACAO_LINEAR";

export interface Secretaria {
  id: string;
  tenantId: string;
  nome: string;
  codigo: string;
  orcamentoTotal: number;
  orcamentoEmpenhado: number;
  orcamentoLiquidado: number;
  ativo: boolean;
}

export interface GastoMensal {
  mes: number;
  ano: number;
  valorLiquidado: number;
  isProjecao?: boolean;
}

export interface IndiceCorteDetalhe {
  total: number; // 0-100
  pesoCriticidade: number;
  pesoImpacto: number;
  pctDisponivel: number;
  fatorTrajetoria: number;
  classificacao: "SUPRESSAO_PRIORITARIA" | "RENEGOCIACAO" | "PROTEGER";
}

export interface ContratoGestao {
  id: string;
  tenantId: string;
  secretariaId: string;
  secretariaNome: string;
  numero: string;
  empresa: string;
  objeto: string;
  categoria: string;
  valorTotal: number;
  valorLiquidado: number;
  valorDisponivel: number;
  pctLiquidado: number;
  pctDisponivel: number;
  representatividadePct: number;
  criticidade: CriticidadeType;
  criticidadeFonte: "AUTOMATICA" | "MANUAL";
  criticidadeAutor?: string;
  impactoMunicipal: ImpactoMunicipalType;
  impactoSocial?: string;
  dataInicio: string;
  dataFim: string;
  situacao: string;
  isDemonstracao: boolean;
  gastosMensais: GastoMensal[];
  projecao2026?: {
    valorProjetado: number;
    crescimentoAnualPct: number;
    metodoProjecao: MetodoProjecao;
    confianca: number;
    alertaCrescimento: boolean;
  };
  indiceCorte: IndiceCorteDetalhe;
}

export interface SemaforoFinanceiro {
  orcamentoTotal: number;
  orcamentoEmpenhado: number;
  orcamentoLiquidado: number;
  saldo: number;
  pctEmpenhado: number;
  pctLiquidado: number;
  pctSaldo: number;
  ritmoExecucao: number; // % do ano decorrido vs % liquidado
  projecaoEstouro: boolean;
  projecaoDeficit?: number;
}

export interface RankingSecretaria {
  secretariaId: string;
  secretariaNome: string;
  codigo: string;
  valorTotal: number;
  valorLiquidado: number;
  pct: number;
  numContratos: number;
}

export interface RankingPotencialCorte {
  secretariaId: string;
  secretariaNome: string;
  volumeDiferivel: number;
  volumeImportante: number;
  indiceMediaCorte: number;
  numContratosDiferiveis: number;
}

export interface AlertaDecisao {
  id: string;
  tipo: "CRITICO" | "ATENCAO" | "INFO";
  titulo: string;
  descricao: string;
  impactoFinanceiro?: number;
  secretaria?: string;
  acaoRecomendada: string;
}

export interface SimuladorInput {
  metaPct: number;
  exercicio: number;
  secretariaId?: string;
}

export interface ContratoRecomendado {
  contratoId: string;
  numero: string;
  empresa: string;
  objeto: string;
  secretariaNome: string;
  criticidade: CriticidadeType;
  economiaEstimada: number;
  indiceCorte: number;
  impactoSocial?: string;
}

export interface ResultadoPorSecretaria {
  secretariaId: string;
  secretariaNome: string;
  orcamentoTotal: number;
  corteLinear: number;
  corteOtimo: number;
  economiaOtima: number;
  impactoMunicipal: ImpactoMunicipalType;
  servicosAfetados: string[];
}

export interface SimuladorResult {
  metaPct: number;
  metaValorTotal: number;
  economiaOtimaTotalR: number;
  economiaOtimaTotalPct: number;
  metaAtingida: boolean;
  avisoCortaEssenciais: boolean;
  resultadoPorSecretaria: ResultadoPorSecretaria[];
  contratosRecomendados: ContratoRecomendado[];
  dataSource: DataSourcePainel;
}

export interface DataSourcePainel {
  origin: "OFICIAL" | "DEMONSTRACAO";
  source: string;
  collectedAt: string;
  metodoProjecao?: MetodoProjecao;
}

export interface PainelVisaoResponse {
  escopo: EscopoPainel;
  secretariaId?: string;
  ano: number;
  semaforo: SemaforoFinanceiro;
  contratos: ContratoGestao[];
  rankingSecretarias?: RankingSecretaria[];
  rankingPotencialCorte?: RankingPotencialCorte[];
  alertas: AlertaDecisao[];
  dataSource: DataSourcePainel;
}
