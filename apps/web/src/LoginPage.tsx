import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import type { SysgovApi } from '@sysgov/sdk';

type LoginPageProps = { api: SysgovApi; onSuccess: () => void };

export function LoginPage({ api, onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try { await api.login(email, password, tenantSlug || undefined); onSuccess(); }
    catch { setError('Não foi possível iniciar a sessão. Verifique seus dados e o ambiente selecionado.'); }
    finally { setLoading(false); }
  }

  return <main className="login-shell"><div className="login-aside"><div className="brand login-brand"><div className="brand-mark">S</div><div><strong>SYSGOV</strong><span>SYSTRAT PLATFORM</span></div></div><div className="login-statement"><span className="section-kicker">CENTRO DE OPERAÇÕES</span><h1>Decisões públicas com mais clareza.</h1><p>Um ambiente seguro para acompanhar clientes, contratos e resultados da sua plataforma.</p></div><div className="login-aside-foot"><ShieldCheck size={16} /> Ambiente protegido por controle de acesso e auditoria.</div></div><section className="login-card"><div className="login-card-head"><span className="login-overline">ACESSO ADMINISTRATIVO</span><h2>Bem-vinda de volta</h2><p>Entre com suas credenciais para continuar no SYSGOV.</p></div><form onSubmit={submit}><label className="field-label">E-mail institucional<div className="field-wrap"><Mail size={16} /><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nome@systrat.com.br" /></div></label><label className="field-label">Senha<div className="field-wrap"><LockKeyhole size={16} /><input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha" /></div></label><label className="field-label">Ambiente <span className="optional">opcional</span><div className="field-wrap"><input className="no-icon-input" value={tenantSlug} onChange={event => setTenantSlug(event.target.value)} placeholder="slug do tenant" /></div></label>{error && <div className="login-error" role="alert">{error}</div>}<button className="login-submit" disabled={loading}>{loading ? 'Autenticando...' : 'Entrar no painel'}<ArrowRight size={17} /></button></form><p className="login-security">Acesso monitorado. Todas as ações administrativas são registradas.</p></section></main>;
}
