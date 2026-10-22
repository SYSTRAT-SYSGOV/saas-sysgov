import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@sysgov/ui';
import { ScreenState, ScreenStateType } from '../ui/ScreenState';
import api from '../../api/client';
import { AdminDashboardData, formatMonth } from './adminDashboardData';

interface AdminAnalyticsViewProps {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

/**
 * Desempenho & Métricas: contratos SaaS novos e encerrados por mês e retenção, calculados dos contratos
 * reais (GET /api/admin/dashboard). O encerramento é aproximado pela data de término do contrato, pois
 * o sistema não guarda a data do cancelamento.
 */
export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [state, setState] = useState<ScreenStateType>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      setData(await api.get<AdminDashboardData>('/api/admin/dashboard'));
      setState('ready');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível carregar as métricas.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contracts = data?.series.contracts ?? [];
  const hasContracts = contracts.some((p) => p.new > 0 || p.ended > 0);
  const hasRetention = contracts.some((p) => p.retention_percent !== null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Desempenho &amp; Métricas</h1>
          <p className="text-sm text-muted-foreground">Contratos e retenção dos últimos 12 meses, calculados dos contratos cadastrados.</p>
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
        loadingMessage="Carregando métricas..."
        errorMessage={errorMessage}
        errorAction={{ label: 'Tentar novamente', onClick: () => void load() }}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Contratos novos e encerrados por mês</h2>
            {hasContracts ? (
              <div className="h-64" data-testid="chart-contracts">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contracts.map((p) => ({ mes: formatMonth(p.month), novos: p.new, encerrados: p.ended }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="novos" name="Novos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="encerrados" name="Encerrados" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum contrato iniciado ou encerrado nos últimos 12 meses.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Retenção de contratos (%)</h2>
            {hasRetention ? (
              <div className="h-64" data-testid="chart-retention">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={contracts.map((p) => ({ mes: formatMonth(p.month), retencao: p.retention_percent }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Retenção']} />
                    <Line type="monotone" dataKey="retencao" name="Retenção" stroke="#6366f1" strokeWidth={2} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Ainda não há contratos ativos no início de nenhum mês para calcular a retenção.
              </p>
            )}
          </Card>
        </div>
      </ScreenState>
    </div>
  );
};

export default AdminAnalyticsView;
