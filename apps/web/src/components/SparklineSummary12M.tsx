import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  BrainCircuit,
  Sparkles,
} from 'lucide-react';
import { MonthTrendPoint } from '../types/fiscal';
import { get12MonthsTrendData } from '../utils/comparative';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';

interface SparklineSummary12MProps {
  ano: number;
  onNavigateToTab?: (tabId: string) => void;
  onOpenPredictive?: () => void;
}

export const SparklineSummary12M: React.FC<SparklineSummary12MProps> = ({
  ano,
  onNavigateToTab,
  onOpenPredictive,
}) => {
  const [chartMode, setChartMode] = useState<'composed' | 'lines' | 'bars'>('composed');
  const [showReceita, setShowReceita] = useState<boolean>(true);
  const [showDespesa, setShowDespesa] = useState<boolean>(true);
  const [showResultado, setShowResultado] = useState<boolean>(true);
  const [showEmpenhada, setShowEmpenhada] = useState<boolean>(false);
  const [showMedia, setShowMedia] = useState<boolean>(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Compute 12-month series for the selected year
  const trendData = useMemo(() => get12MonthsTrendData(ano), [ano]);

  // Aggregates & Insights
  const stats = useMemo(() => {
    const totalReceita = trendData.reduce((acc, d) => acc + d.receita, 0);
    const totalDespesa = trendData.reduce((acc, d) => acc + d.despesa, 0);
    const totalEmpenhada = trendData.reduce((acc, d) => acc + d.despesaEmpenhada, 0);
    const totalPaga = trendData.reduce((acc, d) => acc + d.despesaPaga, 0);
    const totalResultado = totalReceita - totalDespesa;

    const mediaReceita = totalReceita / trendData.length;
    const mediaDespesa = totalDespesa / trendData.length;

    const maxReceita = [...trendData].sort((a, b) => b.receita - a.receita)[0];
    const minReceita = [...trendData].sort((a, b) => a.receita - b.receita)[0];

    const maxDespesa = [...trendData].sort((a, b) => b.despesa - a.despesa)[0];
    const minDespesa = [...trendData].sort((a, b) => a.despesa - b.despesa)[0];

    const maxResultado = [...trendData].sort((a, b) => b.resultado - a.resultado)[0];

    const mesesSuperavit = trendData.filter(d => d.resultado >= 0).length;

    return {
      totalReceita,
      totalDespesa,
      totalEmpenhada,
      totalPaga,
      totalResultado,
      mediaReceita,
      mediaDespesa,
      maxReceita,
      minReceita,
      maxDespesa,
      minDespesa,
      maxResultado,
      mesesSuperavit,
    };
  }, [trendData]);

  // Selected month detail (if clicked)
  const selectedPoint = selectedMonthIndex !== null ? trendData[selectedMonthIndex] : null;

  // Custom recharts tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: MonthTrendPoint = payload[0]?.payload;
      const rec = dataPoint.receita;
      const desp = dataPoint.despesa;
      const res = dataPoint.resultado;
      const isSuperavit = res >= 0;

      return (
        <div className="bg-slate-950/95 border border-slate-700 text-white p-3 rounded-sm shadow-xl font-mono text-xs space-y-2 backdrop-blur-sm min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {dataPoint.mesNome} / {ano}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              isSuperavit ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {isSuperavit ? 'SUPERÁVIT' : 'DÉFICIT'} ({dataPoint.margemPercent > 0 ? '+' : ''}{dataPoint.margemPercent}%)
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Receita Realizada:
              </span>
              <span className="font-bold">{formatCurrency(rec)}</span>
            </div>

            <div className="flex justify-between items-center text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                Despesa Liquidada:
              </span>
              <span className="font-bold">{formatCurrency(desp)}</span>
            </div>

            {showEmpenhada && (
              <div className="flex justify-between items-center text-indigo-300 text-[10px]">
                <span>Despesa Empenhada:</span>
                <span>{formatCurrency(dataPoint.despesaEmpenhada)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-400 text-[10px]">
              <span>Despesa Paga:</span>
              <span>{formatCurrency(dataPoint.despesaPaga)}</span>
            </div>

            <div className="border-t border-slate-800 pt-1 flex justify-between items-center font-bold">
              <span className="text-slate-300">Resultado do Mês:</span>
              <span className={isSuperavit ? 'text-emerald-400' : 'text-rose-400'}>
                {isSuperavit ? '+' : ''}{formatCurrency(res)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Folha / RCL no mês:</span>
              <span className={dataPoint.pessoalPercent >= 48.6 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                {dataPoint.pessoalPercent}% (LRF)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
              SPARKLINE & EVOLUÇÃO ORÇAMENTÁRIA DOS ÚLTIMOS 12 MESES ({ano})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Série temporal de arrecadação de receitas vs. liquidação de despesas municipais com médias e saldo
          </p>
        </div>

        {/* Action / View Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Types */}
          <div className="inline-flex rounded-sm bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              id="sparkline-mode-composed"
              onClick={() => setChartMode('composed')}
              className={`px-2.5 py-1 rounded-xs text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                chartMode === 'composed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visão Curvas Suaves + Área de Superávit"
            >
              <Layers className="w-3 h-3" />
              <span>Curvas & Saldo</span>
            </button>
            <button
              type="button"
              id="sparkline-mode-lines"
              onClick={() => setChartMode('lines')}
              className={`px-2.5 py-1 rounded-xs text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                chartMode === 'lines'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visão Sparkline Linhas Puras"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Sparklines</span>
            </button>
            <button
              type="button"
              id="sparkline-mode-bars"
              onClick={() => setChartMode('bars')}
              className={`px-2.5 py-1 rounded-xs text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                chartMode === 'bars'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visão Barras Comparativas Lado a Lado"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Barras</span>
            </button>
          </div>

          {/* Quick Filter Series Toggle Pills */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setShowReceita(!showReceita)}
              className={`px-2 py-1 rounded-sm border transition flex items-center gap-1 cursor-pointer ${
                showReceita
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
              }`}
              title="Alternar visibilidade de Receitas"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Receitas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDespesa(!showDespesa)}
              className={`px-2 py-1 rounded-sm border transition flex items-center gap-1 cursor-pointer ${
                showDespesa
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
              }`}
              title="Alternar visibilidade de Despesas"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Despesas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResultado(!showResultado)}
              className={`px-2 py-1 rounded-sm border transition flex items-center gap-1 cursor-pointer ${
                showResultado
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
              }`}
              title="Alternar visibilidade do Resultado Mensal"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Saldo Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMedia(!showMedia)}
              className={`px-2 py-1 rounded-sm border transition flex items-center gap-1 cursor-pointer ${
                showMedia
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
              }`}
              title="Mostrar/Ocultar linha de Média Mensal"
            >
              <span>Médias</span>
            </button>

            {onOpenPredictive && (
              <button
                type="button"
                id="sparkline-open-predictive-btn"
                onClick={onOpenPredictive}
                className="px-2.5 py-1 rounded-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer ml-1"
                title="Abrir Análise Preditiva de IA para os últimos 6 meses"
              >
                <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                <span>Análise Preditiva</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Sparkline & Trend Chart Container */}
      <div className="h-64 sm:h-72 w-full pt-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'composed' ? (
            <ComposedChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              onClick={(state) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setSelectedMonthIndex(Number(state.activeTooltipIndex));
                }
              }}
            >
              <defs>
                <linearGradient id="gradientReceitaSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientDespesaSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientResultadoSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#475569', opacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 15000000', 'dataMax + 10000000']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }}
              />

              {showMedia && (
                <>
                  <ReferenceLine
                    y={stats.mediaReceita}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Média Rec: ${formatCompactCurrency(stats.mediaReceita)}`,
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopLeft',
                      fontFamily: 'monospace',
                    }}
                  />
                  <ReferenceLine
                    y={stats.mediaDespesa}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Média Desp: ${formatCompactCurrency(stats.mediaDespesa)}`,
                      fill: '#3b82f6',
                      fontSize: 10,
                      position: 'insideBottomLeft',
                      fontFamily: 'monospace',
                    }}
                  />
                </>
              )}

              {showResultado && (
                <Bar
                  dataKey="resultado"
                  name="Saldo / Superávit"
                  fill="#f59e0b"
                  opacity={0.6}
                  radius={[2, 2, 0, 0]}
                  barSize={12}
                />
              )}

              {showReceita && (
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita Realizada"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientReceitaSpark)"
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                />
              )}

              {showDespesa && (
                <Area
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa Liquidada"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientDespesaSpark)"
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                />
              )}
            </ComposedChart>
          ) : chartMode === 'lines' ? (
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#475569', opacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }}
              />

              {showReceita && (
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita Realizada"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#10b981' }}
                  activeDot={{ r: 7 }}
                />
              )}

              {showDespesa && (
                <Line
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa Liquidada"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#3b82f6' }}
                  activeDot={{ r: 7 }}
                />
              )}

              {showResultado && (
                <Line
                  type="monotone"
                  dataKey="resultado"
                  name="Saldo Mensal"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#475569', opacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }}
              />

              {showReceita && (
                <Bar
                  dataKey="receita"
                  name="Receita Realizada"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
              )}

              {showDespesa && (
                <Bar
                  dataKey="despesa"
                  name="Despesa Liquidada"
                  fill="#3b82f6"
                  radius={[3, 3, 0, 0]}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 3 Dedicated Micro-Sparklines Strips with Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Micro Sparkline 1: Receita */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-sm p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Tendência de Receitas (12 Meses)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Média: {formatCompactCurrency(stats.mediaReceita)}/mês</span>
          </div>

          <div className="h-10 my-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Pico: <strong>{stats.maxReceita.mes} ({formatCompactCurrency(stats.maxReceita.receita)})</strong></span>
            <span>Mínimo: <strong>{stats.minReceita.mes} ({formatCompactCurrency(stats.minReceita.receita)})</strong></span>
          </div>
        </div>

        {/* Micro Sparkline 2: Despesa */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-sm p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Tendência de Despesas (12 Meses)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Média: {formatCompactCurrency(stats.mediaDespesa)}/mês</span>
          </div>

          <div className="h-10 my-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="despesa"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Pico: <strong>{stats.maxDespesa.mes} (13º/Fechamento)</strong></span>
            <span>Mínimo: <strong>{stats.minDespesa.mes} ({formatCompactCurrency(stats.minDespesa.despesa)})</strong></span>
          </div>
        </div>

        {/* Micro Sparkline 3: Saldo Orçamentário */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-sm p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Saldo & Superávit Mensal</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              +{formatCompactCurrency(stats.totalResultado)} Acum.
            </span>
          </div>

          <div className="h-10 my-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <Bar
                  dataKey="resultado"
                  fill="#f59e0b"
                  radius={[1, 1, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Meses Positivos: <strong className="text-emerald-600">{stats.mesesSuperavit}/12</strong></span>
            <span>Maior Saldo: <strong>{stats.maxResultado.mes} (+{formatCompactCurrency(stats.maxResultado.resultado)})</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
