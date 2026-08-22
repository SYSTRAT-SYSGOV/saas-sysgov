import { useEffect, useState } from 'react';
import { Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import type { SysgovApi } from '@sysgov/sdk';
import './audit.css';

type AuditPageProps = { api: SysgovApi };
type AuditEntry = { id?: number; action?: string; module?: string; resource?: string; user_id?: number | null; tenant_id?: number | null; created_at?: string };

export function AuditPage({ api }: AuditPageProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() { setLoading(true); setError(false); try { setEntries((await api.auditLogs()).data as AuditEntry[]); } catch { setError(true); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <section className="audit-view" aria-labelledby="audit-title"><div className="audit-heading"><div><span className="section-kicker">GOVERNANÇA</span><h2 id="audit-title">Auditoria</h2><p className="subtitle">Trilha imutável das ações administrativas.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'Consultando...' : 'Atualizar'}</button></div>{error ? <div className="audit-error">Não foi possível carregar a trilha de auditoria.</div> : <div className="panel audit-panel"><div className="audit-panel-title"><ShieldCheck size={18} /><b>Eventos registrados</b><span className="numeric">{entries.length}</span></div><div className="audit-list">{entries.map(entry => <div className="audit-row" key={entry.id}><div className="audit-icon"><Clock3 size={15} /></div><div className="audit-main"><b>{entry.action ?? 'ação registrada'}</b><span>{entry.module ?? 'sistema'} · {entry.resource ?? 'recurso'}</span></div><span className="audit-actor">Usuário #{entry.user_id ?? 'sistema'}</span><span className="audit-tenant">Tenant #{entry.tenant_id ?? 'plataforma'}</span><time className="numeric">{entry.created_at ? new Date(entry.created_at).toLocaleString('pt-BR') : '-'}</time></div>)}</div>{!loading && entries.length === 0 && <p className="audit-empty">Nenhum evento registrado.</p>}</div>}</section>;
}
