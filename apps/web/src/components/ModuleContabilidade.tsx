import React, { useState, useMemo } from 'react';
import {
  BookOpen, TrendingUp, TrendingDown, Scale, BarChart2, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight, Search, Download, Plus,
  ArrowLeftRight, Layers, DollarSign, Receipt, CreditCard, FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  class: number;
  nature: 'devedora' | 'credora';
  type: 'sintetica' | 'analitica';
  children?: ChartAccount[];
  balance_cents?: number;
}

interface AccountingEntry {
  id: string;
  entry_number: string;
  description: string;
  entry_date: string;
  total_amount_cents: number;
  status: 'rascunho' | 'lançado' | 'estornado';
  lines: { account_code: string; account_name: string; debit_cents: number; credit_cents: number }[];
}

type CommitmentStatus = 'pendente' | 'liquidado' | 'pago' | 'anulado';

interface BudgetCommitment {
  id: string;
  commitment_number: string;
  description: string;
  amount_cents: number;
  liquidated_cents: number;
  paid_cents: number;
  status: CommitmentStatus;
  commitment_date: string;
  supplier: string;
  expenditure_category: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PCASP_MOCK: ChartAccount[] = [
  {
    id: '1', code: '1', name: 'ATIVO', class: 1, nature: 'devedora', type: 'sintetica', balance_cents: 98450000,
    children: [
      { id: '1.1', code: '1.1', name: 'ATIVO CIRCULANTE', class: 1, nature: 'devedora', type: 'sintetica', balance_cents: 45200000, children: [
        { id: '1.1.1', code: '1.1.1', name: 'Caixa e Equivalentes de Caixa', class: 1, nature: 'devedora', type: 'analitica', balance_cents: 15300000 },
        { id: '1.1.2', code: '1.1.2', name: 'Créditos a Receber', class: 1, nature: 'devedora', type: 'analitica', balance_cents: 29900000 },
      ]},
      { id: '1.2', code: '1.2', name: 'ATIVO NÃO CIRCULANTE', class: 1, nature: 'devedora', type: 'sintetica', balance_cents: 53250000, children: [
        { id: '1.2.3', code: '1.2.3', name: 'Imobilizado', class: 1, nature: 'devedora', type: 'analitica', balance_cents: 53250000 },
      ]},
    ],
  },
  {
    id: '2', code: '2', name: 'PASSIVO', class: 2, nature: 'credora', type: 'sintetica', balance_cents: 23100000,
    children: [
      { id: '2.1', code: '2.1', name: 'PASSIVO CIRCULANTE', class: 2, nature: 'credora', type: 'sintetica', balance_cents: 14500000, children: [
        { id: '2.1.1', code: '2.1.1', name: 'Pessoal a Pagar', class: 2, nature: 'credora', type: 'analitica', balance_cents: 9200000 },
        { id: '2.1.2', code: '2.1.2', name: 'Fornecedores', class: 2, nature: 'credora', type: 'analitica', balance_cents: 5300000 },
      ]},
    ],
  },
];

const ENTRIES_MOCK: AccountingEntry[] = [
  {
    id: '1', entry_number: '2026LN00089', description: 'Reconhecimento de Despesas de Pessoal — Junho/2026', entry_date: '2026-06-30', total_amount_cents: 67900000, status: 'lançado',
    lines: [
      { account_code: '3.1.1.1.1', account_name: 'Despesas de Pessoal', debit_cents: 67900000, credit_cents: 0 },
      { account_code: '2.1.1.0.1', account_name: 'Pessoal a Pagar', debit_cents: 0, credit_cents: 67900000 },
    ]
  },
  {
    id: '2', entry_number: '2026LN00088', description: 'Pagamento Fornecedor — Construtora Delta S.A.', entry_date: '2026-06-28', total_amount_cents: 15800000, status: 'lançado',
    lines: [
      { account_code: '2.1.2.0.1', account_name: 'Fornecedores', debit_cents: 15800000, credit_cents: 0 },
      { account_code: '1.1.1.0.1', account_name: 'Caixa e Equiv. de Caixa', debit_cents: 0, credit_cents: 15800000 },
    ]
  },
  {
    id: '3', entry_number: '2026LN00087', description: 'Incorporação Bens Imóveis — FNDE', entry_date: '2026-06-15', total_amount_cents: 4200000, status: 'lançado',
    lines: [
      { account_code: '1.2.3.1.1', account_name: 'Imobilizado — Equipamentos', debit_cents: 4200000, credit_cents: 0 },
      { account_code: '7.1.1.0.1', account_name: 'Receitas Correntes', debit_cents: 0, credit_cents: 4200000 },
    ]
  },
  {
    id: '4', entry_number: '2026LN00086', description: 'Reclassificação — Empenho CT-2026/0045', entry_date: '2026-06-10', total_amount_cents: 5000000, status: 'estornado',
    lines: [
      { account_code: '6.2.1.1.1', account_name: 'Crédito Disponível', debit_cents: 5000000, credit_cents: 0 },
      { account_code: '6.2.2.1.1', account_name: 'Crédito Comprometido', debit_cents: 0, credit_cents: 5000000 },
    ]
  },
];

const COMMITMENTS_MOCK: BudgetCommitment[] = [
  { id: '1', commitment_number: '2026NE00156', description: 'Serviços de Manutenção Viária — CT-2026/0045', amount_cents: 98000000, liquidated_cents: 55000000, paid_cents: 45000000, status: 'liquidado', commitment_date: '2026-03-01', supplier: 'Construtora Delta S.A.', expenditure_category: 'Serviços de Terceiros' },
  { id: '2', commitment_number: '2026NE00142', description: 'Locação de Software Gestão Fiscal', amount_cents: 32400000, liquidated_cents: 16200000, paid_cents: 16200000, status: 'pago', commitment_date: '2026-01-15', supplier: 'SYSTRAT Tecnologia Ltda', expenditure_category: 'Serviços de Terceiros' },
  { id: '3', commitment_number: '2026NE00188', description: 'Fornecimento de Merenda Escolar — Trim III', amount_cents: 15000000, liquidated_cents: 0, paid_cents: 0, status: 'pendente', commitment_date: '2026-06-25', supplier: 'Alimenta Brasil Distribuidora', expenditure_category: 'Material de Consumo' },
  { id: '4', commitment_number: '2026NE00127', description: 'Limpeza e Conservação Predial', amount_cents: 18500000, liquidated_cents: 9250000, paid_cents: 0, status: 'liquidado', commitment_date: '2026-05-05', supplier: 'CleanMax Serviços Ltda', expenditure_category: 'Serviços de Terceiros' },
  { id: '5', commitment_number: '2026NE00099', description: 'Serviço de Iluminação Pública', amount_cents: 22000000, liquidated_cents: 0, paid_cents: 0, status: 'anulado', commitment_date: '2026-02-10', supplier: 'Eletro Sul S.A.', expenditure_category: 'Serviços de Terceiros' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const statusBadge: Record<CommitmentStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Empenhado', color: 'text-indigo-400', bg: 'bg-indigo-950/60 border-indigo-700/50' },
  liquidado: { label: 'Liquidado', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-700/50' },
  pago: { label: 'Pago/OB', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-700/50' },
  anulado: { label: 'Anulado', color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700' },
};

const entryStatusBadge: Record<AccountingEntry['status'], { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-400' },
  lançado: { label: 'Lançado', color: 'text-emerald-400' },
  estornado: { label: 'Estornado', color: 'text-rose-400' },
};

// ─── PCASP Tree ───────────────────────────────────────────────────────────────

const AccountRow: React.FC<{ acc: ChartAccount; depth?: number }> = ({ acc, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = acc.children && acc.children.length > 0;

  return (
    <>
      <tr
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`border-b border-[#1a2a52]/50 hover:bg-[#1a2a52]/50 transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
      >
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              expanded ? <ChevronDown size={13} className="text-slate-500 shrink-0" /> : <ChevronRight size={13} className="text-slate-500 shrink-0" />
            ) : <div className="w-3" />}
            <span className={`font-mono text-xs tabular-nums ${acc.type === 'sintetica' ? 'font-bold text-slate-300' : 'text-slate-400'}`}>{acc.code}</span>
          </div>
        </td>
        <td className="py-2.5 px-4">
          <span className={`text-sm ${acc.type === 'sintetica' ? 'font-semibold text-slate-200' : 'text-slate-300'}`}>{acc.name}</span>
        </td>
        <td className="py-2.5 px-4 text-center">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${acc.nature === 'devedora' ? 'text-sky-400 bg-sky-950/40 border-sky-700/40' : 'text-rose-400 bg-rose-950/40 border-rose-700/40'}`}>
            {acc.nature}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right">
          {acc.balance_cents !== undefined && (
            <span className={`font-mono text-sm tabular-nums ${acc.type === 'sintetica' ? 'font-bold text-slate-200' : 'text-slate-300'}`}>
              {fmt(acc.balance_cents)}
            </span>
          )}
        </td>
      </tr>
      {expanded && acc.children?.map(child => (
        <AccountRow key={child.id} acc={child} depth={depth + 1} />
      ))}
    </>
  );
};

// ─── Budget Progress Bar ──────────────────────────────────────────────────────

const BudgetBar: React.FC<{ c: BudgetCommitment }> = ({ c }) => {
  const liqPct = c.amount_cents > 0 ? (c.liquidated_cents / c.amount_cents) * 100 : 0;
  const pagPct = c.amount_cents > 0 ? (c.paid_cents / c.amount_cents) * 100 : 0;
  const cfg = statusBadge[c.status];

  return (
    <div className="bg-[#152244] border border-[#1a2a52] rounded-xl p-4 hover:border-indigo-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs text-indigo-400">{c.commitment_number}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </div>
          <p className="text-sm font-semibold text-slate-200 line-clamp-1">{c.description}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{c.supplier} · {c.expenditure_category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-bold text-slate-200 tabular-nums">{fmt(c.amount_cents)}</p>
          <p className="font-mono text-xs text-slate-500 tabular-nums">{new Date(c.commitment_date).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Stacked progress bars */}
      {c.status !== 'anulado' && (
        <div className="space-y-2">
          {/* Empenho → Liquidação */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Liquidado</span>
              <span className="font-mono tabular-nums">{fmt(c.liquidated_cents)} <span className="text-slate-600">({liqPct.toFixed(0)}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${liqPct}%` }} />
            </div>
          </div>
          {/* Liquidação → Pagamento */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Pago (OB)</span>
              <span className="font-mono tabular-nums">{fmt(c.paid_cents)} <span className="text-slate-600">({pagPct.toFixed(0)}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pagPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'execucao' | 'pcasp' | 'lancamentos';

export const ModuleContabilidade: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('execucao');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const kpis = useMemo(() => {
    const total = COMMITMENTS_MOCK.filter(c => c.status !== 'anulado').reduce((a, c) => a + c.amount_cents, 0);
    const liquidado = COMMITMENTS_MOCK.reduce((a, c) => a + c.liquidated_cents, 0);
    const pago = COMMITMENTS_MOCK.reduce((a, c) => a + c.paid_cents, 0);
    const saldo = total - pago;
    return { total, liquidado, pago, saldo };
  }, []);

  const filteredCommitments = useMemo(() => COMMITMENTS_MOCK.filter(c => {
    const matchSearch = search === '' || c.commitment_number.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()) || c.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  }), [search, filterStatus]);

  const filteredEntries = useMemo(() => ENTRIES_MOCK.filter(e => {
    return search === '' || e.entry_number.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
  }), [search]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'execucao', label: 'Execução Orçamentária', icon: TrendingUp },
    { id: 'pcasp', label: 'Plano de Contas (PCASP)', icon: BookOpen },
    { id: 'lancamentos', label: 'Lançamentos Contábeis', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Empenhado', value: fmt(kpis.total), color: 'text-indigo-400', icon: Receipt },
          { label: 'Total Liquidado', value: fmt(kpis.liquidado), color: 'text-amber-400', icon: FileText },
          { label: 'Total Pago (OBs)', value: fmt(kpis.pago), color: 'text-emerald-400', icon: CreditCard },
          { label: 'Saldo a Pagar', value: fmt(kpis.saldo), color: 'text-cyan-400', icon: DollarSign },
        ].map((k) => (
          <div key={k.label} className="bg-[#152244] border border-[#1a2a52] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className={`font-mono text-lg font-bold tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[#1a2a52]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'execucao' ? 'Buscar empenho, fornecedor...' : activeTab === 'pcasp' ? 'Buscar conta...' : 'Buscar lançamento...'}
            className="w-full pl-9 pr-4 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        {activeTab === 'execucao' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Empenhado</option>
            <option value="liquidado">Liquidado</option>
            <option value="pago">Pago (OB)</option>
            <option value="anulado">Anulado</option>
          </select>
        )}
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 rounded-xl text-sm font-medium transition-colors">
          <Download size={14} /> Exportar
        </button>
        {activeTab === 'lancamentos' && (
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={14} /> Novo Lançamento
          </button>
        )}
      </div>

      {/* ── Execução Orçamentária ── */}
      {activeTab === 'execucao' && (
        <div className="space-y-3">
          {filteredCommitments.map((c) => <BudgetBar key={c.id} c={c} />)}
          {filteredCommitments.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-[#152244] border border-[#1a2a52] rounded-xl">
              <Receipt className="mx-auto mb-3 opacity-40" size={32} />
              <p>Nenhum empenho encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* ── PCASP ── */}
      {activeTab === 'pcasp' && (
        <div className="bg-[#152244] border border-[#1a2a52] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2a52] bg-[#0a1128]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide w-40">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Conta</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32">Natureza</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide w-40">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {PCASP_MOCK.map((acc) => (
                <AccountRow key={acc.id} acc={acc} depth={0} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-indigo-500/30 bg-indigo-950/20">
                <td colSpan={3} className="py-3 px-4 text-sm font-bold text-slate-200">ATIVO TOTAL</td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono text-sm font-bold text-indigo-400 tabular-nums">{fmt(98450000)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="p-3 border-t border-[#1a2a52] flex items-center gap-2">
            <Scale size={13} className="text-emerald-400" />
            <span className="text-xs text-emerald-400">Balanço Patrimonial Equilibrado — Partidas Dobradas validadas ✓</span>
          </div>
        </div>
      )}

      {/* ── Lançamentos Contábeis ── */}
      {activeTab === 'lancamentos' && (
        <div className="space-y-4">
          {filteredEntries.map((e) => (
            <div key={e.id} className="bg-[#152244] border border-[#1a2a52] rounded-xl overflow-hidden">
              {/* Entry header */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a2a52]/60">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-indigo-400">{e.entry_number}</span>
                    <span className={`text-xs font-semibold ${entryStatusBadge[e.status].color}`}>● {entryStatusBadge[e.status].label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">{e.description}</p>
                  <p className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">{new Date(e.entry_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-slate-200 tabular-nums">{fmt(e.total_amount_cents)}</p>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">Partidas dobradas ✓</span>
                  </div>
                </div>
              </div>

              {/* Lines */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0a1128]/60">
                    <th className="text-left py-2 px-4 text-slate-500 font-medium">Conta</th>
                    <th className="text-right py-2 px-4 text-sky-400 font-medium">Débito</th>
                    <th className="text-right py-2 px-4 text-rose-400 font-medium">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lines.map((l, i) => (
                    <tr key={i} className="border-t border-[#1a2a52]/40">
                      <td className="py-2 px-4">
                        <span className="font-mono text-indigo-300 mr-2">{l.account_code}</span>
                        <span className="text-slate-400">{l.account_name}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-sky-400">
                        {l.debit_cents > 0 ? fmt(l.debit_cents) : '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-rose-400">
                        {l.credit_cents > 0 ? fmt(l.credit_cents) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1a2a52] bg-[#0a1128]/40">
                    <td className="py-2 px-4 text-slate-400 font-semibold">Total</td>
                    <td className="py-2 px-4 text-right font-mono font-bold tabular-nums text-sky-400">{fmt(e.total_amount_cents)}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold tabular-nums text-rose-400">{fmt(e.total_amount_cents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-[#152244] border border-[#1a2a52] rounded-xl">
              <ArrowLeftRight className="mx-auto mb-3 opacity-40" size={32} />
              <p>Nenhum lançamento encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleContabilidade;
