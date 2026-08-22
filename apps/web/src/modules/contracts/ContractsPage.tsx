import { useEffect, useState } from 'react';
import { CalendarDays, FileCheck2, RefreshCw } from 'lucide-react';
import type { ApiContract, SysgovApi } from '@sysgov/sdk';
import '../../contracts-page.css';

export function ContractsPage({ api }: { api: SysgovApi }) {
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(false); try { setContracts((await api.contracts()).data); } catch { setError(true); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <section className="contracts-view" aria-labelledby="contracts-title"><div className="contracts-heading"><div><span className="section-kicker">MÓDULO CONTRACTS</span><h2 id="contracts-title">Contratos</h2><p className="subtitle">Vigências, valores e status do tenant selecionado.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'Consultando...' : 'Atualizar'}</button></div>{error ? <div className="contracts-error">Não foi possível carregar os contratos deste tenant.</div> : <div className="panel contracts-panel"><div className="contracts-panel-title"><FileCheck2 size={18} /><b>Contratos vigentes</b><span className="contracts-count numeric">{contracts.length}</span></div><div className="contracts-list">{contracts.map(contract => <div className="contract-row" key={contract.id}><div className="contract-number numeric">{contract.number}</div><div className="contract-title"><b>{contract.title}</b><span><CalendarDays size={12} />{contract.starts_at} até {contract.ends_at}</span></div><strong className="numeric">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contract.amount_cents / 100)}</strong><span className={`contract-status ${contract.status}`}>{contract.status}</span></div>)}</div>{!loading && contracts.length === 0 && <p className="contracts-empty">Nenhum contrato cadastrado para este tenant.</p>}</div>}</section>;
}
