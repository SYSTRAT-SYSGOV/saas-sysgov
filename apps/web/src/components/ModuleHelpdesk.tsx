import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TicketIcon, Plus, Search, AlertTriangle, CheckCircle2, Clock, Circle,
  MessageSquare, ChevronRight, X, Send, Lock, User, Tag, Zap, Filter,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = 'aberto' | 'em_analise' | 'aguardando_cliente' | 'resolvido' | 'fechado';
type TicketPriority = 'critica' | 'alta' | 'media' | 'baixa';

interface TicketMessage {
  id: string;
  body: string;
  author: string;
  is_internal: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  module: string;
  requester: string;
  assignee?: string;
  sla_deadline: string;
  created_at: string;
  messages: TicketMessage[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TICKETS_MOCK: Ticket[] = [
  {
    id: '1', ticket_number: 'SUP-2026-0089', title: 'Relatório LRF não exporta PDF corretamente', status: 'em_analise', priority: 'alta', module: 'LRF/Limites', requester: 'Ana Lima', assignee: 'Suporte N2', sla_deadline: new Date(Date.now() + 3 * 3600000).toISOString(), created_at: new Date(Date.now() - 5 * 3600000).toISOString(), description: 'Ao clicar em Exportar PDF no módulo de LRF, o arquivo gerado vem em branco. Acontece desde ontem após a atualização do sistema.',
    messages: [
      { id: 'm1', body: 'Ao clicar em Exportar PDF no módulo de LRF, o arquivo gerado vem em branco. Acontece desde ontem após a atualização do sistema.', author: 'Ana Lima', is_internal: false, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
      { id: 'm2', body: '⚙️ [INTERNO] Reproduzido localmente. Parece ser regressão na conversão wkhtmltopdf após update do Laravel 12.x. Verificando.', author: 'Suporte N2', is_internal: true, created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
      { id: 'm3', body: 'Olá Ana! Identificamos o problema e já estamos trabalhando na correção. Estimativa: 4 horas.', author: 'Suporte N2', is_internal: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    ]
  },
  {
    id: '2', ticket_number: 'SUP-2026-0085', title: 'Erro de acesso — usuário sem permissão de FUNDEB', status: 'aberto', priority: 'media', module: 'FUNDEB/SIOPE', requester: 'Carlos Oliveira', assignee: undefined, sla_deadline: new Date(Date.now() + 20 * 3600000).toISOString(), created_at: new Date(Date.now() - 1 * 3600000).toISOString(), description: 'O usuário secretaria@araucaria.pr.gov.br não consegue acessar o módulo FUNDEB mesmo com permissão de "Secretário de Educação" configurada.',
    messages: [
      { id: 'm1', body: 'O usuário secretaria@araucaria.pr.gov.br não consegue acessar o módulo FUNDEB mesmo com permissão de "Secretário de Educação" configurada.', author: 'Carlos Oliveira', is_internal: false, created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
    ]
  },
  {
    id: '3', ticket_number: 'SUP-2026-0078', title: 'Dúvida: como cadastrar novo aditivo de contrato?', status: 'aguardando_cliente', priority: 'baixa', module: 'Contratos', requester: 'Maria Santos', assignee: 'Suporte N1', sla_deadline: new Date(Date.now() + 40 * 3600000).toISOString(), created_at: new Date(Date.now() - 24 * 3600000).toISOString(), description: 'Preciso cadastrar um novo aditivo no contrato CT-2026/0045. Como faço isso no sistema?',
    messages: [
      { id: 'm1', body: 'Preciso cadastrar um novo aditivo no contrato CT-2026/0045. Como faço isso no sistema?', author: 'Maria Santos', is_internal: false, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
      { id: 'm2', body: 'Olá Maria! Para cadastrar um aditivo: 1) Acesse Contratos → CT-2026/0045 → 2) Aba "Aditivos" → 3) "Novo Aditivo". Pode realizar essa operação?', author: 'Suporte N1', is_internal: false, created_at: new Date(Date.now() - 22 * 3600000).toISOString() },
    ]
  },
  {
    id: '4', ticket_number: 'SUP-2026-0071', title: 'SICONFI: erro 503 na sincronização automática', status: 'resolvido', priority: 'critica', module: 'SICONFI', requester: 'Roberto Alves', assignee: 'Suporte N3', sla_deadline: new Date(Date.now() + 1 * 3600000).toISOString(), created_at: new Date(Date.now() - 48 * 3600000).toISOString(), description: 'A sincronização automática com o SICONFI está falhando com erro 503. Afetando o envio do RREO.',
    messages: [
      { id: 'm1', body: 'A sincronização automática com o SICONFI está falhando com erro 503. Afetando o envio do RREO.', author: 'Roberto Alves', is_internal: false, created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'm2', body: '⚙️ [INTERNO] API do SICONFI fora do ar — confirmado com STN. Aguardando retorno do servidor.', author: 'Suporte N3', is_internal: true, created_at: new Date(Date.now() - 46 * 3600000).toISOString() },
      { id: 'm3', body: 'Roberto, o problema foi com a API do SICONFI/STN que ficou instável. Já retornou. A sincronização está funcionando normalmente. ✅', author: 'Suporte N3', is_internal: false, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
    ]
  },
  {
    id: '5', ticket_number: 'SUP-2026-0068', title: 'Solicitar novo usuário: controle externo', status: 'fechado', priority: 'baixa', module: 'Admin', requester: 'Fernanda Costa', assignee: 'Suporte N1', sla_deadline: new Date(Date.now() - 20 * 3600000).toISOString(), created_at: new Date(Date.now() - 72 * 3600000).toISOString(), description: 'Precisamos criar acesso de visualização para o TCE-PR.',
    messages: [
      { id: 'm1', body: 'Precisamos criar acesso de visualização para o TCE-PR.', author: 'Fernanda Costa', is_internal: false, created_at: new Date(Date.now() - 72 * 3600000).toISOString() },
      { id: 'm2', body: 'Usuário criado e e-mail de acesso enviado para o TCE-PR. Caso precise de ajustes, é só abrir novo chamado! ✅', author: 'Suporte N1', is_internal: false, created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
    ]
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<TicketStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  aberto: { label: 'Aberto', icon: Circle, color: 'text-indigo-400', bg: 'bg-indigo-950/60 border-indigo-700/50' },
  em_analise: { label: 'Em Análise', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-700/50' },
  aguardando_cliente: { label: 'Aguard. Cliente', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-700/50' },
  resolvido: { label: 'Resolvido', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-700/50' },
  fechado: { label: 'Fechado', icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700' },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  critica: { label: '🔴 Crítica', color: 'text-rose-400', dot: 'bg-rose-500' },
  alta: { label: '🟠 Alta', color: 'text-orange-400', dot: 'bg-orange-500' },
  media: { label: '🟡 Média', color: 'text-amber-400', dot: 'bg-amber-500' },
  baixa: { label: '🟢 Baixa', color: 'text-emerald-400', dot: 'bg-emerald-500' },
};

const slaStatus = (deadline: string, status: TicketStatus) => {
  if (status === 'resolvido' || status === 'fechado') return null;
  const mins = Math.round((new Date(deadline).getTime() - Date.now()) / 60000);
  if (mins < 0) return { label: `SLA vencido há ${Math.abs(mins)}min`, color: 'text-rose-400 animate-pulse' };
  if (mins < 60) return { label: `${mins}min restantes`, color: 'text-rose-400' };
  if (mins < 240) return { label: `${Math.round(mins / 60)}h restantes`, color: 'text-amber-400' };
  return { label: `${Math.round(mins / 60)}h restantes`, color: 'text-slate-400' };
};

const relTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  if (mins < 1440) return `${Math.round(mins / 60)}h atrás`;
  return `${Math.round(mins / 1440)}d atrás`;
};

// ─── Chat Panel ───────────────────────────────────────────────────────────────

const TicketChat: React.FC<{ ticket: Ticket; onClose: () => void }> = ({ ticket, onClose }) => {
  const [messages, setMessages] = useState<TicketMessage[]>(ticket.messages);
  const [newMsg, setNewMsg] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stCfg = statusConfig[ticket.status];
  const prCfg = priorityConfig[ticket.priority];
  const sla = slaStatus(ticket.sla_deadline, ticket.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMsg.trim()) return;
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`,
      body: newMsg.trim(),
      author: 'Suporte N1',
      is_internal: isInternal,
      created_at: new Date().toISOString(),
    }]);
    setNewMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm">
      <div className="flex-1 flex flex-col max-w-3xl ml-auto h-full bg-[#101a3a] border-l border-[#1a2a52]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#1a2a52] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-indigo-400">{ticket.ticket_number}</span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${stCfg.bg} ${stCfg.color}`}>
                <stCfg.icon size={10} />{stCfg.label}
              </div>
              <span className={`text-xs font-semibold ${prCfg.color}`}>{prCfg.label}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-100 line-clamp-1">{ticket.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><User size={11} />{ticket.requester}</span>
              <span className="flex items-center gap-1"><Tag size={11} />{ticket.module}</span>
              {sla && <span className={`font-mono tabular-nums ${sla.color}`}><Clock className="inline mr-1" size={10} />{sla.label}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.is_internal ? 'opacity-75' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.is_internal ? 'bg-amber-900/50 text-amber-300 border border-amber-700/40' : msg.author === ticket.requester ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/40' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'}`}>
                {msg.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-300">{msg.author}</span>
                  {msg.is_internal && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-950/40 border border-amber-700/30 px-1.5 py-0.5 rounded">
                      <Lock size={9} /> Interno
                    </span>
                  )}
                  <span className="text-xs text-slate-600 font-mono tabular-nums">{relTime(msg.created_at)}</span>
                </div>
                <div className={`text-sm text-slate-300 leading-relaxed bg-[#152244] border rounded-xl p-3 ${msg.is_internal ? 'border-amber-700/30' : 'border-[#1a2a52]'}`}>
                  {msg.body}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {ticket.status !== 'fechado' && (
          <div className="border-t border-[#1a2a52] p-4 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsInternal(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!isInternal ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                <MessageSquare size={12} /> Resposta Pública
              </button>
              <button
                onClick={() => setIsInternal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isInternal ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                <Lock size={12} /> Nota Interna
              </button>
            </div>
            <div className="flex gap-2">
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && sendMessage()}
                placeholder={isInternal ? 'Nota interna (visível apenas para suporte)...' : 'Escreva sua resposta... (Ctrl+Enter para enviar)'}
                className={`flex-1 px-3 py-2.5 bg-[#152244] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none h-20 border ${isInternal ? 'border-amber-700/40 focus:border-amber-600/60' : 'border-[#1a2a52] focus:border-indigo-500/60'}`}
              />
              <button
                onClick={sendMessage}
                disabled={!newMsg.trim()}
                className="flex items-center justify-center w-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Ticket Row ───────────────────────────────────────────────────────────────

const TicketRow: React.FC<{ t: Ticket; onClick: () => void }> = ({ t, onClick }) => {
  const stCfg = statusConfig[t.status];
  const prCfg = priorityConfig[t.priority];
  const sla = slaStatus(t.sla_deadline, t.status);
  const isOpen = t.status !== 'resolvido' && t.status !== 'fechado';

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 p-4 bg-[#152244] border border-[#1a2a52] rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-[#1a2a52] transition-all duration-200"
    >
      {/* Priority dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${prCfg.dot} ${isOpen && t.priority === 'critica' ? 'animate-pulse' : ''}`} />

      {/* Main */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs text-indigo-400">{t.ticket_number}</span>
            <span className="text-xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">{t.module}</span>
          </div>
          <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span>{t.requester}</span>
            <span className="font-mono tabular-nums">{relTime(t.created_at)}</span>
            {t.assignee && <span>→ {t.assignee}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {sla && <span className={`font-mono text-xs tabular-nums ${sla.color}`}>{sla.label}</span>}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${stCfg.bg} ${stCfg.color}`}>
            <stCfg.icon size={10} />{stCfg.label}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MessageSquare size={12} />{t.messages.length}
          </div>
        </div>
      </div>

      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ModuleHelpdesk: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const kpis = useMemo(() => ({
    abertos: TICKETS_MOCK.filter(t => t.status === 'aberto').length,
    emAnalise: TICKETS_MOCK.filter(t => t.status === 'em_analise').length,
    criticos: TICKETS_MOCK.filter(t => t.priority === 'critica' && !['resolvido', 'fechado'].includes(t.status)).length,
    resolvidos: TICKETS_MOCK.filter(t => t.status === 'resolvido' || t.status === 'fechado').length,
  }), []);

  const filtered = useMemo(() => TICKETS_MOCK.filter(t => {
    const matchSearch = search === '' ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.requester.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  }), [search, filterStatus, filterPriority]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Abertos', value: kpis.abertos, color: 'text-indigo-400', icon: Circle, sub: 'aguardando ação' },
          { label: 'Em Análise', value: kpis.emAnalise, color: 'text-amber-400', icon: Zap, sub: 'sendo atendidos' },
          { label: 'SLA Crítico', value: kpis.criticos, color: 'text-rose-400', icon: AlertTriangle, sub: 'prioridade máxima' },
          { label: 'Resolvidos', value: kpis.resolvidos, color: 'text-emerald-400', icon: CheckCircle2, sub: 'nos últimos 7 dias' },
        ].map((k) => (
          <div key={k.label} className="bg-[#152244] border border-[#1a2a52] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className={`text-2xl font-bold font-mono tabular-nums ${k.color}`}>{k.value}</p>
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
            placeholder="Buscar chamado, título ou solicitante..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">Todos os Status</option>
          <option value="aberto">Aberto</option>
          <option value="em_analise">Em Análise</option>
          <option value="aguardando_cliente">Aguard. Cliente</option>
          <option value="resolvido">Resolvido</option>
          <option value="fechado">Fechado</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2.5 bg-[#152244] border border-[#1a2a52] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">Todas as Prioridades</option>
          <option value="critica">🔴 Crítica</option>
          <option value="alta">🟠 Alta</option>
          <option value="media">🟡 Média</option>
          <option value="baixa">🟢 Baixa</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Abrir Chamado
        </button>
      </div>

      {/* Ticket List */}
      <div className="space-y-2">
        {filtered.map((t) => (
          <TicketRow key={t.id} t={t} onClick={() => setSelected(t)} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 bg-[#152244] border border-[#1a2a52] rounded-xl">
            <TicketIcon className="mx-auto mb-3 opacity-40" size={32} />
            <p>Nenhum chamado encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {selected && <TicketChat ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ModuleHelpdesk;
