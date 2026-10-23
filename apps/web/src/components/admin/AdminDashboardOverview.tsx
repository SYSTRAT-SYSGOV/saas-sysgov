import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Building2, DollarSign, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@sysgov/ui';
import { ScreenState, ScreenStateType } from '../ui/ScreenState';
import api from '../../api/client';
import { AdminDashboardData, formatBRL, formatMonth } from './adminDashboardData';

interface AdminDashboardOverviewProps {
  onNavigate?: (tabId: string) => void;
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

/** Variação percentual da receita paga do mês atual sobre o mês anterior; null sem base de comparação. */
export const revenueVariation = (series: AdminDashboardData['series']['revenue']): number | null => {
  if (series.length < 2) return null;
  const previous = series[series.length - 2].paid_cents;
  const current = series[series.length - 1].paid_cents;
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
};

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [state, setState] = useState<ScreenStateType>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      const res = await api.get<AdminDashboardData>('/api/admin/dashboard');
      setData(res);
      setState('ready');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível carregar os indicadores.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const variation = data ? revenueVariation(data.series.revenue) : null;
  const hasRevenue = !!data && data.series.revenue.some((p) => p.paid_cents > 0);
  const hasGrowth = !!data && data.series.growth.some((p) => p.new_tenants > 0 || p.new_users > 0);

  const kpis = data
    ? [
        {
          id: 'tenants',
          title: 'Organizações ativas',
          value: `${data.kpis.tenants_active} / ${data.kpis.tenants_total}`,
          hint: 'ativas / total',
          icon: Building2,
        },
        {
          id: 'mrr',
          title: 'MRR (receita recorrente mensal)',
          value: formatBRL(data.kpis.mrr_cents),
          hint: variation === null ? 'receita paga sem mês anterior para comparar' : `receita paga ${variation >= 0 ? '+' : ''}${variation.toFixed(1)}% vs. mês anterior`,
          icon: DollarSign,
        },
        { id: 'users', title: 'Usuários nas organizações', value: String(data.kpis.users_total), hint: 'contas vinculadas', icon: Users },
        {
          id: 'overdue',
          title: 'Faturas vencidas',
          value: String(data.kpis.invoices_overdue),
          hint: data.kpis.invoices_overdue > 0 ? 'requer atenção' : 'nenhuma em atraso',
          icon: AlertTriangle,
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores consultados no banco de dados
            {data ? ` • atualizado em ${formatDateTime(data.generated_at)}` : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <ScreenState
        state={state}
        loadingMessage="Carregando indicadores..."
        errorMessage={errorMessage}
        errorAction={{ label: 'Tentar novamente', onClick: () => void load() }}
      >
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <Card key={kpi.id} className="flex items-start justify-between p-4">
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">{kpi.title}</span>
                    <span className="mt-1 block font-mono text-2xl font-extrabold tabular-nums text-foreground">{kpi.value}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{kpi.hint}</span>
                  </div>
                  <kpi.icon className="h-5 w-5 text-primary" />
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Receita paga por mês</h2>
                {hasRevenue ? (
                  <div className="h-64" data-testid="chart-revenue">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.series.revenue.map((p) => ({ mes: formatMonth(p.month), valor: p.paid_cents / 100 }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="mes" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} width={90} />
                        <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita paga']} />
                        <Bar dataKey="valor" name="Receita paga" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">Ainda não há faturas pagas nos últimos 12 meses.</p>
                )}
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Crescimento (novas organizações e usuários)</h2>
                {hasGrowth ? (
                  <div className="h-64" data-testid="chart-growth">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.series.growth.map((p) => ({ mes: formatMonth(p.month), organizacoes: p.new_tenants, usuarios: p.new_users }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="mes" fontSize={11} />
                        <YAxis fontSize={11} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="organizacoes" name="Organizações" fill="var(--gov-primary-hover)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="usuarios" name="Usuários" fill="var(--status-info-base)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro novo nos últimos 12 meses.</p>
                )}
              </Card>
            </div>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-primary" /> Atividade recente
                </h2>
                {onNavigate && (
                  <button type="button" onClick={() => onNavigate('admin_logs')} className="text-xs font-semibold text-primary hover:underline">
                    Ver auditoria completa
                  </button>
                )}
              </div>
              {data.recent_activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent_activity.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <strong className="font-semibold">{item.user_name ?? 'Sistema'}</strong>
                        <span className="text-muted-foreground"> • {item.action}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">{item.resource}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatDateTime(item.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </ScreenState>
    </div>
  );
};

export default AdminDashboardOverview;
