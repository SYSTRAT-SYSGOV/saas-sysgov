import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Database, Inbox, ListChecks, AlertTriangle, Receipt } from 'lucide-react';
import { Card, StatusChip } from '@sysgov/ui';
import { ScreenState, ScreenStateType } from '../ui/ScreenState';
import api from '../../api/client';

interface AdminApiIntegrationsProps {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

/** Formato de `GET /api/admin/monitoring`. */
export interface MonitoringData {
  generated_at: string;
  database: { status: string };
  counts: {
    tenants_active: number;
    tenants_total: number;
    users: number;
    modules_enabled: number;
    contracts_active: number;
    saas_contracts_active: number;
    saas_invoices_overdue: number;
  };
  outbox: { pending: number; processing: number; failed: number };
  queues: { size: number; failed: number };
}

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
};

/**
 * Saúde & Integrações: situação real da plataforma (banco, outbox, filas e faturas vencidas) a partir de
 * GET /api/admin/monitoring. Não há testes de latência nem conectores simulados.
 */
export const AdminApiIntegrations: React.FC<AdminApiIntegrationsProps> = () => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [state, setState] = useState<ScreenStateType>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      setData(await api.get<MonitoringData>('/api/admin/monitoring'));
      setState('ready');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível consultar a saúde da plataforma.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data
    ? [
        { id: 'db', label: 'Banco de dados', value: data.database.status === 'ok' ? 'Operacional' : data.database.status, ok: data.database.status === 'ok', icon: Database },
        { id: 'outbox-pending', label: 'Outbox — pendentes', value: String(data.outbox.pending), ok: true, icon: Inbox },
        { id: 'outbox-processing', label: 'Outbox — em processamento', value: String(data.outbox.processing), ok: true, icon: Inbox },
        { id: 'outbox-failed', label: 'Outbox — com falha', value: String(data.outbox.failed), ok: data.outbox.failed === 0, icon: AlertTriangle },
        { id: 'queue', label: 'Fila de jobs', value: String(data.queues.size), ok: true, icon: ListChecks },
        { id: 'queue-failed', label: 'Jobs com falha', value: String(data.queues.failed), ok: data.queues.failed === 0, icon: AlertTriangle },
        { id: 'overdue', label: 'Faturas vencidas', value: String(data.counts.saas_invoices_overdue), ok: data.counts.saas_invoices_overdue === 0, icon: Receipt },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Saúde &amp; Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Situação da plataforma consultada agora{data ? ` • gerado em ${formatDateTime(data.generated_at)}` : ''}.
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
        loadingMessage="Consultando a plataforma..."
        errorMessage={errorMessage}
        errorAction={{ label: 'Tentar novamente', onClick: () => void load() }}
      >
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((item) => (
                <Card key={item.id} className="flex items-start justify-between p-4">
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className="mt-1 block font-mono text-2xl font-extrabold tabular-nums text-foreground">{item.value}</span>
                    <div className="mt-2">
                      <StatusChip label={item.ok ? 'Normal' : 'Atenção'} variant={item.ok ? 'success' : 'danger'} />
                    </div>
                  </div>
                  <item.icon className="h-5 w-5 text-primary" />
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Organizações ativas: {data.counts.tenants_active} de {data.counts.tenants_total} • Usuários: {data.counts.users} • Módulos
              habilitados: {data.counts.modules_enabled} • Contratos SaaS ativos: {data.counts.saas_contracts_active}.
            </p>
          </div>
        )}
      </ScreenState>
    </div>
  );
};

export default AdminApiIntegrations;
