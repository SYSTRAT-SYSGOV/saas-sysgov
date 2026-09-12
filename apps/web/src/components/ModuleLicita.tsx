import React, { useState, useMemo } from 'react';
import {
  Gavel, Plus, Search, AlertTriangle, CheckCircle2, Clock, FileText,
  Building2, Calendar, FileDown, Eye, Edit3, X, ArrowRight, ShieldAlert,
} from 'lucide-react';
import { Button, Modal } from '@sysgov/ui';

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface ProcessoLicita {
  id: string;
  numero: string;
  objeto: string;
  fase_atual: 'dfd' | 'etp' | 'mapa_riscos' | 'pesquisa_precos' | 'tr' | 'edital' | 'concluido';
  modalidade: 'dispensa' | 'pregao_eletronico' | 'concorrencia' | 'inexigibilidade';
  secretaria: string;
  valor_estimado_cents: number;
  dfd_status: 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
  created_at: string;
  responsavel: string;
}

const PROCESSOS_MOCK: ProcessoLicita[] = [
  {
    id: '1',
    numero: 'PR-2026/0012',
    objeto: 'Aquisição de combustíveis (gasolina comum e óleo diesel) para abastecimento da frota municipal de saúde e educação',
    fase_atual: 'dfd',
    modalidade: 'pregao_eletronico',
    secretaria: 'Secretaria Municipal de Administração',
    valor_estimado_cents: 145000000,
    dfd_status: 'aprovado',
    created_at: '2026-08-10',
    responsavel: 'Mariana Silveira',
  },
  {
    id: '2',
    numero: 'PR-2026/0015',
    objeto: 'Contratação de empresa especializada para reforma e modernização da Escola Municipal Tancredo Neves',
    fase_atual: 'etp',
    modalidade: 'concorrencia',
    secretaria: 'Secretaria Municipal de Educação',
    valor_estimado_cents: 285000000,
    dfd_status: 'aprovado',
    created_at: '2026-08-15',
    responsavel: 'Eng. Roberto Alves',
  },
  {
    id: '3',
    numero: 'PR-2026/0019',
    objeto: 'Aquisição emergencial de medicamentos e insumos hospitalares de atenção básica',
    fase_atual: 'pesquisa_precos',
    modalidade: 'dispensa',
    secretaria: 'Secretaria Municipal de Saúde',
    valor_estimado_cents: 42000000,
    dfd_status: 'aprovado',
    created_at: '2026-09-01',
    responsavel: 'Dra. Beatriz Ramos',
  },
  {
    id: '4',
    numero: 'PR-2026/0022',
    objeto: 'Serviços continuados de vigilância armada e monitoramento eletrônico para prédios públicos',
    fase_atual: 'tr',
    modalidade: 'pregao_eletronico',
    secretaria: 'Secretaria Municipal de Segurança Pública',
    valor_estimado_cents: 198000000,
    dfd_status: 'em_revisao',
    created_at: '2026-09-05',
    responsavel: 'Carlos Souza',
  },
  {
    id: '5',
    numero: 'PR-2026/0024',
    objeto: 'Licenciamento de software governamental de gestão tributária e fiscalização municipal',
    fase_atual: 'dfd',
    modalidade: 'inexigibilidade',
    secretaria: 'Secretaria de Finanças e Planejamento',
    valor_estimado_cents: 75000000,
    dfd_status: 'rascunho',
    created_at: '2026-09-11',
    responsavel: 'Lucas Ferreira',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const faseConfig: Record<ProcessoLicita['fase_atual'], { label: string; color: string; bg: string }> = {
  dfd: { label: 'DFD (Documento de Formalização)', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-700/50' },
  etp: { label: 'ETP (Estudo Técnico Preliminar)', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-700/50' },
  mapa_riscos: { label: 'Mapa de Riscos', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-700/50' },
  pesquisa_precos: { label: 'Pesquisa de Preços', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-700/50' },
  tr: { label: 'Termo de Referência', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-700/50' },
  edital: { label: 'Minuta de Edital', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-700/50' },
  concluido: { label: 'Processo Concluído', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' },
};

const modalidadeLabel: Record<ProcessoLicita['modalidade'], string> = {
  pregao_eletronico: 'Pregão Eletrônico',
  dispensa: 'Dispensa de Licitação',
  concorrencia: 'Concorrência Pública',
  inexigibilidade: 'Inexigibilidade',
};

const dfdStatusConfig: Record<ProcessoLicita['dfd_status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', icon: Edit3, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' },
  em_revisao: { label: 'Em Revisão', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/50' },
  aprovado: { label: 'DFD Aprovado', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/50' },
  rejeitado: { label: 'Rejeitado', icon: ShieldAlert, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/50' },
};

// ─── Process Card ─────────────────────────────────────────────────────────────

const ProcessoCard: React.FC<{ p: ProcessoLicita; onClick: () => void }> = ({ p, onClick }) => {
  const fase = faseConfig[p.fase_atual];
  const dfd = dfdStatusConfig[p.dfd_status];
  const DfdIcon = dfd.icon;

  return (
    <div
      onClick={onClick}
      className="mod-card mod-card-hover group relative p-5 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="mono-data text-xs text-indigo-600 dark:text-indigo-400 font-bold">{p.numero}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/40 text-indigo-700 dark:text-indigo-300">
              {modalidadeLabel[p.modalidade]}
            </span>
          </div>
          <h3 className="text-sm font-semibold mod-text-primary leading-snug line-clamp-2">{p.objeto}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${dfd.bg} ${dfd.color} shrink-0`}>
          <DfdIcon size={12} />
          {dfd.label}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Building2 size={13} className="mod-text-secondary shrink-0" />
        <p className="text-xs mod-text-secondary truncate">{p.secretaria}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="mod-inner rounded-lg p-2.5">
          <p className="text-xs mod-text-secondary mb-0.5">Valor Estimado</p>
          <p className="mono-data text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.valor_estimado_cents)}</p>
        </div>
        <div className="mod-inner rounded-lg p-2.5">
          <p className="text-xs mod-text-secondary mb-0.5">Fase Atual</p>
          <span className={`inline-block text-xs font-semibold ${fase.color}`}>
            {p.fase_atual.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t mod-border">
        <div className="flex items-center gap-1.5 mod-text-secondary">
          <Calendar size={12} />
          <span className="mono-data">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <span className="mod-text-secondary">{p.responsavel}</span>
      </div>
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const ProcessoDetail: React.FC<{ p: ProcessoLicita; onClose: () => void }> = ({ p, onClose }) => {
  const dfd = dfdStatusConfig[p.dfd_status];
  const DfdIcon = dfd.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full mod-panel overflow-y-auto custom-scrollbar flex flex-col shadow-2xl">
        <div className="p-6 border-b mod-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="mono-data text-xs text-indigo-600 dark:text-indigo-400 font-bold">{p.numero}</span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${dfd.bg} ${dfd.color}`}>
                <DfdIcon size={10} />{dfd.label}
              </div>
            </div>
            <h2 className="text-base font-bold mod-text-primary">{p.objeto}</h2>
            <p className="text-xs mod-text-secondary mt-0.5">{p.secretaria} • {p.responsavel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 mod-text-secondary hover:mod-text-primary shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="mod-card p-3">
              <p className="text-xs mod-text-secondary mb-1">Modalidade Legal</p>
              <p className="text-sm font-semibold mod-text-primary">{modalidadeLabel[p.modalidade]}</p>
            </div>
            <div className="mod-card p-3">
              <p className="text-xs mod-text-secondary mb-1">Valor Estimado</p>
              <p className="mono-data text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.valor_estimado_cents)}</p>
            </div>
          </div>

          <div className="mod-card p-4 space-y-3">
            <h3 className="text-sm font-semibold mod-text-primary flex items-center gap-2">
              <FileText size={15} className="text-indigo-500" /> Artefatos da Fase Preparatória (Lei 14.133/2021)
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Documento de Formalização da Demanda (DFD)', status: p.dfd_status === 'aprovado' ? 'Concluído' : 'Em Elaboração', ok: p.dfd_status === 'aprovado' },
                { name: 'Estudo Técnico Preliminar (ETP)', status: ['etp', 'mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) ? 'Concluído' : 'Pendente', ok: ['etp', 'mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) },
                { name: 'Mapa de Gerenciamento de Riscos', status: ['mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) ? 'Concluído' : 'Pendente', ok: ['mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) },
                { name: 'Pesquisa Mercadológica e Cesta de Preços', status: ['pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) ? 'Concluído' : 'Pendente', ok: ['pesquisa_precos', 'tr', 'edital', 'concluido'].includes(p.fase_atual) },
                { name: 'Termo de Referência / Projeto Básico', status: ['tr', 'edital', 'concluido'].includes(p.fase_atual) ? 'Concluído' : 'Pendente', ok: ['tr', 'edital', 'concluido'].includes(p.fase_atual) },
              ].map((art) => (
                <div key={art.name} className="flex items-center justify-between p-2.5 rounded-lg mod-inner text-xs">
                  <span className="mod-text-primary font-medium">{art.name}</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${art.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {art.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t mod-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface ModuleLicitaProps {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const ModuleLicita: React.FC<ModuleLicitaProps> = ({ onAddToast = () => {} }) => {
  const [processos, setProcessos] = useState<ProcessoLicita[]>(PROCESSOS_MOCK);
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState<string>('all');
  const [filterModalidade, setFilterModalidade] = useState<string>('all');
  const [selected, setSelected] = useState<ProcessoLicita | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    numero: '',
    objeto: '',
    modalidade: 'pregao_eletronico' as ProcessoLicita['modalidade'],
    secretaria: '',
    valor: '',
    responsavel: '',
  });

  const filtered = useMemo(() => processos.filter(p => {
    const matchSearch = search === '' ||
      p.numero.toLowerCase().includes(search.toLowerCase()) ||
      p.objeto.toLowerCase().includes(search.toLowerCase()) ||
      p.secretaria.toLowerCase().includes(search.toLowerCase());
    const matchFase = filterFase === 'all' || p.fase_atual === filterFase;
    const matchModalidade = filterModalidade === 'all' || p.modalidade === filterModalidade;
    return matchSearch && matchFase && matchModalidade;
  }), [processos, search, filterFase, filterModalidade]);

  const kpis = useMemo(() => ({
    total: processos.length,
    aprovados: processos.filter(p => p.dfd_status === 'aprovado').length,
    totalEstimado: processos.reduce((a, p) => a + p.valor_estimado_cents, 0),
    emRevisao: processos.filter(p => p.dfd_status === 'em_revisao').length,
  }), [processos]);

  const handleCreate = () => {
    if (!form.objeto.trim() || !form.secretaria.trim()) {
      onAddToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Informe o objeto e a secretaria demandante.' });
      return;
    }
    const novo: ProcessoLicita = {
      id: `proc-${Date.now()}`,
      numero: form.numero.trim() || `PR-${new Date().getFullYear()}/${String(processos.length + 1).padStart(4, '0')}`,
      objeto: form.objeto.trim(),
      modalidade: form.modalidade,
      secretaria: form.secretaria.trim(),
      valor_estimado_cents: Math.round(Number(form.valor.replace(',', '.')) * 100) || 0,
      dfd_status: 'rascunho',
      fase_atual: 'dfd',
      created_at: new Date().toISOString().slice(0, 10),
      responsavel: form.responsavel.trim() || 'Comissão de Licitação',
    };
    setProcessos(prev => [novo, ...prev]);
    setCreateOpen(false);
    onAddToast({ type: 'success', title: 'Processo Aberto', message: `${novo.numero} registrado na fase de DFD.` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mod-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mod-text-primary flex items-center gap-2">
            <Gavel className="text-indigo-500" size={20} />
            Instrução Processual & Licitações (Lei 14.133/2021)
          </h1>
          <p className="text-sm mod-text-secondary mt-1">Elaboração de artefatos pré-editalícios: DFD, ETP, Mapa de Riscos e Termo de Referência.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="whitespace-nowrap" leftIcon={<Plus size={15} />}>
          Novo Processo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Processos', value: kpis.total, sub: `${kpis.aprovados} com DFD pronto`, icon: Gavel, color: 'text-indigo-500' },
          { label: 'Valor Global Estimado', value: fmt(kpis.totalEstimado), sub: 'planejamento anual', icon: CheckCircle2, color: 'text-emerald-500', mono: true },
          { label: 'DFDs em Revisão', value: kpis.emRevisao, sub: 'aguardando aprovação', icon: Clock, color: 'text-amber-500' },
          { label: 'Instruções Aprovadas', value: kpis.aprovados, sub: 'aptos para contratação', icon: FileText, color: 'text-sky-500' },
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
            placeholder="Buscar por número do processo, objeto ou secretaria..."
            className="mod-input w-full pl-9"
          />
        </div>
        <select value={filterFase} onChange={(e) => setFilterFase(e.target.value)} className="mod-input">
          <option value="all">Todas as Fases</option>
          <option value="dfd">DFD</option>
          <option value="etp">ETP</option>
          <option value="mapa_riscos">Mapa de Riscos</option>
          <option value="pesquisa_precos">Pesquisa de Preços</option>
          <option value="tr">Termo de Referência</option>
          <option value="edital">Edital</option>
        </select>
        <select value={filterModalidade} onChange={(e) => setFilterModalidade(e.target.value)} className="mod-input">
          <option value="all">Todas as Modalidades</option>
          <option value="pregao_eletronico">Pregão Eletrônico</option>
          <option value="dispensa">Dispensa</option>
          <option value="concorrencia">Concorrência</option>
          <option value="inexigibilidade">Inexigibilidade</option>
        </select>
      </div>

      {/* Process List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <ProcessoCard key={p.id} p={p} onClick={() => setSelected(p)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full mod-empty">
            <Gavel className="mx-auto mb-3 opacity-30" size={32} />
            <p className="font-semibold mod-text-primary">Nenhum processo licitatório encontrado</p>
            <p className="text-xs mod-text-secondary mt-1">Tente ajustar os termos da busca ou os filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Selected Drawer */}
      {selected && <ProcessoDetail p={selected} onClose={() => setSelected(null)} />}

      {/* Modal Criar Processo */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo Processo de Instrução (Lei 14.133/2021)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Abrir Processo</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mod-text-secondary">Número do Processo</label>
            <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: PR-2026/0001 (automático se vazio)" className="mod-input w-full mt-1 font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium mod-text-secondary">Objeto da Demanda *</label>
            <textarea rows={3} value={form.objeto} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} placeholder="Descrição sucinta da necessidade administrativa..." className="mod-input w-full mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mod-text-secondary">Modalidade Prevista</label>
              <select value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value as any }))} className="mod-input w-full mt-1">
                <option value="pregao_eletronico">Pregão Eletrônico</option>
                <option value="dispensa">Dispensa de Licitação</option>
                <option value="concorrencia">Concorrência</option>
                <option value="inexigibilidade">Inexigibilidade</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mod-text-secondary">Valor Estimado (R$)</label>
              <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" className="mod-input w-full mt-1 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mod-text-secondary">Secretaria Demandante *</label>
            <input value={form.secretaria} onChange={e => setForm(f => ({ ...f, secretaria: e.target.value }))} placeholder="Ex: Secretaria de Educação" className="mod-input w-full mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium mod-text-secondary">Responsável / Demandante</label>
            <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do servidor" className="mod-input w-full mt-1" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModuleLicita;
