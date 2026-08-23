import React, { useState } from 'react';
import {
  Receipt,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  HeartPulse,
  Building2,
  Shield,
  Users,
  ShieldCheck,
  Briefcase,
  Trees,
  Filter,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ExpenseNature, ExpenseFunction, ComparativeAnalysis, ComparativeMode, MonthlyComparativeAnalysis, QuarterlyComparativeAnalysis } from '../types/fiscal';
import { formatCompactCurrency, formatCurrency, formatPercent, exportToCSV } from '../utils/formatters';

interface Module3DespesasProps {
  porNatureza: ExpenseNature[];
  porFuncao: ExpenseFunction[];
  ano: number;
  searchQuery: string;
  isComparativoAnual?: boolean;
  comparativeMode?: ComparativeMode;
  activeMode?: ComparativeMode;
  comparativeData?: ComparativeAnalysis | null;
  monthlyComparativeData?: MonthlyComparativeAnalysis | null;
  quarterlyComparativeData?: QuarterlyComparativeAnalysis | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#f97316'];

export const Module3Despesas: React.FC<Module3DespesasProps> = ({
  porNatureza,
  porFuncao,
  ano,
  searchQuery,
  isComparativoAnual = false,
  comparativeMode,
  activeMode: activeModeProp,
  comparativeData = null,
  monthlyComparativeData = null,
  quarterlyComparativeData = null,
}) => {
  const [viewMode, setViewMode] = useState<'funcao' | 'natureza'>('funcao');

  const activeMode: ComparativeMode = activeModeProp || comparativeMode || (isComparativoAnual ? 'anual' : 'nenhum');

  // Safe arrays
  const safeFuncao = Array.isArray(porFuncao) ? porFuncao : [];
  const safeNatureza = Array.isArray(porNatureza) ? porNatureza : [];

  // Filter lists based on search
  const filteredFuncoes = safeFuncao.filter(
    f => !f || searchQuery === '' || (f.funcao && f.funcao.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredNaturezas = safeNatureza.filter(
    n => !n || searchQuery === '' || (n.categoria && n.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalEmpenhado = safeNatureza.reduce((a, b) => a + (b?.empenhado || 0), 0);
  const totalLiquidado = safeNatureza.reduce((a, b) => a + (b?.liquidado || 0), 0);
  const totalPago = safeNatureza.reduce((a, b) => a + (b?.pago || 0), 0);
  const totalOrcado = safeNatureza.reduce((a, b) => a + (b?.orcado || 0), 0);

  // Monthly ratio for expenses
  const monthlyRatio = monthlyComparativeData && monthlyComparativeData.despesaTotalLiquidada.anterior > 0
    ? monthlyComparativeData.despesaTotalLiquidada.atual / monthlyComparativeData.despesaTotalLiquidada.anterior
    : 1;

  const quarterlyRatio = quarterlyComparativeData && quarterlyComparativeData.despesaTotalLiquidada.anterior > 0
    ? quarterlyComparativeData.despesaTotalLiquidada.atual / quarterlyComparativeData.despesaTotalLiquidada.anterior
    : 1.05;

  // Comparative lookup maps (Annual)
  const natCompMap = new Map<string, { deltaNominal: number; variacaoPct: number; anterior: number }>();
  if (comparativeData?.despesasPorNatureza) {
    comparativeData.despesasPorNatureza.forEach(item => {
      natCompMap.set(item.id, {
        deltaNominal: item.diferencaNominal,
        variacaoPct: item.variacaoPct,
        anterior: item.anterior,
      });
    });
  }

  const funcCompMap = new Map<string, { deltaNominal: number; variacaoPct: number; anterior: number }>();
  if (comparativeData?.despesasPorFuncao) {
    comparativeData.despesasPorFuncao.forEach(item => {
      funcCompMap.set(item.id, {
        deltaNominal: item.diferencaNominal,
        variacaoPct: item.variacaoPct,
        anterior: item.anterior,
      });
    });
  }

  // Bar chart by function (in R$ Millions)
  let barChartFuncoes: any[] = [];
  if (activeMode === 'anual' && comparativeData) {
    barChartFuncoes = porFuncao.map(f => {
      const comp = funcCompMap.get(f.id);
      const name = f.funcao && f.funcao.includes(' - ') ? f.funcao.split(' - ')[1] : (f.funcao || 'Outras');
      return {
        name,
        fullName: f.funcao || name,
        [`${comparativeData.anoAnterior}`]: comp ? +(comp.anterior / 1_000_000).toFixed(1) : 0,
        [`${comparativeData.anoAtual}`]: +(f.liquidado / 1_000_000).toFixed(1),
      };
    });
  } else if (activeMode === 'trimestral' && quarterlyComparativeData) {
    barChartFuncoes = porFuncao.map(f => {
      const triAtualVal = +((f.liquidado * (3 / 8)) / 1_000_000).toFixed(2);
      const triAnteriorVal = +((triAtualVal / quarterlyRatio) / 1_000_000).toFixed(2);
      const name = f.funcao && f.funcao.includes(' - ') ? f.funcao.split(' - ')[1] : (f.funcao || 'Outras');
      return {
        name,
        fullName: f.funcao || name,
        [`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.anoAnterior}`]: triAnteriorVal,
        [`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.ano}`]: triAtualVal,
      };
    });
  } else if (activeMode === 'mensal' && monthlyComparativeData) {
    barChartFuncoes = porFuncao.map(f => {
      const mesAtualVal = +((f.liquidado / 8) / 1_000_000).toFixed(2);
      const mesAnteriorVal = +((f.liquidado / 8 / monthlyRatio) / 1_000_000).toFixed(2);
      const name = f.funcao && f.funcao.includes(' - ') ? f.funcao.split(' - ')[1] : (f.funcao || 'Outras');
      return {
        name,
        fullName: f.funcao || name,
        [`${monthlyComparativeData.mesAnterior}`]: mesAnteriorVal,
        [`${monthlyComparativeData.mesAtual}`]: mesAtualVal,
      };
    });
  } else {
    barChartFuncoes = porFuncao.map(f => {
      const name = f.funcao && f.funcao.includes(' - ') ? f.funcao.split(' - ')[1] : (f.funcao || 'Outras');
      return {
        name,
        fullName: f.funcao || name,
        Orçado: +(f.orcado / 1_000_000).toFixed(1),
        Liquidado: +(f.liquidado / 1_000_000).toFixed(1),
        Pago: +(f.pago / 1_000_000).toFixed(1),
      };
    });
  }

  // Pie chart by nature
  const pieChartNatureza = porNatureza.map(n => ({
    name: n.categoria && n.categoria.includes('.') ? n.categoria.split('.')[1]?.trim() || n.categoria : (n.categoria || 'Outras'),
    value: +(n.liquidado / 1_000_000).toFixed(1),
    percentual: n.percentualTotal || 0,
  }));

  const handleExportCSV = () => {
    if (viewMode === 'funcao') {
      const exportData = filteredFuncoes.map(f => {
        const comp = funcCompMap.get(f.id);
        const mesAtualVal = f.liquidado / 8;
        const mesAnteriorVal = mesAtualVal / monthlyRatio;
        const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

        return {
          'Exercício': ano,
          'Função de Governo': f.funcao,
          'Valor Orçado (R$)': f.orcado,
          'Valor Empenhado (R$)': f.empenhado,
          'Valor Liquidado (R$)': f.liquidado,
          'Valor Pago (R$)': f.pago,
          ...(activeMode === 'anual' && comparativeData
            ? {
                [`Liquidado ${comparativeData.anoAnterior} (R$)`]: comp ? comp.anterior : '-',
                'Variação Nominal YoY (R$)': comp ? comp.deltaNominal : '-',
                'Variação Percentual YoY (%)': comp ? `${comp.variacaoPct.toFixed(2)}%` : '-',
              }
            : {}),
          ...(activeMode === 'mensal' && monthlyComparativeData
            ? {
                [`Liquidado Mês ${monthlyComparativeData.mesAtual} (R$)`]: mesAtualVal.toFixed(2),
                [`Liquidado Mês ${monthlyComparativeData.mesAnterior} (R$)`]: mesAnteriorVal.toFixed(2),
                'Variação MoM (%)': `${varMoM.toFixed(2)}%`,
              }
            : {}),
          '% do Orçamento Total': f.percentualOrcamento + '%',
        };
      });
      const suffix = activeMode === 'anual' ? '_comparativo_anual' : activeMode === 'mensal' ? '_comparativo_mensal' : '';
      exportToCSV(`despesas_funcao_araucaria_${ano}${suffix}`, exportData);
    } else {
      const exportData = filteredNaturezas.map(n => {
        const comp = natCompMap.get(n.id);
        const mesAtualVal = n.liquidado / 8;
        const mesAnteriorVal = mesAtualVal / monthlyRatio;
        const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

        return {
          'Exercício': ano,
          'Categoria Econômica / Natureza': n.categoria,
          'Valor Orçado (R$)': n.orcado,
          'Valor Empenhado (R$)': n.empenhado,
          'Valor Liquidado (R$)': n.liquidado,
          'Valor Pago (R$)': n.pago,
          ...(activeMode === 'anual' && comparativeData
            ? {
                [`Liquidado ${comparativeData.anoAnterior} (R$)`]: comp ? comp.anterior : '-',
                'Variação Nominal YoY (R$)': comp ? comp.deltaNominal : '-',
                'Variação Percentual YoY (%)': comp ? `${comp.variacaoPct.toFixed(2)}%` : '-',
              }
            : {}),
          ...(activeMode === 'mensal' && monthlyComparativeData
            ? {
                [`Liquidado Mês ${monthlyComparativeData.mesAtual} (R$)`]: mesAtualVal.toFixed(2),
                [`Liquidado Mês ${monthlyComparativeData.mesAnterior} (R$)`]: mesAnteriorVal.toFixed(2),
                'Variação MoM (%)': `${varMoM.toFixed(2)}%`,
              }
            : {}),
          '% do Total': n.percentualTotal + '%',
        };
      });
      const suffix = activeMode === 'anual' ? '_comparativo_anual' : activeMode === 'mensal' ? '_comparativo_mensal' : '';
      exportToCSV(`despesas_natureza_araucaria_${ano}${suffix}`, exportData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ORÇAMENTO FIXADO (LOA)</span>
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
            {formatCompactCurrency(totalOrcado)}
          </div>
          <span className="text-[10px] font-mono text-slate-400">Total aprovado para {ano}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DESPESA EMPENHADA</span>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-blue-600 dark:text-blue-400">
            {formatCompactCurrency(totalEmpenhado)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">{formatPercent((totalEmpenhado / totalOrcado) * 100)} do orçado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DESPESA LIQUIDADA</span>
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-indigo-600 dark:text-indigo-400">
            {formatCompactCurrency(totalLiquidado)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">{formatPercent((totalLiquidado / totalEmpenhado) * 100)} do empenhado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/80 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">DESPESA PAGA</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
            {formatCompactCurrency(totalPago)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">{formatPercent((totalPago / totalLiquidado) * 100)} da liquidação</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Function Breakdown Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                {activeMode === 'anual' && comparativeData
                  ? `Comparativo por Função: ${comparativeData.anoAnterior} vs ${comparativeData.anoAtual} (R$ Mi)`
                  : activeMode === 'trimestral' && quarterlyComparativeData
                  ? `Comparativo Trimestral por Função: ${quarterlyComparativeData.trimestreNome} (${quarterlyComparativeData.anoAnterior} vs ${quarterlyComparativeData.ano}) (R$ Mi)`
                  : activeMode === 'mensal' && monthlyComparativeData
                  ? `Comparativo Mensal por Função: ${monthlyComparativeData.mesAnterior} vs ${monthlyComparativeData.mesAtual} (R$ Mi)`
                  : 'Execução Orçamentária por Função de Governo (R$ Milhões)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeMode === 'anual' && comparativeData
                  ? `Evolução anual do valor liquidado por pasta/função de governo`
                  : activeMode === 'trimestral' && quarterlyComparativeData
                  ? `Variação trimestral acumulada (${quarterlyComparativeData.meses?.join(', ') || ''}) comparando os exercícios`
                  : activeMode === 'mensal' && monthlyComparativeData
                  ? `Variação mês a mês do valor liquidado por pasta/função de governo`
                  : 'Educação e Saúde concentram quase 50% dos gastos municipais'}
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              SICONFI / RREO ANEXO 02
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartFuncoes} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'monospace' }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${val} milhões`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontFamily: 'monospace' }} />
                {activeMode === 'anual' && comparativeData ? (
                  <>
                    <Bar dataKey={`${comparativeData.anoAnterior}`} fill="#94a3b8" radius={[1, 1, 0, 0]} />
                    <Bar dataKey={`${comparativeData.anoAtual}`} fill="#3b82f6" radius={[1, 1, 0, 0]} />
                  </>
                ) : activeMode === 'trimestral' && quarterlyComparativeData ? (
                  <>
                    <Bar dataKey={`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.anoAnterior}`} fill="#94a3b8" radius={[1, 1, 0, 0]} />
                    <Bar dataKey={`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.ano}`} fill="#6366f1" radius={[1, 1, 0, 0]} />
                  </>
                ) : activeMode === 'mensal' && monthlyComparativeData ? (
                  <>
                    <Bar dataKey={`${monthlyComparativeData.mesAnterior}`} fill="#94a3b8" radius={[1, 1, 0, 0]} />
                    <Bar dataKey={`${monthlyComparativeData.mesAtual}`} fill="#6366f1" radius={[1, 1, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="Orçado" fill="#94a3b8" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="Liquidado" fill="#3b82f6" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="Pago" fill="#10b981" radius={[1, 1, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nature Breakdown Pie / Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Despesas por Natureza Econômica
              </h3>
              <p className="text-[11px] text-slate-500">Composição percentual das despesas</p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartNatureza}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartNatureza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`R$ ${val} mi`, 'Valor Liquidado']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800 font-mono">
            {pieChartNatureza.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px] font-sans text-xs">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-[11px]">{item.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Switcher & Table */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-sm border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('funcao')}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer ${
              viewMode === 'funcao'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão por Função de Governo ({filteredFuncoes.length})
          </button>
          <button
            onClick={() => setViewMode('natureza')}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer ${
              viewMode === 'natureza'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão por Natureza de Despesa ({filteredNaturezas.length})
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-sm hover:bg-emerald-100 transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Exportar Despesas (CSV)</span>
        </button>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {viewMode === 'funcao' ? (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-sans">Função de Governo</th>
                  <th className="py-2.5 px-4 text-right">Fixado (LOA)</th>
                  {activeMode === 'anual' && comparativeData && (
                    <>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Liquidado {comparativeData.anoAnterior}
                      </th>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Variação YoY (%)
                      </th>
                    </>
                  )}
                  {activeMode === 'trimestral' && quarterlyComparativeData && (
                    <>
                      <th className="py-2.5 px-4 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300">
                        {quarterlyComparativeData.trimestreNome}/{quarterlyComparativeData.anoAnterior}
                      </th>
                      <th className="py-2.5 px-4 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300">
                        Var. Tri YoY (%)
                      </th>
                    </>
                  )}
                  {activeMode === 'mensal' && monthlyComparativeData && (
                    <>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Mês {monthlyComparativeData.mesAnterior}
                      </th>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Variação MoM (%)
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-4 text-right">Empenhado</th>
                  <th className="py-2.5 px-4 text-right">
                    Liquidado {activeMode === 'mensal' && monthlyComparativeData ? `(${monthlyComparativeData.mesAtual})` : activeMode === 'trimestral' && quarterlyComparativeData ? `(${quarterlyComparativeData.trimestreNome})` : ano}
                  </th>
                  <th className="py-2.5 px-4 text-right">Pago</th>
                  <th className="py-2.5 px-4 text-center">% Orçamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredFuncoes.map(f => {
                  const comp = funcCompMap.get(f.id);
                  const mesAtualVal = f.liquidado / 8;
                  const mesAnteriorVal = mesAtualVal / monthlyRatio;
                  const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

                  const triAtualVal = f.liquidado * (3 / 8);
                  const triAnteriorVal = triAtualVal / quarterlyRatio;
                  const varTri = ((triAtualVal - triAnteriorVal) / triAnteriorVal) * 100;

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                        {f.funcao}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(f.orcado)}
                      </td>
                      {activeMode === 'anual' && comparativeData && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                            {comp ? formatCurrency(comp.anterior) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold bg-blue-50/30 dark:bg-blue-950/10">
                            {comp ? (
                              <span className={`inline-flex items-center gap-0.5 ${comp.variacaoPct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {comp.variacaoPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {comp.variacaoPct >= 0 ? '+' : ''}{comp.variacaoPct.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                        </>
                      )}
                      {activeMode === 'trimestral' && quarterlyComparativeData && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-indigo-50/30 dark:bg-indigo-950/10">
                            {formatCurrency(triAnteriorVal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold bg-indigo-50/30 dark:bg-indigo-950/10">
                            <span className={`inline-flex items-center gap-0.5 ${varTri <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {varTri >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {varTri >= 0 ? '+' : ''}{varTri.toFixed(1)}%
                            </span>
                          </td>
                        </>
                      )}
                      {activeMode === 'mensal' && monthlyComparativeData && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                            {formatCurrency(mesAnteriorVal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold bg-blue-50/30 dark:bg-blue-950/10">
                            <span className={`inline-flex items-center gap-0.5 ${varMoM <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {varMoM >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {varMoM >= 0 ? '+' : ''}{varMoM.toFixed(1)}%
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(f.empenhado / 8) : activeMode === 'trimestral' && quarterlyComparativeData ? formatCurrency(f.empenhado * (3 / 8)) : formatCurrency(f.empenhado)}
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(mesAtualVal) : activeMode === 'trimestral' && quarterlyComparativeData ? formatCurrency(triAtualVal) : formatCurrency(f.liquidado)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(f.pago / 8) : activeMode === 'trimestral' && quarterlyComparativeData ? formatCurrency(f.pago * (3 / 8)) : formatCurrency(f.pago)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {f.percentualOrcamento}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-sans">Natureza da Despesa</th>
                  <th className="py-2.5 px-4 text-right">Fixado (LOA)</th>
                  {activeMode === 'anual' && comparativeData && (
                    <>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Liquidado {comparativeData.anoAnterior}
                      </th>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Variação YoY (%)
                      </th>
                    </>
                  )}
                  {activeMode === 'mensal' && monthlyComparativeData && (
                    <>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Mês {monthlyComparativeData.mesAnterior}
                      </th>
                      <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        Variação MoM (%)
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-4 text-right">Empenhado</th>
                  <th className="py-2.5 px-4 text-right">
                    Liquidado {activeMode === 'mensal' && monthlyComparativeData ? `(${monthlyComparativeData.mesAtual})` : ano}
                  </th>
                  <th className="py-2.5 px-4 text-right">Pago</th>
                  <th className="py-2.5 px-4 text-center">% Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredNaturezas.map(n => {
                  const comp = natCompMap.get(n.id);
                  const mesAtualVal = n.liquidado / 8;
                  const mesAnteriorVal = mesAtualVal / monthlyRatio;
                  const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                        {n.categoria}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(n.orcado)}
                      </td>
                      {activeMode === 'anual' && comparativeData && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                            {comp ? formatCurrency(comp.anterior) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold bg-blue-50/30 dark:bg-blue-950/10">
                            {comp ? (
                              <span className={`inline-flex items-center gap-0.5 ${comp.variacaoPct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {comp.variacaoPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {comp.variacaoPct >= 0 ? '+' : ''}{comp.variacaoPct.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                        </>
                      )}
                      {activeMode === 'mensal' && monthlyComparativeData && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                            {formatCurrency(mesAnteriorVal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold bg-blue-50/30 dark:bg-blue-950/10">
                            <span className={`inline-flex items-center gap-0.5 ${varMoM <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {varMoM >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {varMoM >= 0 ? '+' : ''}{varMoM.toFixed(1)}%
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(n.empenhado / 8) : formatCurrency(n.empenhado)}
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(mesAtualVal) : formatCurrency(n.liquidado)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(n.pago / 8) : formatCurrency(n.pago)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {n.percentualTotal}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
