import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Activity,
  ArrowUpRight,
  Plus,
  Download,
  Filter,
  RefreshCw,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  INITIAL_METRIC_CARDS,
  INITIAL_CHART_REVENUE,
  INITIAL_CHART_USERS,
  INITIAL_RECENT_ACTIVITIES,
} from '../../services/adminMockData';
import { MetricCardData, ActivityEvent } from '../../types/admin';

interface AdminDashboardOverviewProps {
  onNavigate: (tabId: string) => void;
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  onNavigate,
  onAddToast,
}) => {
  const [metrics] = useState<MetricCardData[]>(INITIAL_METRIC_CARDS);
  const [revenueData] = useState(INITIAL_CHART_REVENUE);
  const [usersData] = useState(INITIAL_CHART_USERS);
  const [activities] = useState<ActivityEvent[]>(INITIAL_RECENT_ACTIVITIES);
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onAddToast({
        type: 'success',
        title: 'Dados Atualizados',
        message: 'Métricas e indicadores sincronizados com sucesso.',
      });
    }, 600);
  };

  const getMetricBadgeStyle = (colorScheme: string) => {
    switch (colorScheme) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-900 via-navy-900 to-slate-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SISTEMA OPERACIONAL
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              v2.5.0-universal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Painel Executivo de Administração
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Visão consolidada em tempo real de receita, usuários ativos, organizações conectadas e integridade de APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
            {(['7d', '30d', '90d', '12m'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  periodFilter === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => onNavigate('admin_users')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {m.title}
              </span>
              {m.badge && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getMetricBadgeStyle(
                    m.colorScheme
                  )}`}
                >
                  {m.badge}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {m.value}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {m.isPositiveChange ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold font-mono tabular-nums">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{m.changePercentage}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold font-mono tabular-nums">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -{m.changePercentage}%
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">
                  {m.periodLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Evolução Financeira & Receita Recorrente
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativo consolidado de receita bruta vs. custos operacionais
              </p>
            </div>
            <button
              onClick={() => onNavigate('admin_billing')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Ver Detalhes <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full h-72 min-h-[280px]">
            <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')},00`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita Bruta (R$)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro Líquido (R$)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLucro)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Activity & Distribution Chart (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Atividade Semanal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Volume diário de requisições e novos cadastros
                </p>
              </div>
            </div>

            <div className="w-full h-60 min-h-[240px]">
              <ResponsiveContainer width="100%" height={240} minWidth={0} debounce={50}>
                <BarChart data={usersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
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
                  <Bar dataKey="acessos" name="Acessos / Sessões" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="novos" name="Novos Usuários" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Pico de tráfego:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              Quarta-feira (1.950 req)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent System Activities & Quick Navigation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events List (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                Atividades Recentes & Eventos do Sistema
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log operacional de ações executadas pelos administradores
              </p>
            </div>
            <button
              onClick={() => onNavigate('admin_logs')}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Auditoria Completa <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4 group">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      act.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : act.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : act.status === 'error'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {act.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : act.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {act.userName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {act.action}
                      </span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                        {act.target}
                      </span>
                    </div>
                    {act.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {act.details}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  {act.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launchpad & Status Hub (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              Atalhos Rápidos
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('admin_users')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block group-hover:text-blue-500 transition-colors">
                      Gerenciar Usuários
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Adicionar, editar e definir permissões
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('admin_tenants')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block group-hover:text-amber-500 transition-colors">
                      Organizações & Tenants
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cotas de uso, planos e domínios
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('admin_apis')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block group-hover:text-indigo-500 transition-colors">
                      Integradores & Webhooks
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Status de APIs, latência e conectores
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('admin_settings')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors">
                      Configurações do Sistema
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Personalização visual & white-label
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-900 dark:text-emerald-300 block">
                Auditoria Criptográfica Ativa
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                Todos os acessos são assinados e registrados.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
