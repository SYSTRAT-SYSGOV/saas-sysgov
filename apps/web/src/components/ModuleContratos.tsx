import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Search, AlertTriangle, CheckCircle2, Clock, XCircle,
  ChevronRight, Paperclip, GitBranch, History, Scale, TrendingUp,
  Building2, Calendar, DollarSign, Eye, Edit3, X, Check, Ban,
} from 'lucide-react';

// ─── Mock Data ─────────────────────────────────────────────────────────────

interface Contrato {
  id: string;
  number: string;
  title: string;
  contract_type: 'termo_contrato' | 'ata_rp' | 'convenio' | 'termo_aditivo';
  supplier_name: string;
  supplier_cnpj: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  total_addenda_amount_cents: number;
  max_addenda_percent: number;
  status: 'draft' | 'active' | 'in_renewal' | 'suspended' | 'ended' | 'cancelled';
  manager: string;
  inspector: string;
}

const CONTRATOS_MOCK: Contrato[] = [
  { id: '1', number: 'CT-2026/0089', title: 'Locação de Software de Gestão Fiscal', contract_type: 'termo_contrato', supplier_name: 'SYSTRAT Tecnologia Ltda', supplier_cnpj: '24.847.002/0001-09', starts_at: '2026-01-01', ends_at: '2026-12-31', amount_cents: 32400000, total_addenda_amount_cents: 0, max_addenda_percent: 25, status: 'active', manager: 'Carlos Souza', inspector: 'Ana Lima' },
  { id: '2', number: 'CT-2026/0045', title: 'Manutenção Corretiva de Vias Urbanas', contract_type: 'termo_contrato', supplier_name: 'Construtora Delta S.A.', supplier_cnpj: '12.456.789/0001-00', starts_at: '2026-03-01', ends_at: '2026-08-31', amount_cents: 98000000, total_addenda_amount_cents: 19600000, max_addenda_percent: 25, status: 'active', manager: 'Roberto Alves', inspector: 'Fernanda Costa' },
  { id: '3', number: 'CT-2025/0211', title: 'Fornecimento de Merenda Escolar', contract_type: 'ata_rp', supplier_name: 'Alimenta Brasil Distribuidora', supplier_cnpj: '98.765.432/0001-11', starts_at: '2025-02-01', ends_at: '2026-01-31', amount_cents: 45000000, total_addenda_amount_cents: 9000000, max_addenda_percent: 25, status: 'ended', manager: 'Patrícia Melo', inspector: 'João Vitor' },
  { id: '4', number: 'CT-2026/0102', title: 'Serviços de Limpeza e Conservação Predial', contract_type: 'termo_contrato', supplier_name: 'CleanMax Serviços Ltda', supplier_cnpj: '55.123.654/0001-88', starts_at: '2026-05-01', ends_at: '2026-10-31', amount_cents: 18500000, total_addenda_amount_cents: 0, max_addenda_percent: 25, status: 'in_renewal', manager: 'Beatriz Ramos', inspector: 'Lucas Ferreira' },
  { id: '5', number: 'CTR-2026/0018', title: 'Convênio FNDE — Equipamentos Escolares', contract_type: 'convenio', supplier_name: 'FNDE / Governo Federal', supplier_cnpj: '00.378.257/0001-81', starts_at: '2026-01-15', ends_at: '2027-01-14', amount_cents: 75000000, total_addenda_amount_cents: 0, max_addenda_percent: 50, status: 'active', manager: 'Fernanda Costa', inspector: 'Marcos Neto' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const pct = (val: number) => `${val.toFixed(2)}%`;

const statusConfig: Record<Contrato['status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft: { label: 'Minuta', icon: Edit3, color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700' },
  active: { label: 'Vigente', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-700/50' },
  in_renewal: { label: 'Em Renovação', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-700/50' },
  suspended: { label: 'Suspenso', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-700/50' },
  ended: { label: 'Encerrado', icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-700/50' },
};

const typeLabel: Record<Contrato['contract_type'], string> = {
  termo_contrato: 'Termo de Contrato',
  ata_rp: 'Ata de Registro de Preços',
  convenio: 'Convênio',
  termo_aditivo: 'Termo Aditivo',
};

// ─── AddendaBar ─────────────────────────────────────────────────────────────

const AddendaBar: React.FC<{ used: number; max: number }> = ({ used, max }) => {
  const pctUsed = max > 0 ? Math.min((used / (max * 0.01 * (used + 10000000))) * 100, 100) : 0;
  const addendaPct = used > 0 ? (used / (used + 10000000)) * 100 : 0;
  const realPct = (used / (used + (25 * 10000000 / 100))) * 100;

  // Calcular % real: usado / (original * maxPercent)
  const original = used + (used > 0 ? used : 1);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-mono">Aditivos usados</span>
        <span className={`font-mono font-semibold ${used > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {used > 0 ? `${pct(20)} de ${pct(max)}` : `0% de ${pct(max)}`}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${used > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: used > 0 ? '80%' : '0%' }}
        />
      </div>
    </div>
  );
};

// ─── ContractCard ─────────────────────────────────────────────────────────

const ContractCard: React.FC<{ c: Contrato; onClick: () => void }> = ({ c, onClick }) => {
  const cfg = statusConfig[c.status];
  const Icon = cfg.icon;
  const addendaPct = c.amount_cents > 0 ? (c.total_addenda_amount_cents / c.amount_cents) * 100 : 0;
  const isNearLimit = addendaPct >= 20;
  const effective = c.amount_cents + c.total_addenda_amount_cents;

  const daysLeft = Math.ceil(
    (new Date(c.ends_at).getTime() - Date.now()) / 86400000
  );

  return (
    <div
      onClick={onClick}
      className={`group relative bg-[#152244] border border-[#1a2a52] rounded-xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-[#1a2a52] transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-indigo-400">{c.number}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 border border-indigo-700/40 text-indigo-300">
              {typeLabel[c.contract_type]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">{c.title}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.color} shrink-0`}>
          <Icon size={12} />
          {cfg.label}
        </div>
      </div>

      {/* Supplier */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={13} className="text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-slate-300 font-medium truncate">{c.supplier_name}</p>
          <p className="font-mono text-xs text-slate-500">{c.supplier_cnpj}</p>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Valor Original</p>
          <p className="font-mono text-sm font-bold text-slate-200 tabular-nums">{fmt(c.amount_cents)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Valor Efetivo</p>
          <p className={`font-mono text-sm font-bold tabular-nums ${c.total_addenda_amount_cents > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
            {fmt(effective)}
          </p>
        </div>
      </div>

      {/* Addenda bar */}
      {c.total_addenda_amount_cents > 0 && (
        <div className={`mb-4 p-2.5 rounded-lg border ${isNearLimit ? 'bg-amber-950/40 border-amber-700/40' : 'bg-slate-900/50 border-slate-700/50'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch size={12} className={isNearLimit ? 'text-amber-400' : 'text-slate-400'} />
            <span className={`text-xs font-medium ${isNearLimit ? 'text-amber-400' : 'text-slate-400'}`}>
              Aditivos: {fmt(c.total_addenda_amount_cents)} ({pct(addendaPct)})
            </span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min((addendaPct / c.max_addenda_percent) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Limite: {pct(c.max_addenda_percent)} — {fmt(Math.round(c.amount_cents * c.max_addenda_percent / 100))}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar size={12} />
          <span className="font-mono tabular-nums">{new Date(c.starts_at).toLocaleDateString('pt-BR')} → {new Date(c.ends_at).toLocaleDateString('pt-BR')}</span>
        </div>
        {c.status === 'active' && (
          <span className={`font-mono font-medium tabular-nums ${daysLeft < 30 ? 'text-rose-400' : daysLeft < 90 ? 'text-amber-400' : 'text-slate-400'}`}>
            {daysLeft > 0 ? `${daysLeft}d` : 'Vencido'}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Detail Panel ────────────────────────────────────────────────────────────

const ContractDetail: React.FC<{ c: Contrato; onClose: () => void }> = ({ c, onClose }) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'aditivos' | 'anexos' | 'historico'>('aditivos');
  const cfg = statusConfig[c.status];
  const Icon = cfg.icon;
  const effective = c.amount_cents + c.total_addenda_amount_cents;
  const addendaPct = c.amount_cents > 0 ? (c.total_addenda_amount_cents / c.amount_cents) * 100 : 0;
  const maxAllowed = Math.round(c.amount_cents * c.max_addenda_percent / 100);
  const remaining = maxAllowed - c.total_addenda_amount_cents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-[#101a3a] border-l border-[#1a2a52] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#101a3a]/95 backdrop-blur border-b border-[#1a2a52] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-indigo-400">{c.number}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                  <Icon size={10} />{cfg.label}
                </div>
              </div>
              <h2 className="text-base font-bold text-slate-100">{c.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{c.supplier_name} • {c.supplier_cnpj}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Valor Original', value: fmt(c.amount_cents), sub: '' },
              { label: 'Total Aditivos', value: fmt(c.total_addenda_amount_cents), sub: `${pct(addendaPct)} aditado`, highlight: addendaPct > 0 },
              { label: 'Valor Efetivo', value: fmt(effective), sub: 'valor atual', highlight: c.total_addenda_amount_cents > 0 },
            ].map((k) => (
              <div key={k.label} className="bg-[#152244] border border-[#1a2a52] rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`font-mono text-sm font-bold tabular-nums ${k.highlight ? 'text-amber-300' : 'text-slate-100'}`}>{k.value}</p>
                {k.sub && <p className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Addenda usage */}
          <div className="bg-[#152244] border border-[#1a2a52] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Scale size={15} className="text-indigo-400" /> Limite de Aditamento (Lei 14.133/2021)
              </h3>
              <span className={`font-mono text-xs font-bold tabular-nums ${addendaPct / c.max_addenda_percent > 0.8 ? 'text-rose-400' : addendaPct > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {pct(addendaPct)} / {pct(c.max_addenda_percent)}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${addendaPct / c.max_addenda_percent > 0.8 ? 'bg-rose-500' : addendaPct > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((addendaPct / c.max_addenda_percent) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500 tabular-nums">
              <span>Usado: {fmt(c.total_addenda_amount_cents)}</span>
              <span>Disponível: {fmt(Math.max(0, remaining))}</span>
              <span>Máx: {fmt(maxAllowed)}</span>
            </div>
          </div>

          {/* Gestores */}
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Gestor do Contrato', value: c.manager }, { label: 'Fiscal do Contrato', value: c.inspector }].map((g) => (
              <div key={g.label} className="bg-[#152244] border border-[#1a2a52] rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{g.label}</p>
                <p className="text-sm font-semibold text-slate-200">{g.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-[#1a2a52] mb-4">
              {(['aditivos', 'anexos', 'historico'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveDetailTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeDetailTab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                  {t === 'aditivos' ? '📋 Aditivos' : t === 'anexos' ? '📎 Anexos' : '🕐 Histórico'}
                </button>
              ))}
            </div>

            {activeDetailTab === 'aditivos' && (
              <div className="space-y-3">
                {c.total_addenda_amount_cents > 0 ? (
                  <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch size={14} className="text-amber-400" />
                      <span className="text-sm font-semibold text-amber-300">TA-01/2026 — Ampliação de Escopo</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-slate-400 tabular-nums">
                      <span>Valor: <span className="text-amber-300">{fmt(c.total_addenda_amount_cents)}</span></span>
                      <span>Vigência: 01/06/2026</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">Nenhum aditivo registrado</div>
                )}
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-indigo-500/40 text-indigo-400 hover:bg-indigo-900/20 text-sm transition-colors">
                  <Plus size={14} /> Novo Termo Aditivo
                </button>
              </div>
            )}

            {activeDetailTab === 'anexos' && (
              <div className="space-y-3">
                {['Minuta Assinada.pdf', 'Edital TCE-PR.pdf', 'Proposta Vencedora.pdf'].map((file) => (
                  <div key={file} className="flex items-center justify-between p-3 bg-[#152244] border border-[#1a2a52] rounded-xl hover:border-indigo-500/40 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Paperclip size={14} className="text-slate-500" />
                      <span className="text-sm text-slate-300">{file}</span>
                    </div>
                    <Eye size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                ))}
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-indigo-500/40 text-indigo-400 hover:bg-indigo-900/20 text-sm transition-colors">
                  <Plus size={14} /> Anexar Documento
                </button>
              </div>
            )}

            {activeDetailTab === 'historico' && (
              <div className="space-y-2">
                {[
                  { action: 'Contrato Criado', user: 'Carlos Souza', date: '01/01/2026', color: 'emerald' },
                  { action: 'Status: Ativo', user: 'Sistema', date: '02/01/2026', color: 'emerald' },
                  ...(c.total_addenda_amount_cents > 0 ? [{ action: 'Aditivo TA-01/2026 aprovado', user: 'Roberto Alves', date: '15/05/2026', color: 'amber' }] : []),
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#152244] border border-[#1a2a52] rounded-lg">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${h.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{h.action}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">{h.user} • {h.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const ModuleContratos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selected, setSelected] = useState<Contrato | null>(null);

  const filtered = useMemo(() => CONTRATOS_MOCK.filter(c => {
    const matchSearch = search === '' ||
      c.number.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.supplier_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchType = filterType === 'all' || c.contract_type === filterType;
    return matchSearch && matchStatus && matchType;
  }), [search, filterStatus, filterType]);

  const kpis = useMemo(() => ({
    total: CONTRATOS_MOCK.length,
    active: CONTRATOS_MOCK.filter(c => c.status === 'active').length,
    totalAmount: CONTRATOS_MOCK.reduce((a, c) => a + c.amount_cents + c.total_addenda_amount_cents, 0),
    expiring30: CONTRATOS_MOCK.filter(c => c.status === 'active' && Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000) <= 30).length,
    expiring90: CONTRATOS_MOCK.filter(c => c.status === 'active' && Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000) <= 90).length,
  }), []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Contratos', value: kpis.total, sub: `${kpis.active} vigentes`, icon: FileText, color: 'text-indigo-400' },
          { label: 'Valor Total Efetivo', value: fmt(kpis.totalAmount), sub: 'com aditivos', icon: DollarSign, color: 'text-emerald-400', mono: true },
          { label: 'Vencem em 30 dias', value: kpis.expiring30, sub: 'requerem atenção', icon: AlertTriangle, color: 'text-rose-400' },
          { label: 'Vencem em 90 dias', value: kpis.expiring90, sub: 'monitorar', icon: Clock, color: 'text-amber-400' },
        ].map((k) => (
          <div key={k.label} className="bg-[#152244] border border-[#1a2a52] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className={`text-xl font-bold ${k.color} ${k.mono ? 'font-mono tabular-nums' : ''}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, título ou fornecedor..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Vigente</option>
          <option value="draft">Minuta</option>
          <option value="in_renewal">Em Renovação</option>
          <option value="suspended">Suspenso</option>
          <option value="ended">Encerrado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">Todos os Tipos</option>
          <option value="termo_contrato">Termo de Contrato</option>
          <option value="ata_rp">Ata de RP</option>
          <option value="convenio">Convênio</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <ContractCard key={c.id} c={c} onClick={() => setSelected(c)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-500">
            <FileText className="mx-auto mb-3 opacity-40" size={32} />
            <p>Nenhum contrato encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && <ContractDetail c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ModuleContratos;
