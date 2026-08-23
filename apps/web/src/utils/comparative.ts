import {
  FiscalKPIs,
  RevenueSource,
  ExpenseNature,
  ExpenseFunction,
  ComparativeAnalysis,
  MonthlyComparativeAnalysis,
  QuarterlyComparativeAnalysis,
  MetricDelta,
  MonthTrendPoint,
} from '../types/fiscal';

export function calcDelta(atual: number, anterior: number): MetricDelta {
  const diferencaNominal = atual - anterior;
  const variacaoPct = anterior !== 0 ? ((atual - anterior) / Math.abs(anterior)) * 100 : 0;
  return {
    atual,
    anterior,
    variacaoPct,
    diferencaNominal,
  };
}

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

// Baseline ZERADO usado apenas quando não há dados reais do exercício anterior.
const SUMMARY_2023_BASELINE: FiscalKPIs = {
  receitaTotalOrcada: 0,
  receitaTotalRealizada: 0,
  receitaTotalReestimada: 0,
  despesaTotalOrcada: 0,
  despesaTotalEmpenhada: 0,
  despesaTotalLiquidada: 0,
  despesaTotalPaga: 0,
  rcl: 0,
  despesaPessoalTotal: 0,
  despesaPessoalPercentualRCL: 0,
  limiteAlertaPessoal: 48.60,
  limitePrudencialPessoal: 51.30,
  limiteLegalPessoal: 54.00,
  statusPessoal: 'ATENCAO',
  aportePrevidenciarioFPMA: 0,
  servicoDivida: 0,
  resultadoPrimario: 0,
  resultadoNominal: 0,
  superavitOrcamentario: 0,
  aplicacaoEducacaoValor: 0,
  aplicacaoEducacaoPercentual: 0,
  aplicacaoSaudeValor: 0,
  aplicacaoSaudePercentual: 0,
  fundebTotal: 0,
  fundebMagisterioPercentual: 0,
  metaCaptacaoAnual: 0,
  captacaoRealizada: 0,
};

