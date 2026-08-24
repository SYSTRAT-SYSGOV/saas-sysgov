import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Search, AlertTriangle, CheckCircle2, Clock, XCircle,
  Paperclip, GitBranch, Scale, Building2, Calendar, DollarSign, Eye,
  Edit3, X,
} from 'lucide-react';

// ─── Mock Data ───────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const pct = (val: number) => `${val.toFixed(2)}%`;

const statusConfig: Record<Contrato['status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft:      { label: 'Minuta',       icon: Edit3,        color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' },
  active:     { label: 'Vigente',      icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/50' },
  in_renewal: { label: 'Em Renovação', icon: Clock,        color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/50' },
  suspended:  { label: 'Suspenso',     icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/50' },
  ended:      { label: 'Encerrado',    icon: CheckCircle2, color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' },
  cancelled:  { label: 'Cancelado',    icon: XCircle,      color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/50' },
};

const typeLabel: Record<Contrato['contract_type'], string> = {
  termo_contrato: 'Termo de Contrato',
  ata_rp: 'Ata de Registro de Preços',
  convenio: 'Convênio',
  termo_aditivo: 'Termo Aditivo',
};

// ─── Contract Card ────────────────────────────────────────────────────────────

const ContractCard: React.FC<{ c: Contrato; onClick: () => void }> = ({ c, onClick }) => {
  const cfg = statusConfig[c.status];
  const Icon = cfg.icon;
  const addendaPct = c.amount_cents > 0 ? (c.total_addenda_amount_cents / c.amount_cents) * 100 : 0;
  const isNearLimit = addendaPct >= 20;
  const effective = c.amount_cents + c.total_addenda_amount_cents;
  const daysLeft = Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000);

  return (
    <div
      onClick={onClick}
      className="mod-card mod-card-hover group relative p-5 cursor-pointer transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="mono-data text-xs text-indigo-600 dark:text-indigo-400">{c.number}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/40 text-indigo-700 dark:text-indigo-300">
              {typeLabel[c.contract_type]}
            </span>
          </div>
          <h3 className="text-sm font-semibold mod-text-primary leading-snug line-clamp-2">{c.title}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.color} shrink-0`}>
          <Icon size={12} />
          {cfg.label}
        </div>
      </div>

      {/* Supplier */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={13} className="mod-text-secondary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs mod-text-primary font-medium truncate">{c.supplier_name}</p>
          <p className="mono-data text-xs mod-text-secondary">{c.supplier_cnpj}</p>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="mod-inner rounded-lg p-2.5">
          <p className="text-xs mod-text-secondary mb-0.5">Valor Original</p>
          <p className="mono-data text-sm font-bold mod-text-primary">{fmt(c.amount_cents)}</p>
        </div>
        <div className="mod-inner rounded-lg p-2.5">
          <p className="text-xs mod-text-secondary mb-0.5">Valor Efetivo</p>
          <p className={`mono-data text-sm font-bold ${c.total_addenda_amount_cents > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {fmt(effective)}
          </p>
        </div>
      </div>

      {/* Addenda progress */}
      {c.total_addenda_amount_cents > 0 && (
        <div className={`mb-4 p-2.5 rounded-lg border ${isNearLimit ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/40' : 'mod-inner border-transparent'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch size={12} className={isNearLimit ? 'text-amber-500' : 'mod-text-secondary'} />
            <span className={`text-xs font-medium ${isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'mod-text-secondary'}`}>
              Aditivos: {fmt(c.total_addenda_amount_cents)} ({pct(addendaPct)})
            </span>
          </div>
          <div className="h-1.5 mod-track rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min((addendaPct / c.max_addenda_percent) * 100, 100)}%` }}
            />
          </div>
          <p className="mono-data text-xs mod-text-muted mt-1">
            Limite: {pct(c.max_addenda_percent)} — {fmt(Math.round(c.amount_cents * c.max_addenda_percent / 100))}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 mod-text-secondary">
          <Calendar size={12} />
          <span className="mono-data">{new Date(c.starts_at).toLocaleDateString('pt-BR')} → {new Date(c.ends_at).toLocaleDateString('pt-BR')}</span>
        </div>
        {c.status === 'active' && (
          <span className={`mono-data font-medium ${daysLeft < 30 ? 'text-rose-500' : daysLeft < 90 ? 'text-amber-500' : 'mod-text-secondary'}`}>
            {daysLeft > 0 ? `${daysLeft}d` : 'Vencido'}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const ContractDetail: React.FC<{ c: Contrato; onClose: () => void }> = ({ c, onClose }) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'aditivos' | 'anexos' | 'historico'>('aditivos');
  const cfg = statusConfig[c.status];
  const Icon = cfg.icon;
  const effective = c.amount_cents + c.total_addenda_amount_cents;
  const addendaPct = c.amount_cents > 0 ? (c.total_addenda_amount_cents / c.amount_cents) * 100 : 0;
  const maxAllowed = Math.round(c.amount_cents * c.max_addenda_percent / 100);
  const remaining = maxAllowed - c.total_addenda_amount_cents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full mod-panel overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#101a3a]/95 backdrop-blur border-b mod-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="mono-data text-xs text-indigo-600 dark:text-indigo-400">{c.number}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                  <Icon size={10} />{cfg.label}
                </div>
              </div>
              <h2 className="text-base font-bold mod-text-primary">{c.title}</h2>
              <p className="text-xs mod-text-secondary mt-0.5">{c.supplier_name} • {c.supplier_cnpj}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 mod-text-secondary hover:mod-text-primary shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Valor Original', value: fmt(c.amount_cents), highlight: false },
              { label: 'Total Aditivos', value: fmt(c.total_addenda_amount_cents), sub: `${pct(addendaPct)} aditado`, highlight: addendaPct > 0 },
              { label: 'Valor Efetivo', value: fmt(effective), highlight: c.total_addenda_amount_cents > 0 },
            ].map((k) => (
              <div key={k.label} className="mod-card p-3">
                <p className="text-xs mod-text-secondary mb-1">{k.label}</p>
                <p className={`mono-data text-sm font-bold ${k.highlight ? 'text-amber-600 dark:text-amber-300' : 'mod-text-primary'}`}>{k.value}</p>
                {k.sub && <p className="mono-data text-xs mod-text-muted mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Addenda meter */}
          <div className="mod-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold mod-text-primary flex items-center gap-2">
                <Scale size={15} className="text-indigo-500" /> Limite de Aditamento (Lei 14.133/2021)
              </h3>
              <span className={`mono-data text-xs font-bold ${addendaPct / c.max_addenda_percent > 0.8 ? 'text-rose-500' : addendaPct > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {pct(addendaPct)} / {pct(c.max_addenda_percent)}
              </span>
            </div>
            <div className="h-2 mod-track rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${addendaPct / c.max_addenda_percent > 0.8 ? 'bg-rose-500' : addendaPct > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((addendaPct / c.max_addenda_percent) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mono-data text-xs mod-text-secondary">
              <span>Usado: {fmt(c.total_addenda_amount_cents)}</span>
              <span>Disponível: {fmt(Math.max(0, remaining))}</span>
              <span>Máx: {fmt(maxAllowed)}</span>
            </div>
          </div>

          {/* Gestores */}
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Gestor do Contrato', value: c.manager }, { label: 'Fiscal do Contrato', value: c.inspector }].map((g) => (
              <div key={g.label} className="mod-card p-3">
                <p className="text-xs mod-text-secondary mb-1">{g.label}</p>
                <p className="text-sm font-semibold mod-text-primary">{g.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b mod-border mb-4">
              {(['aditivos', 'anexos', 'historico'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveDetailTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeDetailTab === t ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent mod-text-secondary hover:mod-text-primary'}`}
                >
                  {t === 'aditivos' ? '📋 Aditivos' : t === 'anexos' ? '📎 Anexos' : '🕐 Histórico'}
                </button>
              ))}
            </div>

            {activeDetailTab === 'aditivos' && (
              <div className="space-y-3">
                {c.total_addenda_amount_cents > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch size={14} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">TA-01/2026 — Ampliação de Escopo</span>
                    </div>
                    <div className="flex justify-between mono-data text-xs mod-text-secondary">
                      <span>Valor: <span className="text-amber-600 dark:text-amber-300">{fmt(c.total_addenda_amount_cents)}</span></span>
                      <span>Vigência: 01/06/2026</span>
                    </div>
                  </div>
                ) : (
                  <div className="mod-empty">Nenhum aditivo registrado</div>
                )}
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm transition-colors">
                  <Plus size={14} /> Novo Termo Aditivo
                </button>
              </div>
            )}

            {activeDetailTab === 'anexos' && (
              <div className="space-y-3">
                {['Minuta Assinada.pdf', 'Edital TCE-PR.pdf', 'Proposta Vencedora.pdf'].map((file) => (
                  <div key={file} className="mod-card mod-card-hover flex items-center justify-between p-3 cursor-pointer group transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Paperclip size={14} className="mod-text-secondary" />
                      <span className="text-sm mod-text-primary">{file}</span>
                    </div>
                    <Eye size={14} className="mod-text-secondary group-hover:text-indigo-500 transition-colors" />
                  </div>
                ))}
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm transition-colors">
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
                  <div key={i} className="mod-card flex items-start gap-3 p-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${h.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mod-text-primary">{h.action}</p>
                      <p className="mono-data text-xs mod-text-secondary">{h.user} • {h.date}</p>
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

// ─── Main Component ───────────────────────────────────────────────────────────

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
      {/* Header Card */}
      <div className="mod-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mod-text-primary flex items-center gap-2">
            <FileText className="text-indigo-500" size={20} />
            Gestão de Contratos (Lei 14.133)
          </h1>
          <p className="text-sm mod-text-secondary mt-1">Ciclo de vida contratual, aditivos e fiscalização em tempo real.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Contratos', value: kpis.total, sub: `${kpis.active} vigentes`, icon: FileText, color: 'text-indigo-500' },
          { label: 'Valor Total Efetivo', value: fmt(kpis.totalAmount), sub: 'com aditivos', icon: DollarSign, color: 'text-emerald-500', mono: true },
          { label: 'Vencem em 30 dias', value: kpis.expiring30, sub: 'requerem atenção', icon: AlertTriangle, color: 'text-rose-500' },
          { label: 'Vencem em 90 dias', value: kpis.expiring90, sub: 'monitorar', icon: Clock, color: 'text-amber-500' },
        ].map((k) => (
          <div key={k.label} className="mod-kpi">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs mod-text-secondary uppercase tracking-wide">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className={`text-xl font-bold ${k.color} ${k.mono ? 'mono-data' : ''}`}>{k.value}</p>
            <p className="text-xs mod-text-secondary mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mod-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, título ou fornecedor..."
            className="mod-input w-full pl-9"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="mod-input">
          <option value="all">Todos os Status</option>
          <option value="active">Vigente</option>
          <option value="draft">Minuta</option>
          <option value="in_renewal">Em Renovação</option>
          <option value="suspended">Suspenso</option>
          <option value="ended">Encerrado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="mod-input">
          <option value="all">Todos os Tipos</option>
          <option value="termo_contrato">Termo de Contrato</option>
          <option value="ata_rp">Ata de RP</option>
          <option value="convenio">Convênio</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <ContractCard key={c.id} c={c} onClick={() => setSelected(c)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full mod-empty">
            <FileText className="mx-auto mb-3 opacity-30" size={32} />
            <p>Nenhum contrato encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {selected && <ContractDetail c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ModuleContratos;
