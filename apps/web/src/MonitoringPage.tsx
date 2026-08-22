import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import type { MonitoringSummary, SysgovApi } from '@sysgov/sdk';
import './monitoring.css';

type MonitoringPageProps = { api: SysgovApi };

export function MonitoringPage({ api }: MonitoringPageProps) {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(false); try { setSummary(await api.monitoring()); } catch { setError(true); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const metrics = summary ? [['Tenants ativos', summary.counts.tenants_active], ['Usuários', summary.counts.users], ['Módulos habilitados', summary.counts.modules_enabled], ['Contratos ativos', summary.counts.contracts_active]] : [];
  return <section className="monitoring-view"><div className="monitoring-heading"><div><span className="section-kicker">CENTRO OPERACIONAL</span><h2>Monitoramento</h2><p className="subtitle">Saúde da plataforma e processamento assíncrono.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'Consultando...' : 'Atualizar'}</button></div>{error ? <div className="monitoring-error" role="alert"><AlertTriangle size={18} />Não foi possível consultar o monitoramento. Verifique a sessão e a API.</div> : <><div className="monitoring-grid">{metrics.map(([label, value]) => <article className="monitor-card" key={label}><span>{label}</span><strong className="numeric">{value}</strong><small><Activity size={12} />Última leitura disponível</small></article>)}</div><div className="monitoring-bottom"><article className="panel monitor-status"><div className="monitor-title"><Database size={18} /><div><b>Banco transacional</b><span>Conectividade e disponibilidade</span></div><strong className="healthy"><CheckCircle2 size={15} />{summary?.database.status === 'ok' ? 'Operacional' : 'Indisponível'}</strong></div></article><article className="panel outbox-status"><div className="panel-heading"><div><span className="section-kicker">OUTBOX</span><h2>Fila de eventos</h2></div></div><div className="outbox-list"><span>Pendentes <b className="numeric">{summary?.outbox.pending ?? '-'}</b></span><span>Processando <b className="numeric">{summary?.outbox.processing ?? '-'}</b></span><span>Com falha <b className="numeric failed">{summary?.outbox.failed ?? '-'}</b></span></div></article></div></>}</section>;
}
