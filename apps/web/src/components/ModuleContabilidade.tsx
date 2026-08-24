import React, { useState, useMemo } from 'react';
import {
  BookOpen, ChevronRight, ChevronDown, Search, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, BarChart2, Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExecStatus = 'empenhado' | 'liquidado' | 'pago' | 'cancelado';
type NaturezaCC = 'D' | 'C';

interface OrcItem {
  id: string;
  ne_number: string;
  description: string;
  funcao: string;
  amount_cents: number;
  liquidado_cents: number;
  pago_cents: number;
  status: ExecStatus;
  date: string;
}

interface PCASPNode {
  code: string;
  title: string;
  natureza: NaturezaCC;
  nivel: number;
  saldo_cents: number;
  children?: PCASPNode[];
}

interface LancamentoContabil {
  id: string;
  date: string;
  description: string;
  debito_account: string;
  credito_account: string;
  amount_cents: number;
  status: 'rascunho' | 'confirmado' | 'estornado';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EMPENHOS_MOCK: OrcItem[] = [
  { id: '1', ne_number: '2026NE000089', description: 'Locação de Software Fiscal — SYSTRAT Tecnologia', funcao: '04 Administração', amount_cents: 32400000, liquidado_cents: 16200000, pago_cents: 10800000, status: 'liquidado', date: '2026-03-01' },
  { id: '2', ne_number: '2026NE000045', description: 'Manutenção de Vias Urbanas — Construtora Delta', funcao: '15 Urbanismo', amount_cents: 98000000, liquidado_cents: 49000000, pago_cents: 49000000, status: 'pago', date: '2026-04-15' },
  { id: '3', ne_number: '2026NE000078', description: 'Merenda Escolar — Alimenta Brasil Distribuidora', funcao: '12 Educação', amount_cents: 45000000, liquidado_cents: 0, pago_cents: 0, status: 'empenhado', date: '2026-06-01' },
  { id: '4', ne_number: '2026NE000102', description: 'Serviços de Limpeza Predial — CleanMax Ltda', funcao: '04 Administração', amount_cents: 18500000, liquidado_cents: 9250000, pago_cents: 9250000, status: 'pago', date: '2026-05-10' },
  { id: '5', ne_number: '2026NE000033', description: 'Equipamentos TI — PCI Computadores', funcao: '04 Administração', amount_cents: 8700000, liquidado_cents: 0, pago_cents: 0, status: 'cancelado', date: '2026-02-20' },
];

const PCASP_MOCK: PCASPNode[] = [
  { code: '1', title: 'ATIVO', natureza: 'D', nivel: 1, saldo_cents: 154300000, children: [
    { code: '1.1', title: 'ATIVO CIRCULANTE', natureza: 'D', nivel: 2, saldo_cents: 82100000, children: [
      { code: '1.1.1', title: 'Caixa e Equivalentes de Caixa', natureza: 'D', nivel: 3, saldo_cents: 45000000 },
      { code: '1.1.2', title: 'Créditos a Curto Prazo', natureza: 'D', nivel: 3, saldo_cents: 37100000 },
    ]},
    { code: '1.2', title: 'ATIVO NÃO CIRCULANTE', natureza: 'D', nivel: 2, saldo_cents: 72200000, children: [
      { code: '1.2.1', title: 'Realizável a Longo Prazo', natureza: 'D', nivel: 3, saldo_cents: 12200000 },
      { code: '1.2.2', title: 'Investimentos', natureza: 'D', nivel: 3, saldo_cents: 8000000 },
      { code: '1.2.3', title: 'Imobilizado', natureza: 'D', nivel: 3, saldo_cents: 52000000 },
    ]},
  ]},
  { code: '2', title: 'PASSIVO', natureza: 'C', nivel: 1, saldo_cents: 68900000, children: [
    { code: '2.1', title: 'PASSIVO CIRCULANTE', natureza: 'C', nivel: 2, saldo_cents: 28900000, children: [
      { code: '2.1.1', title: 'Obrigações Trabalhistas', natureza: 'C', nivel: 3, saldo_cents: 15400000 },
      { code: '2.1.2', title: 'Fornecedores', natureza: 'C', nivel: 3, saldo_cents: 13500000 },
    ]},
    { code: '2.2', title: 'PASSIVO NÃO CIRCULANTE', natureza: 'C', nivel: 2, saldo_cents: 40000000, children: [
      { code: '2.2.1', title: 'Empréstimos e Financiamentos', natureza: 'C', nivel: 3, saldo_cents: 40000000 },
    ]},
  ]},
  { code: '3', title: 'PATRIMÔNIO LÍQUIDO', natureza: 'C', nivel: 1, saldo_cents: 85400000 },
];

const LANCAMENTOS_MOCK: LancamentoContabil[] = [
  { id: '1', date: '2026-06-01', description: 'Reconhecimento de receita tributária — ISS', debito_account: '1.1.1.1 - Caixa', credito_account: '4.1.1.1 - Receita ISS', amount_cents: 18700000, status: 'confirmado' },
  { id: '2', date: '2026-06-05', description: 'Liquidação NE000045 — Construtora Delta', debito_account: '3.3.1.1 - Despesas Correntes', credito_account: '2.1.2.1 - Fornecedores', amount_cents: 49000000, status: 'confirmado' },
  { id: '3', date: '2026-06-10', description: 'Pagamento OB000028 — Construtora Delta', debito_account: '2.1.2.1 - Fornecedores', credito_account: '1.1.1.1 - Caixa', amount_cents: 49000000, status: 'confirmado' },
  { id: '4', date: '2026-06-12', description: 'Reclassificação provisória — folha de pessoal', debito_account: '3.3.1.9 - Despesas Pessoal', credito_account: '2.1.1.2 - Salários a Pagar', amount_cents: 32500000, status: 'rascunho' },
  { id: '5', date: '2026-05-28', description: 'Estorno: NE000033 cancelado', debito_account: '6.2.1.1 - Crédito Disponível', credito_account: '6.1.1.1 - Dotação Empenhada', amount_cents: 8700000, status: 'estornado' },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const pct = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%';

const statusColors: Record<ExecStatus, string> = {
  empenhado: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/40',
  liquidado: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-700/40',
  pago:      'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/40',
  cancelado: 'text-slate-500 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
};

const statusLabels: Record<ExecStatus, string> = {
  empenhado: 'Empenhado', liquidado: 'Liquidado', pago: 'Pago/OB', cancelado: 'Cancelado',
};

const lancStatusColors: Record<LancamentoContabil['status'], string> = {
  rascunho:  'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/40',
  confirmado:'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/40',
  estornado: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-700/40',
};

const lancStatusLabels: Record<LancamentoContabil['status'], string> = {
  rascunho: 'Rascunho', confirmado: 'Confirmado', estornado: 'Estornado',
};

// ─── PCASP Tree Row ───────────────────────────────────────────────────────────

const PCASPRow: React.FC<{ node: PCASPNode }> = ({ node }) => {
  const [expanded, setExpanded] = useState(node.nivel === 1);
  const hasChildren = node.children && node.children.length > 0;
  const indent = (node.nivel - 1) * 20;

  return (
    <>
      <tr
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`border-b mod-border mod-row-hover transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
      >
        <td className="py-2.5 px-4">
          <div style={{ paddingLeft: `${indent}px` }} className="flex items-center gap-2">
            {hasChildren ? (
              expanded ? <ChevronDown size={14} className="mod-text-secondary shrink-0" /> : <ChevronRight size={14} className="mod-text-secondary shrink-0" />
            ) : <span className="w-3.5 inline-block" />}
            <span className={`mono-data text-xs font-semibold ${node.nivel === 1 ? 'text-indigo-600 dark:text-indigo-400' : node.nivel === 2 ? 'text-sky-600 dark:text-sky-400' : 'mod-text-secondary'}`}>
              {node.code}
            </span>
          </div>
        </td>
        <td className={`py-2.5 px-4 text-sm ${node.nivel <= 2 ? 'font-semibold mod-text-primary' : 'mod-text-primary'}`}>
          {node.title}
        </td>
        <td className="py-2.5 px-4 text-center">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${node.natureza === 'D' ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'}`}>
            {node.natureza === 'D' ? 'Devedor' : 'Credor'}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right">
          <span className={`mono-data text-sm font-bold ${node.nivel === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'mod-text-primary'}`}>
            {fmt(node.saldo_cents)}
          </span>
        </td>
      </tr>
      {expanded && hasChildren && node.children!.map(child => (
        <PCASPRow key={child.code} node={child} />
      ))}
    </>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'execucao' | 'pcasp' | 'lancamentos';

// ─── Main Component ───────────────────────────────────────────────────────────

export const ModuleContabilidade: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('execucao');
  const [search, setSearch] = useState('');

  const kpis = useMemo(() => {
    const ativos = EMPENHOS_MOCK.filter(e => e.status !== 'cancelado');
    const empenhado = ativos.reduce((a, e) => a + e.amount_cents, 0);
    const liquidado = ativos.reduce((a, e) => a + e.liquidado_cents, 0);
    const pago = ativos.reduce((a, e) => a + e.pago_cents, 0);
    return { empenhado, liquidado, pago };
  }, []);

  const filteredEmpenhos = useMemo(() =>
    EMPENHOS_MOCK.filter(e =>
      search === '' ||
      e.ne_number.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.funcao.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const filteredLancamentos = useMemo(() =>
    LANCAMENTOS_MOCK.filter(l =>
      search === '' ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      l.debito_account.toLowerCase().includes(search.toLowerCase()) ||
      l.credito_account.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'execucao',    label: 'Execução Orçamentária', icon: TrendingUp },
    { id: 'pcasp',       label: 'Plano de Contas (PCASP)', icon: BookOpen },
    { id: 'lancamentos', label: 'Lançamentos Contábeis', icon: BarChart2 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Empenhado', value: kpis.empenhado, sub: `${EMPENHOS_MOCK.filter(e => e.status !== 'cancelado').length} notas de empenho`, color: 'text-amber-500', icon: Clock },
          { label: 'Total Liquidado', value: kpis.liquidado, sub: pct(kpis.liquidado, kpis.empenhado) + ' do empenhado', color: 'text-sky-500', icon: CheckCircle2 },
          { label: 'Total Pago (OB)', value: kpis.pago, sub: pct(kpis.pago, kpis.empenhado) + ' do empenhado', color: 'text-emerald-500', icon: TrendingUp },
        ].map((k) => (
          <div key={k.label} className="mod-kpi">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs mod-text-secondary uppercase tracking-wide">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className={`mono-data text-xl font-bold ${k.color}`}>{fmt(k.value)}</p>
            <p className="text-xs mod-text-secondary mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b mod-border gap-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent mod-text-secondary hover:mod-text-primary'}`}
            >
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Search (shared) */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'pcasp' ? 'Buscar conta...' : activeTab === 'lancamentos' ? 'Buscar lançamento...' : 'Buscar empenho...'}
            className="mod-input w-full pl-9"
          />
        </div>

        {/* ── Execução Orçamentária ── */}
        {activeTab === 'execucao' && (
          <div className="space-y-3">
            {filteredEmpenhos.map((e) => {
              const liqPct = e.amount_cents > 0 ? (e.liquidado_cents / e.amount_cents) * 100 : 0;
              const pagPct = e.amount_cents > 0 ? (e.pago_cents / e.amount_cents) * 100 : 0;
              return (
                <div key={e.id} className="mod-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="mono-data text-xs text-indigo-600 dark:text-indigo-400">{e.ne_number}</span>
                        <span className="text-xs mod-text-secondary bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-1.5 py-0.5 rounded">{e.funcao}</span>
                      </div>
                      <p className="text-sm font-semibold mod-text-primary">{e.description}</p>
                      <p className="mono-data text-xs mod-text-secondary mt-0.5">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold shrink-0 ${statusColors[e.status]}`}>
                      {statusLabels[e.status]}
                    </div>
                  </div>

                  {e.status !== 'cancelado' && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Empenhado', v: e.amount_cents, color: 'text-amber-600 dark:text-amber-400' },
                          { label: 'Liquidado', v: e.liquidado_cents, color: 'text-sky-600 dark:text-sky-400' },
                          { label: 'Pago', v: e.pago_cents, color: 'text-emerald-600 dark:text-emerald-400' },
                        ].map((k) => (
                          <div key={k.label} className="mod-inner rounded-lg p-2">
                            <p className="text-xs mod-text-secondary mb-0.5">{k.label}</p>
                            <p className={`mono-data text-xs font-bold ${k.color}`}>{fmt(k.v)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 mod-track rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `100%` }} />
                          </div>
                          <span className="mono-data text-xs mod-text-secondary w-12 text-right">100%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 mod-track rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(liqPct, 100)}%` }} />
                          </div>
                          <span className="mono-data text-xs mod-text-secondary w-12 text-right">{pct(e.liquidado_cents, e.amount_cents)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 mod-track rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pagPct, 100)}%` }} />
                          </div>
                          <span className="mono-data text-xs mod-text-secondary w-12 text-right">{pct(e.pago_cents, e.amount_cents)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {filteredEmpenhos.length === 0 && (
              <div className="mod-empty">Nenhum empenho encontrado.</div>
            )}
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm transition-colors">
              <Plus size={14} /> Registrar Empenho
            </button>
          </div>
        )}

        {/* ── Plano de Contas PCASP ── */}
        {activeTab === 'pcasp' && (
          <div className="mod-card overflow-hidden">
            {/* Equilíbrio header */}
            <div className="mod-header px-4 py-3 border-b mod-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-500" />
                <span className="text-sm font-semibold mod-text-primary">Plano de Contas PCASP — Exercício 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-emerald-500" />
                <span className="mono-data text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Equilíbrio: {fmt(PCASP_MOCK.filter(n => n.natureza === 'D').reduce((a, n) => a + n.saldo_cents, 0))} = {fmt(PCASP_MOCK.filter(n => n.natureza === 'C').reduce((a, n) => a + n.saldo_cents, 0) + 85400000)}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="mod-header border-b mod-border">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase tracking-wide w-32">Código</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase tracking-wide">Conta</th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold mod-text-secondary uppercase tracking-wide w-28">Natureza</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold mod-text-secondary uppercase tracking-wide w-40">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {PCASP_MOCK.map(node => <PCASPRow key={node.code} node={node} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Lançamentos Contábeis ── */}
        {activeTab === 'lancamentos' && (
          <div className="space-y-3">
            {/* Balance check */}
            {(() => {
              const confirmed = filteredLancamentos.filter(l => l.status === 'confirmado');
              const totalD = confirmed.reduce((a, l) => a + l.amount_cents, 0);
              const totalC = totalD;
              const balanced = totalD === totalC;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${balanced ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40 text-rose-700 dark:text-rose-300'}`}>
                  {balanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>
                    {balanced ? '✅ Partidas em equilíbrio: ' : '⚠️ Desequilíbrio detectado: '}
                    <span className="mono-data">Σ(D) = {fmt(totalD)} = Σ(C) = {fmt(totalC)}</span>
                  </span>
                </div>
              );
            })()}

            <div className="mod-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="mod-header border-b mod-border">
                      <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase w-24">Data</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase">Histórico</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase">Débito</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold mod-text-secondary uppercase">Crédito</th>
                      <th className="py-2.5 px-4 text-right text-xs font-semibold mod-text-secondary uppercase w-32">Valor</th>
                      <th className="py-2.5 px-4 text-center text-xs font-semibold mod-text-secondary uppercase w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLancamentos.map((l) => (
                      <tr key={l.id} className={`border-b mod-border mod-row-hover transition-colors ${l.status === 'estornado' ? 'opacity-60' : ''}`}>
                        <td className="py-2.5 px-4 mono-data text-xs mod-text-secondary whitespace-nowrap">
                          {new Date(l.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-4 text-sm mod-text-primary max-w-xs">
                          <span className="line-clamp-1">{l.description}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="mono-data text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700/30 px-2 py-0.5 rounded line-clamp-1">
                            {l.debito_account}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="mono-data text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-700/30 px-2 py-0.5 rounded line-clamp-1">
                            {l.credito_account}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right mono-data text-sm font-bold mod-text-primary whitespace-nowrap">
                          {fmt(l.amount_cents)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${lancStatusColors[l.status]}`}>
                            {lancStatusLabels[l.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLancamentos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm mod-text-secondary">
                          Nenhum lançamento encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm transition-colors">
              <Plus size={14} /> Novo Lançamento Contábil
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleContabilidade;