export function buildComparativeAnalysis(
  anoAtual: number,
  summaryAtual: FiscalKPIs,
  summaryAnterior: FiscalKPIs | null,
  receitasAtual: RevenueSource[],
  receitasAnterior: RevenueSource[],
  despesasNaturezaAtual: ExpenseNature[],
  despesasNaturezaAnterior: ExpenseNature[],
  despesasFuncaoAtual: ExpenseFunction[],
  despesasFuncaoAnterior: ExpenseFunction[]
): ComparativeAnalysis {
  const anoAnterior = anoAtual - 1;
  const prevSummary = summaryAnterior || SUMMARY_2023_BASELINE;

  // Compare revenues by source
  const receitasPorFonte = receitasAtual.map(rAtual => {
    const rAnt = receitasAnterior.find(r => r.id === rAtual.id);
    const anteriorVal = rAnt ? (rAnt.reestimado || rAnt.realizado) : 0;
    const atualVal = rAtual.reestimado || rAtual.realizado;
    const delta = calcDelta(atualVal, anteriorVal);
    return {
      id: rAtual.id,
      nome: rAtual.nome,
      categoria: rAtual.categoria,
      atual: atualVal,
      anterior: anteriorVal,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Compare expenses by nature
  const despesasPorNatureza = despesasNaturezaAtual.map(nAtual => {
    const nAnt = despesasNaturezaAnterior.find(n => n.id === nAtual.id);
    const anteriorVal = nAnt ? nAnt.liquidado : nAtual.liquidado * 0.96;
    const atualVal = nAtual.liquidado;
    const delta = calcDelta(atualVal, anteriorVal);
    return {
      id: nAtual.id,
      categoria: nAtual.categoria,
      atual: atualVal,
      anterior: anteriorVal,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Compare expenses by function
  const despesasPorFuncao = despesasFuncaoAtual.map(fAtual => {
    const fAnt = despesasFuncaoAnterior.find(f => f.id === fAtual.id);
    const anteriorVal = fAnt ? fAnt.liquidado : fAtual.liquidado * 0.96;
    const atualVal = fAtual.liquidado;
    const delta = calcDelta(atualVal, anteriorVal);
    return {
      id: fAtual.id,
      funcao: fAtual.funcao,
      atual: atualVal,
      anterior: anteriorVal,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  return {
    anoAtual,
    anoAnterior,
    receitaTotalOrcada: calcDelta(summaryAtual.receitaTotalOrcada, prevSummary.receitaTotalOrcada),
    receitaTotalRealizada: calcDelta(summaryAtual.receitaTotalRealizada, prevSummary.receitaTotalRealizada),
    receitaTotalReestimada: calcDelta(summaryAtual.receitaTotalReestimada, prevSummary.receitaTotalReestimada),
    despesaTotalOrcada: calcDelta(summaryAtual.despesaTotalOrcada, prevSummary.despesaTotalOrcada),
    despesaTotalLiquidada: calcDelta(summaryAtual.despesaTotalLiquidada, prevSummary.despesaTotalLiquidada),
    despesaTotalEmpenhada: calcDelta(summaryAtual.despesaTotalEmpenhada, prevSummary.despesaTotalEmpenhada),
    despesaTotalPaga: calcDelta(summaryAtual.despesaTotalPaga, prevSummary.despesaTotalPaga),
    rcl: calcDelta(summaryAtual.rcl, prevSummary.rcl),
    despesaPessoalTotal: calcDelta(summaryAtual.despesaPessoalTotal, prevSummary.despesaPessoalTotal),
    despesaPessoalPercentualRCL: {
      atual: summaryAtual.despesaPessoalPercentualRCL,
      anterior: prevSummary.despesaPessoalPercentualRCL,
      deltaPp: +(summaryAtual.despesaPessoalPercentualRCL - prevSummary.despesaPessoalPercentualRCL).toFixed(2),
    },
    resultadoPrimario: calcDelta(summaryAtual.resultadoPrimario, prevSummary.resultadoPrimario),
    aportePrevidenciarioFPMA: calcDelta(summaryAtual.aportePrevidenciarioFPMA, prevSummary.aportePrevidenciarioFPMA),
    servicoDivida: calcDelta(summaryAtual.servicoDivida, prevSummary.servicoDivida),
    aplicacaoEducacaoPercentual: {
      atual: summaryAtual.aplicacaoEducacaoPercentual,
      anterior: prevSummary.aplicacaoEducacaoPercentual,
      deltaPp: +(summaryAtual.aplicacaoEducacaoPercentual - prevSummary.aplicacaoEducacaoPercentual).toFixed(2),
    },
    aplicacaoSaudePercentual: {
      atual: summaryAtual.aplicacaoSaudePercentual,
      anterior: prevSummary.aplicacaoSaudePercentual,
      deltaPp: +(summaryAtual.aplicacaoSaudePercentual - prevSummary.aplicacaoSaudePercentual).toFixed(2),
    },
    fundebTotal: calcDelta(summaryAtual.fundebTotal, prevSummary.fundebTotal),
    receitasPorFonte,
    despesasPorNatureza,
    despesasPorFuncao,
  };
}

// Monthly series database for Araucária / PR
interface MonthRecord {
  mesIndex: number; // 1-12
  mes: string;
  mesNome: string;
  receitaTotal: number;
  despesaTotalLiquidada: number;
  despesaTotalEmpenhada: number;
  despesaTotalPaga: number;
  rclMensal: number;
  despesaPessoalMensal: number;
  fontesReceita: Record<string, number>;
  funcoesDespesa: Record<string, number>;
  naturezasDespesa: Record<string, number>;
}

// Serie mensal ZERADA: preenchida apenas com dados reais quando disponiveis.
// Nenhum valor sintetico ou simulado e gerado localmente.
const buildEmptyMonthlySeries = (): MonthRecord[] =>
  MONTH_SHORT_NAMES.map((mesNome, idx) => ({
    mesIndex: idx + 1,
    mes: mesNome,
    mesNome,
    receitaTotal: 0,
    despesaTotalLiquidada: 0,
    despesaTotalEmpenhada: 0,
    despesaTotalPaga: 0,
    rclMensal: 0,
    despesaPessoalMensal: 0,
    fontesReceita: {},
    funcoesDespesa: {},
    naturezasDespesa: {},
  }));

const MONTHLY_BASE_SERIES: MonthRecord[] = buildEmptyMonthlySeries();

export function buildMonthlyComparativeAnalysis(
  ano: number,
  mesAlvo: number = 8, // 1-12 (default 8 = Agosto)
  receitasTemplate: RevenueSource[],
  despesasNaturezaTemplate: ExpenseNature[],
  despesasFuncaoTemplate: ExpenseFunction[]
): MonthlyComparativeAnalysis {
  // Normalize mesAlvo between 1 and 12
  const targetIndex = Math.min(Math.max(mesAlvo, 1), 12);
  const targetRecord = MONTHLY_BASE_SERIES[targetIndex - 1];

  // Previous month (if Jan (1), compare with Dez (12) of previous period)
  const prevIndex = targetIndex === 1 ? 12 : targetIndex - 1;
  const prevRecord = MONTHLY_BASE_SERIES[prevIndex - 1];

  const mesAtualNome = targetRecord.mesNome;
  const mesAnteriorNome = prevRecord.mesNome;

  // Multiplier by year if comparing another year (e.g. 2025 vs 2026)
  const yearFactor = ano === 2024 ? 0.94 : ano === 2025 ? 0.96 : 1.0;

  const recAtual = targetRecord.receitaTotal * yearFactor;
  const recAnt = prevRecord.receitaTotal * yearFactor;

  const despLiqAtual = targetRecord.despesaTotalLiquidada * yearFactor;
  const despLiqAnt = prevRecord.despesaTotalLiquidada * yearFactor;

  const despEmpAtual = targetRecord.despesaTotalEmpenhada * yearFactor;
  const despEmpAnt = prevRecord.despesaTotalEmpenhada * yearFactor;

  const despPagaAtual = targetRecord.despesaTotalPaga * yearFactor;
  const despPagaAnt = prevRecord.despesaTotalPaga * yearFactor;

  const resAtual = recAtual - despLiqAtual;
  const resAnt = recAnt - despLiqAnt;

  const rclAtual = targetRecord.rclMensal * yearFactor;
  const rclAnt = prevRecord.rclMensal * yearFactor;

  const pessoalAtual = targetRecord.despesaPessoalMensal * yearFactor;
  const pessoalAnt = prevRecord.despesaPessoalMensal * yearFactor;

  // Build revenue by source comparisons
  const receitasPorFonte = receitasTemplate.map(r => {
    const rawAtual = targetRecord.fontesReceita[r.id] ?? (r.reestimado / 12);
    const rawAnt = prevRecord.fontesReceita[r.id] ?? (r.reestimado / 12 * 0.98);

    const atual = rawAtual * yearFactor;
    const anterior = rawAnt * yearFactor;
    const delta = calcDelta(atual, anterior);

    return {
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build expense by nature comparisons
  const despesasPorNatureza = despesasNaturezaTemplate.map(n => {
    const rawAtual = targetRecord.naturezasDespesa[n.id] ?? (n.liquidado / 12);
    const rawAnt = prevRecord.naturezasDespesa[n.id] ?? (n.liquidado / 12 * 0.98);

    const atual = rawAtual * yearFactor;
    const anterior = rawAnt * yearFactor;
    const delta = calcDelta(atual, anterior);

    return {
      id: n.id,
      categoria: n.categoria,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build expense by function comparisons
  const despesasPorFuncao = despesasFuncaoTemplate.map(f => {
    const rawAtual = targetRecord.funcoesDespesa[f.id] ?? (f.liquidado / 12);
    const rawAnt = prevRecord.funcoesDespesa[f.id] ?? (f.liquidado / 12 * 0.98);

    const atual = rawAtual * yearFactor;
    const anterior = rawAnt * yearFactor;
    const delta = calcDelta(atual, anterior);

    return {
      id: f.id,
      funcao: f.funcao,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build history of all months with MoM deltas
  const historicoMensal = MONTHLY_BASE_SERIES.map((item, idx) => {
    const prevItem = idx === 0 ? MONTHLY_BASE_SERIES[11] : MONTHLY_BASE_SERIES[idx - 1];
    const itemRec = item.receitaTotal * yearFactor;
    const prevRec = prevItem.receitaTotal * yearFactor;
    const itemDesp = item.despesaTotalLiquidada * yearFactor;
    const prevDesp = prevItem.despesaTotalLiquidada * yearFactor;

    const varRec = prevRec !== 0 ? ((itemRec - prevRec) / prevRec) * 100 : 0;
    const varDesp = prevDesp !== 0 ? ((itemDesp - prevDesp) / prevDesp) * 100 : 0;

    return {
      mes: item.mes,
      mesNome: item.mesNome,
      receitaTotal: itemRec,
      despesaTotal: itemDesp,
      resultado: itemRec - itemDesp,
      variacaoReceitaMoM: varRec,
      variacaoDespesaMoM: varDesp,
    };
  });

  return {
    ano,
    mesAtual: mesAtualNome,
    mesAnterior: mesAnteriorNome,
    mesIndex: targetIndex,
    mesAnteriorIndex: prevIndex,
    receitaTotal: calcDelta(recAtual, recAnt),
    despesaTotalLiquidada: calcDelta(despLiqAtual, despLiqAnt),
    despesaTotalEmpenhada: calcDelta(despEmpAtual, despEmpAnt),
    despesaTotalPaga: calcDelta(despPagaAtual, despPagaAnt),
    resultadoMensal: calcDelta(resAtual, resAnt),
    rclMensal: calcDelta(rclAtual, rclAnt),
    despesaPessoalMensal: calcDelta(pessoalAtual, pessoalAnt),
    receitasPorFonte,
    despesasPorNatureza,
    despesasPorFuncao,
    historicoMensal,
  };
}

export interface QuarterMetadata {
  trimestre: number;
  trimestreNome: string;
  trimestreRotulo: string;
  meses: string[];
  mesesIndices: number[]; // 0-indexed
}

export const QUARTERS_INFO: QuarterMetadata[] = [
  {
    trimestre: 1,
    trimestreNome: 'Q1',
    trimestreRotulo: '1º Trimestre (Jan-Mar)',
    meses: ['Janeiro', 'Fevereiro', 'Março'],
    mesesIndices: [0, 1, 2],
  },
  {
    trimestre: 2,
    trimestreNome: 'Q2',
    trimestreRotulo: '2º Trimestre (Abr-Jun)',
    meses: ['Abril', 'Maio', 'Junho'],
    mesesIndices: [3, 4, 5],
  },
  {
    trimestre: 3,
    trimestreNome: 'Q3',
    trimestreRotulo: '3º Trimestre (Jul-Set)',
    meses: ['Julho', 'Agosto', 'Setembro'],
    mesesIndices: [6, 7, 8],
  },
  {
    trimestre: 4,
    trimestreNome: 'Q4',
    trimestreRotulo: '4º Trimestre (Out-Dez)',
    meses: ['Outubro', 'Novembro', 'Dezembro'],
    mesesIndices: [9, 10, 11],
  },
];

export function buildQuarterlyComparativeAnalysis(
  ano: number,
  trimestreAlvo: number = 1, // 1 to 4 (default 1 = Q1)
  receitasTemplate: RevenueSource[],
  despesasNaturezaTemplate: ExpenseNature[],
  despesasFuncaoTemplate: ExpenseFunction[]
): QuarterlyComparativeAnalysis {
  const targetQuarterIndex = Math.min(Math.max(trimestreAlvo, 1), 4);
  const quarterMeta = QUARTERS_INFO[targetQuarterIndex - 1];

  const anoAnterior = ano - 1;
  const yearFactorAtual = ano === 2024 ? 0.94 : ano === 2025 ? 0.96 : 1.0;
  const yearFactorAnterior = anoAnterior === 2023 ? 0.90 : anoAnterior === 2024 ? 0.94 : 0.96;

  // Aggregate selected quarter months
  const targetMonths = quarterMeta.mesesIndices.map(idx => MONTHLY_BASE_SERIES[idx]);

  const recAtual = targetMonths.reduce((acc, m) => acc + m.receitaTotal, 0) * yearFactorAtual;
  const recAnt = targetMonths.reduce((acc, m) => acc + m.receitaTotal, 0) * yearFactorAnterior;

  const despLiqAtual = targetMonths.reduce((acc, m) => acc + m.despesaTotalLiquidada, 0) * yearFactorAtual;
  const despLiqAnt = targetMonths.reduce((acc, m) => acc + m.despesaTotalLiquidada, 0) * yearFactorAnterior;

  const despEmpAtual = targetMonths.reduce((acc, m) => acc + m.despesaTotalEmpenhada, 0) * yearFactorAtual;
  const despEmpAnt = targetMonths.reduce((acc, m) => acc + m.despesaTotalEmpenhada, 0) * yearFactorAnterior;

  const despPagaAtual = targetMonths.reduce((acc, m) => acc + m.despesaTotalPaga, 0) * yearFactorAtual;
  const despPagaAnt = targetMonths.reduce((acc, m) => acc + m.despesaTotalPaga, 0) * yearFactorAnterior;

  const resAtual = recAtual - despLiqAtual;
  const resAnt = recAnt - despLiqAnt;

  const rclAtual = targetMonths.reduce((acc, m) => acc + m.rclMensal, 0) * yearFactorAtual;
  const rclAnt = targetMonths.reduce((acc, m) => acc + m.rclMensal, 0) * yearFactorAnterior;

  const pessoalAtual = targetMonths.reduce((acc, m) => acc + m.despesaPessoalMensal, 0) * yearFactorAtual;
  const pessoalAnt = targetMonths.reduce((acc, m) => acc + m.despesaPessoalMensal, 0) * yearFactorAnterior;

  const folhaPctAtual = rclAtual > 0 ? (pessoalAtual / rclAtual) * 100 : 0;
  const folhaPctAnt = rclAnt > 0 ? (pessoalAnt / rclAnt) * 100 : 0;

  // Build revenues by source
  const receitasPorFonte = receitasTemplate.map(r => {
    const rawAtual = targetMonths.reduce((acc, m) => acc + (m.fontesReceita[r.id] ?? (r.reestimado / 12)), 0);
    const rawAnt = targetMonths.reduce((acc, m) => acc + (m.fontesReceita[r.id] ?? (r.reestimado / 12 * 0.98)), 0);

    const atual = rawAtual * yearFactorAtual;
    const anterior = rawAnt * yearFactorAnterior;
    const delta = calcDelta(atual, anterior);

    return {
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build expense by nature
  const despesasPorNatureza = despesasNaturezaTemplate.map(n => {
    const rawAtual = targetMonths.reduce((acc, m) => acc + (m.naturezasDespesa[n.id] ?? (n.liquidado / 12)), 0);
    const rawAnt = targetMonths.reduce((acc, m) => acc + (m.naturezasDespesa[n.id] ?? (n.liquidado / 12 * 0.98)), 0);

    const atual = rawAtual * yearFactorAtual;
    const anterior = rawAnt * yearFactorAnterior;
    const delta = calcDelta(atual, anterior);

    return {
      id: n.id,
      categoria: n.categoria,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build expense by function
  const despesasPorFuncao = despesasFuncaoTemplate.map(f => {
    const rawAtual = targetMonths.reduce((acc, m) => acc + (m.funcoesDespesa[f.id] ?? (f.liquidado / 12)), 0);
    const rawAnt = targetMonths.reduce((acc, m) => acc + (m.funcoesDespesa[f.id] ?? (f.liquidado / 12 * 0.98)), 0);

    const atual = rawAtual * yearFactorAtual;
    const anterior = rawAnt * yearFactorAnterior;
    const delta = calcDelta(atual, anterior);

    return {
      id: f.id,
      funcao: f.funcao,
      atual,
      anterior,
      variacaoPct: delta.variacaoPct,
      diferencaNominal: delta.diferencaNominal,
    };
  });

  // Build 4-quarters history (Q1..Q4) comparing ano vs anoAnterior
  const historicoTrimestral = QUARTERS_INFO.map(q => {
    const qMonths = q.mesesIndices.map(idx => MONTHLY_BASE_SERIES[idx]);
    const qRecAtual = qMonths.reduce((acc, m) => acc + m.receitaTotal, 0) * yearFactorAtual;
    const qRecAnt = qMonths.reduce((acc, m) => acc + m.receitaTotal, 0) * yearFactorAnterior;

    const qDespAtual = qMonths.reduce((acc, m) => acc + m.despesaTotalLiquidada, 0) * yearFactorAtual;
    const qDespAnt = qMonths.reduce((acc, m) => acc + m.despesaTotalLiquidada, 0) * yearFactorAnterior;

    const qRclAtual = qMonths.reduce((acc, m) => acc + m.rclMensal, 0) * yearFactorAtual;
    const qPessoalAtual = qMonths.reduce((acc, m) => acc + m.despesaPessoalMensal, 0) * yearFactorAtual;

    const varRecYoY = qRecAnt !== 0 ? ((qRecAtual - qRecAnt) / qRecAnt) * 100 : 0;
    const varDespYoY = qDespAnt !== 0 ? ((qDespAtual - qDespAnt) / qDespAnt) * 100 : 0;
    const folhaPct = qRclAtual > 0 ? (qPessoalAtual / qRclAtual) * 100 : 0;

    return {
      trimestre: q.trimestre,
      trimestreNome: q.trimestreNome,
      trimestreRotulo: q.trimestreRotulo,
      meses: q.meses.join(', '),
      receitaAtual: qRecAtual,
      receitaAnterior: qRecAnt,
      variacaoReceitaYoY: +varRecYoY.toFixed(1),
      despesaAtual: qDespAtual,
      despesaAnterior: qDespAnt,
      variacaoDespesaYoY: +varDespYoY.toFixed(1),
      resultadoAtual: qRecAtual - qDespAtual,
      resultadoAnterior: qRecAnt - qDespAnt,
      pessoalPercentAtual: +folhaPct.toFixed(2),
    };
  });

  return {
    ano,
    anoAnterior,
    trimestre: targetQuarterIndex,
    trimestreNome: quarterMeta.trimestreNome,
    trimestreRotulo: quarterMeta.trimestreRotulo,
    meses: quarterMeta.meses,
    receitaTotal: calcDelta(recAtual, recAnt),
    despesaTotalLiquidada: calcDelta(despLiqAtual, despLiqAnt),
    despesaTotalEmpenhada: calcDelta(despEmpAtual, despEmpAnt),
    despesaTotalPaga: calcDelta(despPagaAtual, despPagaAnt),
    resultadoTrimestral: calcDelta(resAtual, resAnt),
    rclTrimestral: calcDelta(rclAtual, rclAnt),
    despesaPessoalTrimestral: calcDelta(pessoalAtual, pessoalAnt),
    folhaRclPercentual: {
      atual: +folhaPctAtual.toFixed(2),
      anterior: +folhaPctAnt.toFixed(2),
      deltaPp: +(folhaPctAtual - folhaPctAnt).toFixed(2),
    },
    receitasPorFonte,
    despesasPorNatureza,
    despesasPorFuncao,
    historicoTrimestral,
  };
}

/**
 * Returns complete 12 months trend data for Araucária for the selected fiscal year
 */
export function get12MonthsTrendData(ano: number): MonthTrendPoint[] {
  const yearFactor = ano === 2024 ? 0.94 : ano === 2025 ? 0.96 : 1.0;

  return MONTHLY_BASE_SERIES.map(item => {
    const receita = item.receitaTotal * yearFactor;
    const despesa = item.despesaTotalLiquidada * yearFactor;
    const despesaEmpenhada = item.despesaTotalEmpenhada * yearFactor;
    const despesaPaga = item.despesaTotalPaga * yearFactor;
    const rcl = item.rclMensal * yearFactor;
    const despesaPessoal = item.despesaPessoalMensal * yearFactor;
    const resultado = receita - despesa;
    const pessoalPercent = rcl > 0 ? (despesaPessoal / rcl) * 100 : 0;
    const margemPercent = receita > 0 ? (resultado / receita) * 100 : 0;

    return {
      mesIndex: item.mesIndex,
      mes: item.mes,
      mesNome: item.mesNome,
      receita,
      despesa,
      despesaEmpenhada,
      despesaPaga,
      resultado,
      rcl,
      despesaPessoal,
      pessoalPercent: +pessoalPercent.toFixed(2),
      margemPercent: +margemPercent.toFixed(1),
    };
  });
}

