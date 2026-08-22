import { FormEvent, useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, X } from 'lucide-react';
import type { ApiTenant, CreateTenantInput, SysgovApi } from '@sysgov/sdk';
import './tenants.css';

type TenantsPageProps = { api: SysgovApi };
const emptyForm: CreateTenantInput = { name: '', slug: '', type: 'prefeitura', status: 'trial' };

export function TenantsPage({ api }: TenantsPageProps) {
  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [form, setForm] = useState<CreateTenantInput>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function load() { setLoading(true); try { setTenants((await api.tenants()).data); } catch { setMessage('Não foi possível carregar os tenants.'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setMessage(''); try { const tenant = await api.createTenant(form); setTenants(current => [tenant, ...current]); setForm(emptyForm); setFormOpen(false); setMessage('Tenant criado com sucesso.'); } catch { setMessage('Não foi possível criar o tenant. Verifique os dados informados.'); } finally { setSaving(false); } }
  return <section className="tenants-view" aria-labelledby="tenants-title"><div className="tenants-heading"><div><span className="section-kicker">ADMINISTRAÇÃO</span><h2 id="tenants-title">Tenants</h2><p className="subtitle">Clientes, prefeituras e ambientes da plataforma.</p></div><div className="tenant-actions"><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />Atualizar</button><button className="button primary" onClick={() => setFormOpen(true)}><Plus size={16} />Novo tenant</button></div></div>{message && <div className="tenant-message" role="status">{message}</div>}{formOpen && <form className="tenant-form panel" onSubmit={submit}><div className="tenant-form-heading"><b>Novo tenant</b><button type="button" className="icon-button" aria-label="Fechar formulário" onClick={() => setFormOpen(false)}><X size={17} /></button></div><div className="tenant-form-grid"><label className="field-label">Nome<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label className="field-label">Slug<input required pattern="[A-Za-z0-9_-]+" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} /></label><label className="field-label">Tipo<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as CreateTenantInput['type'] })}><option value="prefeitura">Prefeitura</option><option value="parceiro">Parceiro</option><option value="interno">Interno</option></select></label></div><div className="tenant-form-footer"><button type="button" className="button ghost" onClick={() => setFormOpen(false)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Criando...' : 'Criar tenant'}</button></div></form>}<div className="panel tenant-list"><div className="tenant-list-header"><b>Base cadastrada</b><span className="numeric">{tenants.length} registros</span></div>{!loading && tenants.length === 0 && <p className="tenant-empty">Nenhum tenant cadastrado.</p>}{tenants.map(tenant => <div className="tenant-list-row" key={tenant.id}><div className="tenant-list-icon"><Building2 size={17} /></div><div className="tenant-list-name"><b>{tenant.name}</b><span>{tenant.slug}</span></div><span className={`status ${tenant.status === 'active' ? 'active-status' : 'review-status'}`}><i />{tenant.status === 'active' ? 'Ativo' : tenant.status === 'trial' ? 'Em avaliação' : 'Suspenso'}</span><span className="tenant-type">{tenant.type}</span></div>)}</div></section>;
}
