import React, { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { DollarSign, TrendingUp, CreditCard, Receipt, FileText, PieChart } from 'lucide-react';
import { PageHeader, Card, Button, KpiCard, ScreenState, Badge } from '@/components/ui';
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

export const FinanceModule: React.FC = () => {
  const { tenant } = useTenant();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatCents = (cents: number) => formatCurrencyBRL(cents / 100);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<DollarSign className="h-6 w-6" />}
          title="Execução Financeira & Orçamentária"
          badge="Exercício 2026"
          subtitle={`${tenant?.name} — Controle orçamentário de receitas, empenhos, liquidações e repasses`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" leftIcon={<PieChart className="h-4 w-4" />}>Balanço RGF</Button>
              <Button variant="primary" leftIcon={<FileText className="h-4 w-4" />}>Novo Empenho</Button>
            </div>
          }
        />
        <ScreenState type="loading" title="Carregando dados financeiros..." />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<DollarSign className="h-6 w-6" />}
          title="Execução Financeira & Orçamentária"
          badge="Exercício 2026"
          subtitle={`${tenant?.name} — Controle orçamentário de receitas, empenhos, liquidações e repasses`}
        />
        <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<DollarSign className="h-6 w-6" />}
        title="Execução Financeira & Orçamentária"
        badge="Exercício 2026"
        subtitle={`${tenant?.name} — Controle orçamentário de receitas, empenhos, liquidações e repasses`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<PieChart className="h-4 w-4" />}>Balanço RGF</Button>
            <Button variant="primary" leftIcon={<FileText className="h-4 w-4" />}>Novo Empenho</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Realizada"
          value={summary ? formatCents(summary.revenues_cents) : 'R$ 0,00'}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-success/10 text-success"
        />
        <KpiCard
          title="Despesa Empenhada"
          value={summary ? formatCents(summary.expenses_cents) : 'R$ 0,00'}
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-warning/10 text-warning"
        />
        <KpiCard
          title="Despesa Paga"
          value={budget ? formatCents(budget.total_paid_cents) : 'R$ 0,00'}
          icon={<CreditCard className="w-5 h-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Empenhado (Restos a Pagar)"
          value={budget ? formatCents(budget.restos_a_pagar_cents) : 'R$ 0,00'}
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-muted text-muted-foreground"
        />
      </div>

      <Card>
        <h2 className="text-lg font-bold text-foreground mb-4">Execução Orçamentária</h2>
        {budget ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Empenhado</p>
              <p className="font-mono font-bold text-foreground text-sm">
                {formatCents(budget.total_committed_cents)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Liquidado</p>
              <p className="font-mono font-bold text-foreground text-sm">
                {formatCents(budget.total_settled_cents)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Pago</p>
              <p className="font-mono font-bold text-foreground text-sm">
                {formatCents(budget.total_paid_cents)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Execução</p>
              <p className="font-mono font-bold text-foreground text-sm">
                {budget.execution_rate_percent}%
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Dados não disponíveis.</p>
        )}
      </Card>
    </div>
  );
};

export default FinanceModule;
