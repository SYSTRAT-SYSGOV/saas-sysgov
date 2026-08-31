import React, { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  FileText,
  PieChart,
  Loader2,
} from 'lucide-react';
import {
  Card,
  Button,
  KpiCard,
  StatusChip,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';
import { apiClient } from '@/core/api/client';

interface FinanceSummary {
  tenant_id: number;
  revenues_cents: number;
  expenses_cents: number;
  invoices_cents: number;
  transfers_cents: number;
  pending_reconciliations: number;
}

interface BudgetSummary {
  total_committed_cents: number;
  total_settled_cents: number;
  total_paid_cents: number;
  restos_a_pagar_cents: number;
  execution_rate_percent: number;
}

interface Toast {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export const FinanceModule: React.FC = () => {
  const { tenant } = useTenant();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, budgetRes] = await Promise.all([
        apiClient.get<FinanceSummary>('/finance/summary'),
        apiClient.get<BudgetSummary>('/finance/budget/summary'),
      ]);
      setSummary(summaryRes.data);
      setBudget(budgetRes.data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao carregar dados financeiros.';
      setError(msg);
      notify({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const formatCents = (cents: number) => formatCurrencyBRL(cents / 100);

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Execução Financeira & Orçamentária
              </h1>
              <StatusChip label="Exercício 2026" variant="primary" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Controle orçamentário de receitas, empenhos, liquidações e repasses de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<PieChart className="w-4 h-4" />}>
              Balanço RGF
            </Button>
            <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
              Novo Empenho
            </Button>
          </div>
        </div>
      </Card>

      {loading && !summary ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gov-primary animate-spin" />
        </div>
      ) : error && !summary ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-sm">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Receita Realizada"
              value={summary ? formatCents(summary.revenues_cents) : 'R$ 0,00'}
              icon={<TrendingUp className="w-5 h-5" />}
              iconBgColor="bg-status-success-bg text-status-success"
            />
            <KpiCard
              title="Despesa Empenhada"
              value={summary ? formatCents(summary.expenses_cents) : 'R$ 0,00'}
              icon={<Receipt className="w-5 h-5" />}
              iconBgColor="bg-status-warning-bg text-status-warning"
            />
            <KpiCard
              title="Despesa Paga"
              value={budget ? formatCents(budget.total_paid_cents) : 'R$ 0,00'}
              icon={<CreditCard className="w-5 h-5" />}
              iconBgColor="bg-status-info-bg text-status-info"
            />
            <KpiCard
              title="Empenhado (Restos a Pagar)"
              value={budget ? formatCents(budget.restos_a_pagar_cents) : 'R$ 0,00'}
              icon={<DollarSign className="w-5 h-5" />}
              iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
            />
          </div>

          <Card className="!p-5 sm:!p-6">
            <h2 className="text-lg font-bold text-gov-text-primary mb-4">Execução Orçamentária</h2>
            {budget ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-gov-surface border border-gov-border">
                  <p className="text-xs text-gov-text-muted mb-1">Empenhado</p>
                  <p className="font-mono font-bold text-gov-text-primary text-sm">
                    {formatCents(budget.total_committed_cents)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gov-surface border border-gov-border">
                  <p className="text-xs text-gov-text-muted mb-1">Liquidado</p>
                  <p className="font-mono font-bold text-gov-text-primary text-sm">
                    {formatCents(budget.total_settled_cents)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gov-surface border border-gov-border">
                  <p className="text-xs text-gov-text-muted mb-1">Pago</p>
                  <p className="font-mono font-bold text-gov-text-primary text-sm">
                    {formatCents(budget.total_paid_cents)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gov-surface border border-gov-border">
                  <p className="text-xs text-gov-text-muted mb-1">Execução</p>
                  <p className="font-mono font-bold text-gov-text-primary text-sm">
                    {budget.execution_rate_percent}%
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gov-text-muted text-sm">Dados não disponíveis.</p>
            )}
          </Card>
        </>
      )}

      {toasts.map((t, i) => (
        <div
          key={i}
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'error' ? 'bg-rose-600 text-white' :
            t.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-blue-600 text-white'
          }`}
        >
          <strong className="block text-xs font-bold uppercase">{t.title}</strong>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default FinanceModule;
