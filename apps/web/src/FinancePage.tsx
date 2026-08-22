import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CircleDollarSign, RefreshCw } from 'lucide-react';
import type { FinanceSummary, SysgovApi } from '@sysgov/sdk';
import './finance.css';

type FinancePageProps = { api: SysgovApi };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FinancePage({ api }: FinancePageProps) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() { setLoading(true); setError(false); try { setSummary(await api.financeSummary()); } catch { setError(true); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const cards = summary ? [['Receitas', summary.revenues_cents, 'positive'], ['Despesas', summary.expenses_cents, 'negative'], ['Faturamento', summary.invoices_cents, 'positive'], ['Repasses', summary.transfers_cents, 'neutral']] as const : [];
  return <section className="finance-view"><div className="finance-heading"><div><span className="section-kicker">GESTÃO FINANCEIRA</span><h2>Financeiro</h2><p className="subtitle">Visão consolidada do tenant selecionado.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'Consultando...' : 'Atualizar'}</button></div>{error ? <div className="finance-error" role="alert"><AlertCircle size={18} />Não foi possível carregar o resumo financeiro. Selecione um tenant ativo e tente novamente.</div> : <><div className="finance-grid">{cards.map(([label, cents, tone]) => <article className="finance-card" key={label}><div className={`finance-card-icon ${tone}`}><CircleDollarSign size={18} /></div><span>{label}</span><strong className="numeric">{money.format(cents / 100)}</strong><small className={tone === 'negative' ? 'negative-text' : ''}>{tone === 'negative' ? <><ArrowDownRight size={12} /> Saídas acumuladas</> : <><ArrowUpRight size={12} /> Dados transacionais</>}</small></article>)}</div><div className="finance-reconciliation panel"><div><span className="section-kicker">CONCILIAÇÃO</span><h2>Pendências de conciliação</h2></div><strong className="numeric">{summary?.pending_reconciliations ?? 0}</strong><span>registros aguardando conferência</span></div></>}</section>;
}
