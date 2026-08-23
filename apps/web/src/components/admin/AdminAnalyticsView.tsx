import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  Filter,
  Download,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AdminAnalyticsViewProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

const TRAFFIC_DISTRIBUTION = [
  { name: 'Acesso Direto / Portal', value: 45, color: '#10b981' },
  { name: 'Integrações de API / Webhooks', value: 30, color: '#6366f1' },
  { name: 'Acesso Mobile / App', value: 15, color: '#06b6d4' },
  { name: 'Exportações / Crons', value: 10, color: '#f59e0b' },
];

const MONTHLY_GROWTH = [
  { mes: 'Jan', novosContratos: 4, churn: 0, taxaRetencao: 100 },
  { mes: 'Fev', novosContratos: 6, churn: 0, taxaRetencao: 100 },
  { mes: 'Mar', novosContratos: 8, churn: 1, taxaRetencao: 98.8 },
  { mes: 'Abr', novosContratos: 7, churn: 0, taxaRetencao: 99.1 },
  { mes: 'Mai', novosContratos: 9, churn: 0, taxaRetencao: 99.3 },
  { mes: 'Jun', novosContratos: 11, churn: 1, taxaRetencao: 98.9 },
  { mes: 'Jul', novosContratos: 12, churn: 0, taxaRetencao: 99.2 },
  { mes: 'Ago', novosContratos: 14, churn: 0, taxaRetencao: 99.4 },
];

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({ onAddToast }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Desempenho, Análise & Métricas Avançadas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Métricas de conversão, crescimento mensal de contratos, taxa de retenção e distribuição de tráfego.
          </p>
        </div>

        <button
          onClick={() =>
            onAddToast({
              type: 'success',
              title: 'Exportação Concluída',
              message: 'Relatório executivo analítico baixado em PDF.',
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-600/30"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth & Retention Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Novos Contratos & Retenção Mensal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evolução do volume de novos clientes vs. churn
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/50">
              Taxa Média: 99.3% Retenção
            </span>
          </div>

          <div className="w-full h-72 min-h-[280px]">
            <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
              <BarChart data={MONTHLY_GROWTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="novosContratos" name="Novos Contratos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churn" name="Cancelamentos (Churn)" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Distribution Pie Chart (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-cyan-500" />
                Origem das Requisições
              </h2>
            </div>

            <div className="w-full h-56 min-h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220} minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={TRAFFIC_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {TRAFFIC_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    formatter={(value: any) => [`${value}%`, 'Volume']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {TRAFFIC_DISTRIBUTION.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
