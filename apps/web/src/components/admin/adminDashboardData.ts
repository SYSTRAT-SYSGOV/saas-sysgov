/** Formato de `GET /api/admin/dashboard` (Visão Geral e Desempenho & Métricas). */
export interface AdminDashboardData {
  generated_at: string;
  kpis: {
    tenants_total: number;
    tenants_active: number;
    users_total: number;
    mrr_cents: number;
    invoices_overdue: number;
  };
  series: {
    revenue: Array<{ month: string; paid_cents: number }>;
    growth: Array<{ month: string; new_tenants: number; new_users: number }>;
    contracts: Array<{ month: string; new: number; ended: number; retention_percent: number | null }>;
  };
  recent_activity: Array<{
    id: number;
    module: string;
    action: string;
    resource: string;
    tenant_id: number | null;
    created_at: string;
    user_name: string | null;
  }>;
}

export const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "2026-10" → "Out/26". */
export const formatMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  const label = MONTH_LABELS[Number(month) - 1];
  return label ? `${label}/${(year ?? '').slice(2)}` : yearMonth;
};
