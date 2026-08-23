import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
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

  // Metrics
  const totalMRR = 148950.0;
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
    onAddToast({
      type: 'info',
      title: 'Gerando PDF da Fatura',
      message: `Comprovante da fatura ${inv.invoiceNumber} gerado para download.`,
    });
  };

  const handleMarkAsPaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'paid',
              paidAt: new Date().toISOString().split('T')[0],
            }
          : i
      )
    );
    onAddToast({
      type: 'success',
      title: 'Fatura Liquidada',
      message: 'Status alterado para Pago com confirmação no sistema.',
    });
  };

  const getStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Pago
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Em Atraso
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Estornado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Faturamento, Assinaturas & Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de receita recorrente mensal (MRR), projeção anual (ARR), emissão de faturas e conciliação.
          </p>
        </div>

        <button
          onClick={() =>
            onAddToast({
              type: 'success',
              title: 'Relatório Financeiro',
              message: 'DRE consolidado exportado com sucesso.',
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-600/30"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar DRE Consolidado</span>
        </button>
      </div>

      {/* Financial KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Receita Recorrente Mensal (MRR)
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.8% vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Projeção Anual (ARR)
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
            R$ {totalARR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>Base consolidada 12 meses</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Ticket Médio por Organização
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>42 contratos ativos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Taxa de Liquidação de Faturas
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {((paidCount / invoices.length) * 100).toFixed(1)}%
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>{paidCount} pagas / {overdueCount} em atraso</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar fatura por número, cliente ou plano..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="paid">Pagas</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Em Atraso</option>
            <option value="refunded">Estornadas</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma fatura localizada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {inv.tenantName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                      {inv.plan}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {inv.issuedAt}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {inv.dueDate}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(inv.id)}
                            title="Marcar como Pago"
                            className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            Liquidar
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoicePDF(inv)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white font-mono">{filteredInvoices.length}</strong> faturas
          </span>
          <span className="text-[11px] font-mono">billing-engine-v2</span>
        </div>
      </div>
    </div>
  );
};
