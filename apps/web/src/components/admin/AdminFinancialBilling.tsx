import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  TrendingUp,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { INITIAL_INVOICES } from '../../services/adminMockData';
import { InvoiceItem } from '../../types/admin';

interface AdminFinancialBillingProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminFinancialBilling: React.FC<AdminFinancialBillingProps> = ({ onAddToast }) => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const totalMRR = 148950;
  const totalARR = totalMRR * 12;
  const averageTicket = 3546.42;
  const paidCount = useMemo(() => invoices.filter((i) => i.status === 'paid').length, [invoices]);
  const overdueCount = useMemo(() => invoices.filter((i) => i.status === 'overdue').length, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.plan.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleDownloadInvoicePDF = (inv: InvoiceItem) => {
    onAddToast({ type: 'info', title: 'Gerando PDF da Fatura', message: `Comprovante da fatura ${inv.invoiceNumber} gerado para download.` });
  };

  const handleMarkAsPaid = (id: string) => {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'paid', paidAt: new Date().toISOString().split('T')[0] } : i)));
    onAddToast({ type: 'success', title: 'Fatura Liquidada', message: 'Status alterado para Pago com confirmação no sistema.' });
  };

  const getStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'paid':
        return <span className="sgf-badge-oficial inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"><CheckCircle2 className="w-3 h-3" /> Pago</span>;
      case 'pending':
        return <span className="sgf-badge-demo inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"><Clock className="w-3 h-3" /> Pendente</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700/40"><AlertTriangle className="w-3 h-3" /> Em Atraso</span>;
      case 'refunded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 text-slate-500 border border-slate-300 dark:border-slate-700">Estornado</span>;
    }
  };

  const fmtBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="mod-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mod-text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Faturamento, Assinaturas & Invoices
          </h1>
          <p className="text-xs mod-text-secondary mt-1">Controle de receita recorrente mensal (MRR), projeção anual (ARR), emissão de faturas e conciliação.</p>
        </div>
        <button
          onClick={() => onAddToast({ type: 'success', title: 'Relatório Financeiro', message: 'DRE consolidado exportado com sucesso.' })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-600/30"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar DRE Consolidado</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Recorrente Mensal (MRR)', value: totalMRR, color: 'text-emerald-600 dark:text-emerald-400', trend: '+14.8% vs mês anterior' },
          { label: 'Projeção Anual (ARR)', value: totalARR, color: 'text-indigo-600 dark:text-indigo-400', trend: 'Base consolidada 12 meses' },
          { label: 'Ticket Médio por Organização', value: averageTicket, color: 'text-slate-900 dark:text-white', trend: '42 contratos ativos', integer: false },
          { label: 'Taxa de Liquidação de Faturas', value: invoices.length ? (paidCount / invoices.length) * 100 : 0, color: 'text-emerald-600 dark:text-emerald-400', trend: `${paidCount} pagas / ${overdueCount} em atraso`, suffix: '%', integer: false },
        ].map((k, i) => (
          <div key={i} className="mod-card p-5">
            <span className="text-xs font-medium mod-text-secondary block mb-1">{k.label}</span>
            <span className={`text-2xl lg:text-3xl font-extrabold ${k.color} font-mono tabular-nums`}>
              {k.suffix === '%' ? (k.value as number).toFixed(1) : ''}{k.suffix === '%' ? '%' : 'R$ '}{k.suffix !== '%' ? fmtBRL(k.value as number) : ''}
            </span>
            <div className="flex items-center gap-1 text-xs mod-text-secondary mt-2 font-mono">
              {i === 0 && <TrendingUp className="w-3.5 h-3.5" />}
              <span>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mod-card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 mod-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar fatura por número, cliente ou plano..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mod-input w-full pl-10"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mod-input md:w-auto">
          <option value="ALL">Todos os Status</option>
          <option value="paid">Pagas</option>
          <option value="pending">Pendentes</option>
          <option value="overdue">Em Atraso</option>
          <option value="refunded">Estornadas</option>
        </select>
      </div>

      <div className="mod-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="mod-header border-b mod-border text-[11px] font-semibold mod-text-secondary uppercase tracking-wider">
                <th className="py-3.5 px-4">Número da Fatura</th>
                <th className="py-3.5 px-4">Organização Cliente</th>
                <th className="py-3.5 px-4">Plano Contratado</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Emissão</th>
                <th className="py-3.5 px-4">Vencimento</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y mod-border text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center mod-text-secondary">
                    Nenhuma fatura localizada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="mod-row-hover transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold mod-text-primary">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-semibold mod-text-primary">{inv.tenantName}</td>
                    <td className="py-3.5 px-4 mod-text-secondary text-[11px]">{inv.plan}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] mod-text-secondary">{inv.issuedAt}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] mod-text-secondary">{inv.dueDate}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold mod-text-primary whitespace-nowrap">R$ {fmtBRL(inv.amount)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(inv.id)}
                            title="Marcar como Pago"
                            className="px-2 py-1 rounded sgf-badge-oficial text-[11px] font-semibold"
                          >
                            Liquidar
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoicePDF(inv)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg mod-text-secondary hover:mod-text-primary hover:mod-inner transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 mod-header border-t mod-border flex items-center justify-between text-xs mod-text-secondary">
          <span>
            Exibindo <strong className="mod-text-primary font-mono">{filteredInvoices.length}</strong> faturas
          </span>
          <span className="text-[11px] font-mono">billing-engine-v2</span>
        </div>
      </div>
    </div>
  );
};
