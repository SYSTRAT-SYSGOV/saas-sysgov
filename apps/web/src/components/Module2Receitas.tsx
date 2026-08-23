import React, { useState } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RevenueSource, ComparativeAnalysis, ComparativeMode, MonthlyComparativeAnalysis, QuarterlyComparativeAnalysis } from '../types/fiscal';
import { formatCompactCurrency, formatCurrency, formatPercent, exportToCSV } from '../utils/formatters';
import { DataSourceBadge } from './DataSourceBadge';
import { SimuladorReformaTributaria } from './SimuladorReformaTributaria';
import { Sparkles, Layers } from 'lucide-react';

interface Module2ReceitasProps {
  receitas: RevenueSource[];
  ano: number;
  searchQuery: string;
  isComparativoAnual?: boolean;
  comparativeMode?: ComparativeMode;
  activeMode?: ComparativeMode;
  comparativeData?: ComparativeAnalysis | null;
  monthlyComparativeData?: MonthlyComparativeAnalysis | null;
  quarterlyComparativeData?: QuarterlyComparativeAnalysis | null;
}

export const Module2Receitas: React.FC<Module2ReceitasProps> = ({
  receitas,
  ano,
  searchQuery,
  isComparativoAnual = false,
  comparativeMode,
  activeMode: activeModeProp,
  comparativeData = null,
  monthlyComparativeData = null,
  quarterlyComparativeData = null,
}) => {
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [selectedFonteId, setSelectedFonteId] = useState<string>('todas');
  const [visao, setVisao] = useState<'execucao' | 'reforma'>('execucao');

  const activeMode: ComparativeMode = activeModeProp || comparativeMode || (isComparativoAnual ? 'anual' : 'nenhum');

  // Categories list
  const categorias = ['todas', 'Transferências do Estado', 'Tributária Própria', 'Transferências da União', 'Royalties/Compensações', 'Outras'];

  // Safe list of receitas
  const safeReceitas = Array.isArray(receitas) ? receitas : ((receitas as any)?.receitas || []);

  // Filtered list
  const filteredReceitas = safeReceitas.filter(r => {
    if (!r) return false;
    const matchesSearch =
      searchQuery === '' ||
      (r.nome && r.nome.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.categoria && r.categoria.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategoria = selectedCategoria === 'todas' || r.categoria === selectedCategoria;
    const matchesFonte = selectedFonteId === 'todas' || r.id === selectedFonteId;
    return matchesSearch && matchesCategoria && matchesFonte;
  });

  // Comparative lookup map
  const compMap = new Map<string, { deltaNominal: number; variacaoPct: number; anterior: number }>();
  if (comparativeData?.receitasPorFonte) {
    comparativeData.receitasPorFonte.forEach(item => {
      compMap.set(item.id, {
        deltaNominal: item.diferencaNominal,
        variacaoPct: item.variacaoPct,
        anterior: item.anterior,
      });
    });
  }

  const monthlyRatio = monthlyComparativeData && monthlyComparativeData.receitaTotal.anterior > 0
    ? monthlyComparativeData.receitaTotal.atual / monthlyComparativeData.receitaTotal.anterior
    : 1;

  const quarterlyRatio = quarterlyComparativeData && quarterlyComparativeData.receitaTotal.anterior > 0
    ? quarterlyComparativeData.receitaTotal.atual / quarterlyComparativeData.receitaTotal.anterior
    : 1.05;

  // Calculate totals
  const totalOrcado = filteredReceitas.reduce((acc, r) => acc + r.orcado, 0);
  const totalReestimado = filteredReceitas.reduce((acc, r) => acc + r.reestimado, 0);
  const totalRealizado = filteredReceitas.reduce((acc, r) => acc + r.realizado, 0);
  const percentRealizado = totalReestimado > 0 ? (totalRealizado / totalReestimado) * 100 : 0;

  // Monthly aggregated series for the line chart
  const monthlyData = [
    { mes: 'Jan', ICMS: 46.2, IPVA: 18.2, Royalties: 4.8, FPM: 9.4, ISSQN: 11.8, IPTU: 8.2 },
    { mes: 'Fev', ICMS: 48.1, IPVA: 12.9, Royalties: 4.9, FPM: 10.8, ISSQN: 12.1, IPTU: 28.5 },
    { mes: 'Mar', ICMS: 47.5, IPVA: 8.4, Royalties: 4.7, FPM: 8.9, ISSQN: 11.9, IPTU: 12.4 },
    { mes: 'Abr', ICMS: 45.9, IPVA: 4.2, Royalties: 5.1, FPM: 9.2, ISSQN: 12.3, IPTU: 6.8 },
    { mes: 'Mai', ICMS: 48.3, IPVA: 3.1, Royalties: 4.8, FPM: 9.6, ISSQN: 12.0, IPTU: 6.7 },
    { mes: 'Jun', ICMS: 46.8, IPVA: 2.7, Royalties: 4.9, FPM: 9.1, ISSQN: 12.2, IPTU: 6.6 },
    { mes: 'Jul', ICMS: 47.9, IPVA: 2.6, Royalties: 4.85, FPM: 8.9, ISSQN: 12.4, IPTU: 6.7 },
    { mes: 'Ago', ICMS: 47.7, IPVA: 2.5, Royalties: 4.85, FPM: 8.7, ISSQN: 12.1, IPTU: 6.6 },
  ];

  // Bar chart data for Orçado vs Reestimado vs Realizado por Fonte or Comparative YoY/MoM/Trimestral
  let barChartData: any[] = [];
  if (activeMode === 'anual' && comparativeData) {
    barChartData = receitas.map(r => {
      const comp = compMap.get(r.id);
      const prevVal = comp ? +(comp.anterior / 1_000_000).toFixed(1) : 0;
      return {
        name: r.nome.length > 18 ? r.nome.substring(0, 16) + '...' : r.nome,
        fullName: r.nome,
        [`${comparativeData.anoAnterior}`]: prevVal,
        [`${comparativeData.anoAtual}`]: +(r.reestimado / 1_000_000).toFixed(1),
      };
    });
  } else if (activeMode === 'trimestral' && quarterlyComparativeData) {
    barChartData = receitas.map(r => {
      const triAtualVal = +((r.realizado * (3 / 8)) / 1_000_000).toFixed(2);
      const triAnteriorVal = +((triAtualVal / quarterlyRatio) / 1_000_000).toFixed(2);
      return {
        name: r.nome.length > 18 ? r.nome.substring(0, 16) + '...' : r.nome,
        fullName: r.nome,
        [`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.anoAnterior}`]: triAnteriorVal,
        [`${quarterlyComparativeData.trimestreNome}/${quarterlyComparativeData.ano}`]: triAtualVal,
      };
    });
  } else if (activeMode === 'mensal' && monthlyComparativeData) {
    barChartData = receitas.map(r => {
      const mesAtualVal = +((r.realizado / 8) / 1_000_000).toFixed(2);
      const mesAnteriorVal = +((r.realizado / 8 / monthlyRatio) / 1_000_000).toFixed(2);
      return {
        name: r.nome.length > 18 ? r.nome.substring(0, 16) + '...' : r.nome,
        fullName: r.nome,
        [`${monthlyComparativeData.mesAnterior}`]: mesAnteriorVal,
        [`${monthlyComparativeData.mesAtual}`]: mesAtualVal,
      };
    });
  } else {
    barChartData = receitas.map(r => ({
      name: r.nome.length > 20 ? r.nome.substring(0, 18) + '...' : r.nome,
      fullName: r.nome,
      Orçado: +(r.orcado / 1_000_000).toFixed(1),
      Reestimado: +(r.reestimado / 1_000_000).toFixed(1),
      Realizado: +(r.realizado / 1_000_000).toFixed(1),
    }));
  }

  const handleExportCSV = () => {
    const exportData = filteredReceitas.map(r => {
      const comp = compMap.get(r.id);
      const mesAtualVal = r.realizado / 8;
      const mesAnteriorVal = mesAtualVal / monthlyRatio;
      const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

      return {
        'Exercício': ano,
        'Fonte de Receita': r.nome,
        'Categoria Econômica': r.categoria,
        'Valor Orçado (R$)': r.orcado,
        'Valor Reestimado (R$)': r.reestimado,
        'Valor Realizado (R$)': r.realizado,
        '% Realizado / Reestimado': ((r.realizado / r.reestimado) * 100).toFixed(2) + '%',
        ...(activeMode === 'anual' && comparativeData
          ? {
              [`Valor Reestimado ${comparativeData.anoAnterior} (R$)`]: comp ? comp.anterior : '-',
              'Variação Nominal YoY (R$)': comp ? comp.deltaNominal : '-',
              'Variação Percentual YoY (%)': comp ? `${comp.variacaoPct.toFixed(2)}%` : '-',
            }
          : {}),
        ...(activeMode === 'mensal' && monthlyComparativeData
          ? {
              [`Realizado ${monthlyComparativeData.mesAtual} (R$)`]: mesAtualVal.toFixed(2),
              [`Realizado ${monthlyComparativeData.mesAnterior} (R$)`]: mesAnteriorVal.toFixed(2),
              'Variação MoM (%)': `${varMoM.toFixed(2)}%`,
            }
          : {}),
        'Variação Histórica': r.variacaoPercentual + '%',
      };
    });
    const suffix = activeMode === 'anual' ? '_comparativo_anual' : activeMode === 'mensal' ? '_comparativo_mensal' : '';
    exportToCSV(`receitas_araucaria_${ano}${suffix}`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* Top View Selector: Execução vs Reforma Tributária */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1 rounded-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVisao('execucao')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
              visao === 'execucao'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Execução Orçamentária LOA {ano}</span>
          </button>

          <button
            onClick={() => setVisao('reforma')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
              visao === 'reforma'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulador Reforma Tributária EC 132 (IBS)</span>
          </button>
        </div>
      </div>

      {visao === 'reforma' ? (
        <SimuladorReformaTributaria />
      ) : (
        <>
          {/* Revenue Macro Summary & Reestimation Alert */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ORÇADO INICIAL LOA</span>
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
            {formatCompactCurrency(totalOrcado)}
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">Previsão original</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/80 rounded-sm p-4 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">REESTIMADO {ano}</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              -10.5%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-amber-600 dark:text-amber-400">
            {formatCompactCurrency(totalReestimado)}
          </div>
          <span className="text-[10px] font-mono text-amber-700/80 dark:text-amber-400/80">Impacto queda ICMS / REPAR</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/80 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">ARRECADADO REALIZADO</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
            {formatCompactCurrency(totalRealizado)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">Execução: {formatPercent(percentRealizado)} da meta</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FRUSTRAÇÃO DE RECEITA</span>
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <ArrowDownRight className="w-5 h-5" />
            -{formatCompactCurrency(totalOrcado - totalReestimado)}
          </div>
          <span className="text-[10px] font-mono text-slate-400">Diferença orçado x reestimado</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart: Monthly Evolution by Source */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Evolução Mensal das Principais Receitas (R$ Milhões)
              </h3>
              <p className="text-[11px] text-slate-500">Série histórica apurada ao longo do exercício de {ano}</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              SICONFI / RREO
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${val} milhões`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="ICMS" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="ISSQN" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="IPTU" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="FPM" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="IPVA" stroke="#ec4899" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Royalties" stroke="#14b8a6" strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Orçado vs Reestimado vs Realizado ou Comparativo Anual / Mensal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                {activeMode === 'anual' && comparativeData
                  ? `Comparativo Anual: ${comparativeData.anoAnterior} vs ${comparativeData.anoAtual} (R$ Mi)`
                  : activeMode === 'trimestral' && quarterlyComparativeData
                  ? `Comparativo Trimestral: ${quarterlyComparativeData.trimestreNome} (${quarterlyComparativeData.anoAnterior} vs ${quarterlyComparativeData.ano}) (R$ Mi)`
                  : activeMode === 'mensal' && monthlyComparativeData
                  ? `Comparativo Mensal: ${monthlyComparativeData.mesAnterior} vs ${monthlyComparativeData.mesAtual} (R$ Mi)`
                  : 'Comparativo: Orçado vs Reestimado vs Realizado (R$ Mi)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeMode === 'anual' && comparativeData
                  ? `Variação percentual anual (YoY) e evolução das fontes de arrecadação`
                  : activeMode === 'trimestral' && quarterlyComparativeData
                  ? `Variação percentual trimestral (${quarterlyComparativeData.meses?.join(', ') || ''}) comparando os exercícios`
                  : activeMode === 'mensal' && monthlyComparativeData
                  ? `Variação percentual mês a mês (MoM) das principais fontes de arrecadação`
                  : 'Visualização do impacto nas transferências e tributos'}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-mono font-bold uppercase cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'monospace' }} angle={-20} textAnchor="end" interval={0} />
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
                    <Bar dataKey={`${monthlyComparativeData.mesAtual}`} fill="#0284c7" radius={[1, 1, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="Orçado" fill="#94a3b8" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="Reestimado" fill="#f59e0b" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="Realizado" fill="#10b981" radius={[1, 1, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter Tabs by Category */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoria(cat)}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                selectedCategoria === cat
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'todas' ? 'Todas as Categorias' : cat}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-sm hover:bg-emerald-100 transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Exportar Tabela de Receitas (CSV)</span>
        </button>
      </div>

      {/* Detailed Revenue Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              {activeMode === 'anual' && comparativeData
                ? `Detalhamento Comparativo de Receitas (${comparativeData.anoAtual} vs ${comparativeData.anoAnterior})`
                : activeMode === 'trimestral' && quarterlyComparativeData
                ? `Detalhamento Comparativo Trimestral de Receitas (${quarterlyComparativeData.trimestreNome}: ${quarterlyComparativeData.ano} vs ${quarterlyComparativeData.anoAnterior})`
                : activeMode === 'mensal' && monthlyComparativeData
                ? `Detalhamento Comparativo Mensal de Receitas (${monthlyComparativeData.mesAtual} vs ${monthlyComparativeData.mesAnterior} / ${monthlyComparativeData.ano})`
                : 'Detalhamento das Fontes de Receita Orçamentária'}
            </h3>
            <DataSourceBadge size="xs" />
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {filteredReceitas.length} FONTE(S) SELECIONADA(S)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Fonte de Arrecadação</th>
                <th className="py-2.5 px-4">Categoria</th>
                <th className="py-2.5 px-4 text-right">Orçado LOA</th>
                <th className="py-2.5 px-4 text-right">Reestimado {ano}</th>
                {activeMode === 'anual' && comparativeData && (
                  <>
                    <th className="py-2.5 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                      Reestimado {comparativeData.anoAnterior}
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
                <th className="py-2.5 px-4 text-right">Realizado {activeMode === 'mensal' && monthlyComparativeData ? `(${monthlyComparativeData.mesAtual})` : activeMode === 'trimestral' && quarterlyComparativeData ? `(${quarterlyComparativeData.trimestreNome})` : ''}</th>
                <th className="py-2.5 px-4 text-center">Progresso</th>
                <th className="py-2.5 px-4 text-right">Variação LOA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredReceitas.map(r => {
                const perc = r.reestimado > 0 ? (r.realizado / r.reestimado) * 100 : 0;
                const comp = compMap.get(r.id);
                const mesAtualVal = r.realizado / 8;
                const mesAnteriorVal = mesAtualVal / monthlyRatio;
                const varMoM = ((mesAtualVal - mesAnteriorVal) / mesAnteriorVal) * 100;

                const triAtualVal = r.realizado * (3 / 8);
                const triAnteriorVal = triAtualVal / quarterlyRatio;
                const varTri = ((triAtualVal - triAnteriorVal) / triAnteriorVal) * 100;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition font-mono">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                      <div>{r.nome}</div>
                      {r.detalhes && (
                        <div className="text-[10px] text-slate-400 font-normal font-mono mt-0.5">
                          {r.detalhes.map(d => `${d.item}: ${formatCompactCurrency(d.valor)}`).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(r.orcado)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(r.reestimado)}
                    </td>
                    {activeMode === 'anual' && comparativeData && (
                      <>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                          {comp ? formatCurrency(comp.anterior) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold bg-blue-50/30 dark:bg-blue-950/10">
                          {comp ? (
                            <span className={`inline-flex items-center gap-0.5 ${comp.variacaoPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
                          <span className={`inline-flex items-center gap-0.5 ${varTri >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
                          <span className={`inline-flex items-center gap-0.5 ${varMoM >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {varMoM >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {varMoM >= 0 ? '+' : ''}{varMoM.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {activeMode === 'mensal' && monthlyComparativeData ? formatCurrency(mesAtualVal) : activeMode === 'trimestral' && quarterlyComparativeData ? formatCurrency(triAtualVal) : formatCurrency(r.realizado)}
                    </td>
                    <td className="py-3 px-4 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              perc >= 90 ? 'bg-emerald-500' : perc >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, perc)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{formatPercent(perc, 1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          r.variacaoPercentual < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {r.variacaoPercentual < 0 ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {r.variacaoPercentual}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
    )}
    </div>
  );
};
