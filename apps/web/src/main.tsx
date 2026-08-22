import { StrictMode, useEffect, useState } from 'react';
import { SysgovApi } from '@sysgov/sdk';
import { LoginPage } from './LoginPage';
import { MonitoringPage } from './MonitoringPage';
import { FinancePage } from './FinancePage';
import { ContractsPage } from './modules/contracts/ContractsPage';
import { TenantsPage } from './TenantsPage';
import { UsersPage } from './UsersPage';
import { ModulesPage } from './ModulesPage';
import { AuditPage } from './AuditPage';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Building2, CheckCircle2, ChevronDown,
  CircleDollarSign, ClipboardList, FileCheck2, FileText, Gauge, LayoutDashboard,
  Menu, MoreHorizontal, RefreshCw, Search, Settings2, ShieldCheck, Users, X
} from 'lucide-react';
import './styles.css';
import './navigation.css';

const sysgovApi = new SysgovApi(import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api');

type ModuleItem = { label: string; icon: typeof LayoutDashboard; shortcut?: string };

const navigation: { group: string; items: ModuleItem[] }[] = [
  { group: 'VISÃO GERAL', items: [{ label: 'Painel executivo', icon: LayoutDashboard, shortcut: 'P' }, { label: 'Monitoramento', icon: Activity, shortcut: 'M' }] },
  { group: 'ADMINISTRAÇÃO', items: [{ label: 'Tenants', icon: Building2, shortcut: 'T' }, { label: 'Usuários e papéis', icon: Users }, { label: 'Módulos', icon: Settings2 }] },
  { group: 'OPERAÇÃO', items: [{ label: 'Contratos', icon: FileCheck2, shortcut: 'C' }, { label: 'Financeiro', icon: CircleDollarSign }, { label: 'Auditoria', icon: ShieldCheck }] },
];

const stats = [
  { label: 'Receita recorrente', value: 'R$ 284.650', detail: '+12,8% no período', tone: 'green', icon: CircleDollarSign },
  { label: 'Tenants ativos', value: '48', detail: '+3 este mês', tone: 'blue', icon: Building2 },
  { label: 'Contratos vigentes', value: '126', detail: '94% em conformidade', tone: 'amber', icon: ClipboardList },
  { label: 'Disponibilidade', value: '99,98%', detail: 'Últimos 30 dias', tone: 'cyan', icon: Gauge },
];

const fallbackTenants = [
  { name: 'Prefeitura de Araucária', code: 'ARAUCÁRIA', module: 'Gestão Fiscal', status: 'Ativo', value: 'R$ 42.800' },
  { name: 'Prefeitura de São José', code: 'SÃO JOSÉ', module: 'Contratos', status: 'Ativo', value: 'R$ 31.500' },
  { name: 'Instituto Metropolitano', code: 'IMT-PR', module: 'Administração', status: 'Em avaliação', value: 'R$ 18.900' },
  { name: 'Prefeitura de Pinhais', code: 'PINHAIS', module: 'Gestão Fiscal', status: 'Ativo', value: 'R$ 27.300' },
];

function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem('sysgov_token')));
  const [active, setActive] = useState('Painel executivo');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [synced, setSynced] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [tenantRows, setTenantRows] = useState(fallbackTenants);
  const [tenantSearch, setTenantSearch] = useState('');
  const [revenueCents, setRevenueCents] = useState<number | null>(null);
  const filteredTenantRows = tenantRows.filter(tenant => `${tenant.name} ${tenant.code}`.toLowerCase().includes(tenantSearch.toLowerCase()));
  async function refreshTenants() {
    setSynced(false);
    try { const result = await sysgovApi.tenants(); setTenantRows(result.data.map(tenant => ({ name: tenant.name, code: tenant.slug.toUpperCase(), module: 'SYSGOV', status: tenant.status === 'active' ? 'Ativo' : tenant.status === 'trial' ? 'Em avaliação' : 'Suspenso', value: 'Não informado' }))); setApiOnline(true); }
    catch { setApiOnline(false); }
    finally { setSynced(true); }
  }
  async function logout() { await sysgovApi.logout().catch(() => undefined); setAuthenticated(false); }
  function exportTenants() {
    const csv = ['Cliente,Slug,Status', ...filteredTenantRows.map(tenant => [tenant.name, tenant.code, tenant.status].map(value => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'sysgov-tenants.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
  useEffect(() => {
    sysgovApi.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    if (authenticated) refreshTenants().catch(() => setTenantRows(fallbackTenants));
    if (authenticated) sysgovApi.financeSummary().then(summary => setRevenueCents(summary.revenues_cents)).catch(() => setRevenueCents(null));
  }, [authenticated]);
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const item = navigation.flatMap(section => section.items).find(entry => entry.shortcut?.toLowerCase() === event.key.toLowerCase());
      if (item) setActive(item.label);
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  if (!authenticated) return <LoginPage api={sysgovApi} onSuccess={() => setAuthenticated(true)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">S</div><div><strong>SYSGOV</strong><span>SYSTRAT PLATFORM</span></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
      <div className="tenant-switcher"><div className="tenant-avatar">SA</div><div><small>AMBIENTE</small><b>SYSTRAT Admin</b></div><ChevronDown size={15} /></div>
      <nav>{navigation.map(section => <div className="nav-group" key={section.group}><span className="nav-label">{section.group}</span>{section.items.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => { setActive(item.label); setSidebarOpen(false); }}><Icon size={17} strokeWidth={active === item.label ? 2.5 : 2} /><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>; })}</div>)}</nav>
      <div className="sidebar-footer"><div className={`status-dot ${apiOnline === false ? 'offline' : ''}`}><span />{apiOnline === true ? 'API conectada' : apiOnline === false ? 'Modo demonstração' : 'Verificando sistemas'}</div><div className="user-mini"><div className="user-avatar">MC</div><div><b>Marina Costa</b><small>Platform Admin</small></div><MoreHorizontal size={17} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="breadcrumbs"><span>SYSGOV</span><b>/</b><strong>{active}</strong></div><div className="top-actions"><label className="context-select"><span>Exercício</span><select defaultValue="2025"><option>2025</option><option>2024</option></select><ChevronDown size={14} /></label><label className="context-select city"><span>Contexto</span><select defaultValue="Todos os tenants"><option>Todos os tenants</option><option>Araucária</option></select><ChevronDown size={14} /></label><button className="icon-button" aria-label="Notificações"><Bell size={18} /><i /></button><button className="profile-avatar" onClick={logout} aria-label="Encerrar sessão">MC</button></div></header>
      <div className={`page-wrap ${active === 'Painel executivo' ? '' : 'module-active'}`}>
        {active === 'Monitoramento' && <MonitoringPage api={sysgovApi} />}
        {active === 'Financeiro' && <FinancePage api={sysgovApi} />}
        {active === 'Contratos' && <ContractsPage api={sysgovApi} />}
        {active === 'Tenants' && <TenantsPage api={sysgovApi} />}
        {active === 'Usuários e papéis' && <UsersPage api={sysgovApi} />}
        {active === 'Módulos' && <ModulesPage api={sysgovApi} />}
        {active === 'Auditoria' && <AuditPage api={sysgovApi} />}
          {active === 'Painel executivo' && <><div className="page-heading"><div><p className="eyebrow">SÁBADO, 22 DE AGOSTO DE 2026</p><h1>Bom dia, Marina <span>↗</span></h1><p className="subtitle">Aqui está o panorama operacional da sua plataforma.</p></div><div className="heading-actions"><button className={`button ghost ${synced ? 'synced' : ''}`} onClick={refreshTenants}><RefreshCw size={16} className={synced ? 'spin-once' : ''} />{synced ? 'Sincronizado' : 'Sincronizar'}</button><button className="button primary" onClick={exportTenants}><FileText size={16} />Exportar relatório</button></div></div></>}
        <section className="stats-grid">{stats.map(stat => { const Icon = stat.icon; const value = stat.label === 'Receita recorrente' && revenueCents !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(revenueCents / 100) : stat.value; return <article className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><Icon size={19} /></div><div className="stat-copy"><span>{stat.label}</span><strong className="numeric">{value}</strong><small className={stat.tone === 'amber' ? 'warning-text' : ''}>{stat.detail}</small></div><ArrowUpRight size={16} className="card-arrow" /></article>; })}</section>
        <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-heading"><div><span className="section-kicker">PERFORMANCE</span><h2>Receita recorrente mensal</h2></div><button className="select-button">Últimos 6 meses <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y"><span>300k</span><span>200k</span><span>100k</span><span>0</span></div><div className="chart"><div className="grid-line" /><div className="grid-line" /><div className="grid-line" /><svg viewBox="0 0 640 200" preserveAspectRatio="none" aria-label="Gráfico de receita crescente"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".20" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs><path d="M0,156 C45,148 60,140 100,145 S165,116 205,124 S270,98 310,108 S365,78 410,88 S480,54 520,63 S590,28 640,34 V200 H0Z" fill="url(#area)" /><path d="M0,156 C45,148 60,140 100,145 S165,116 205,124 S270,98 310,108 S365,78 410,88 S480,54 520,63 S590,28 640,34" fill="none" stroke="#10b981" strokeWidth="3" /></svg><div className="chart-labels"><span>MAR</span><span>ABR</span><span>MAI</span><span>JUN</span><span>JUL</span><span>AGO</span></div></div></div></article><article className="panel alerts-panel"><div className="panel-heading"><div><span className="section-kicker">ATENÇÃO NECESSÁRIA</span><h2>Alertas operacionais</h2></div><button className="text-button">Ver todos <ArrowUpRight size={14} /></button></div><div className="alert-list"><div className="alert-item critical"><div className="alert-icon"><AlertTriangle size={17} /></div><div><b>3 contratos vencem em 30 dias</b><span>Renovação necessária</span></div><ArrowUpRight size={15} /></div><div className="alert-item attention"><div className="alert-icon"><Bell size={17} /></div><div><b>Sincronização PNCP pendente</b><span>Última tentativa há 2h</span></div><ArrowUpRight size={15} /></div><div className="alert-item good"><div className="alert-icon"><CheckCircle2 size={17} /></div><div><b>Auditoria mensal concluída</b><span>Todos os registros íntegros</span></div><ArrowUpRight size={15} /></div></div></article></section>
        <section className="panel table-panel"><div className="panel-heading"><div><span className="section-kicker">BASE DE CLIENTES</span><h2>Tenants com maior movimentação</h2></div><div className="table-actions"><div className="search"><Search size={16} /><input value={tenantSearch} onChange={event => setTenantSearch(event.target.value)} placeholder="Buscar tenant" /></div><button className="icon-button subtle" aria-label="Mais opções" onClick={exportTenants}><MoreHorizontal size={18} /></button></div></div><div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>MÓDULO PRINCIPAL</th><th>STATUS</th><th>MRR</th><th /></tr></thead><tbody>{filteredTenantRows.map(tenant => <tr key={tenant.code}><td><div className="tenant-cell"><div className="table-avatar">{tenant.code.slice(0, 2)}</div><div><b>{tenant.name}</b><span>{tenant.code}</span></div></div></td><td><span className="module-tag">{tenant.module}</span></td><td><span className={`status ${tenant.status === 'Ativo' ? 'active-status' : 'review-status'}`}><i />{tenant.status}</span></td><td className="numeric amount">{tenant.value}</td><td><button className="row-arrow" aria-label={`Abrir ${tenant.name}`}><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  </div>;
}

StrictMode;
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
