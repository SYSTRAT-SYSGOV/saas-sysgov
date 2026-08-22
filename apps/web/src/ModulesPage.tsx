import { useEffect, useState } from 'react';
import { Check, Package, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ApiModule, ApiTenant, SysgovApi } from '@sysgov/sdk';
import './modules-page.css';

type ModulesPageProps = { api: SysgovApi };

export function ModulesPage({ api }: ModulesPageProps) {
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  async function load() { setLoading(true); try { const [moduleResult, tenantResult] = await Promise.all([api.modules(), api.tenants()]); setModules(moduleResult.data); setTenants(tenantResult.data); setSelectedTenant(current => current ?? tenantResult.data[0]?.id ?? null); setEnabled(Object.fromEntries(moduleResult.data.map(module => [module.id, module.enabled]))); } catch { setMessage('Não foi possível carregar o catálogo de módulos.'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function toggle(module: ApiModule) { if (!selectedTenant) return; const next = !enabled[module.id]; setEnabled(current => ({ ...current, [module.id]: next })); try { await api.toggleModule(selectedTenant, module.id, next); setMessage(`${module.name}: ${next ? 'ativado' : 'desativado'}.`); } catch { setEnabled(current => ({ ...current, [module.id]: !next })); setMessage('Não foi possível atualizar o módulo.'); } }
  return <section className="modules-view" aria-labelledby="modules-title"><div className="modules-heading"><div><span className="section-kicker">ADMINISTRAÇÃO</span><h2 id="modules-title">Módulos</h2><p className="subtitle">Controle de aplicações habilitadas por tenant.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />Atualizar</button></div><div className="module-context panel"><label className="field-label">Tenant<select value={selectedTenant ?? ''} onChange={event => setSelectedTenant(Number(event.target.value))}>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label></div>{message && <div className="module-message" role="status"><Check size={15} />{message}</div>}<div className="panel module-list">{modules.map(module => <div className="module-row" key={module.id}><div className="module-icon"><Package size={17} /></div><div className="module-copy"><b>{module.name}</b><span>{module.alias}</span></div><span className={`module-state ${enabled[module.id] ? 'on' : 'off'}`}>{enabled[module.id] ? 'Ativo' : 'Inativo'}</span><button className="module-toggle" onClick={() => toggle(module)} aria-label={`${enabled[module.id] ? 'Desativar' : 'Ativar'} ${module.name}`}>{enabled[module.id] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button></div>)}{!loading && modules.length === 0 && <p className="module-empty">Nenhum módulo cadastrado.</p>}</div></section>;
}
