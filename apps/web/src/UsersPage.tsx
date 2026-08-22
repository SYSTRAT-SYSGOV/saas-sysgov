import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import type { ApiRole, ApiUser, SysgovApi } from '@sysgov/sdk';
import './users.css';

type UsersPageProps = { api: SysgovApi };
type UserWithTenants = ApiUser & { tenants: Array<{ id: number; name: string; slug: string }> };

export function UsersPage({ api }: UsersPageProps) {
  const [users, setUsers] = useState<UserWithTenants[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() { setLoading(true); setError(false); try { const [userResult, roleResult] = await Promise.all([api.users(), api.roles()]); setUsers(userResult.data); setRoles(roleResult.data); } catch { setError(true); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <section className="users-view" aria-labelledby="users-title"><div className="users-heading"><div><span className="section-kicker">ADMINISTRAÇÃO</span><h2 id="users-title">Usuários e papéis</h2><p className="subtitle">Identidades, acessos e responsabilidades por tenant.</p></div><button className="button ghost" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'Consultando...' : 'Atualizar'}</button></div>{error ? <div className="users-error">Não foi possível carregar usuários e papéis.</div> : <div className="users-columns"><div className="panel user-list"><div className="users-list-title"><b>Usuários cadastrados</b><span className="numeric">{users.length}</span></div>{users.map(user => <div className="user-row" key={user.id}><div className="user-row-icon"><UserRound size={16} /></div><div className="user-row-copy"><b>{user.name}</b><span>{user.email}</span></div>{user.is_platform_admin && <span className="admin-tag"><ShieldCheck size={12} />Platform admin</span>}<span className="user-tenant-count numeric">{user.tenants.length} tenant{user.tenants.length === 1 ? '' : 's'}</span></div>)}{!loading && users.length === 0 && <p className="users-empty">Nenhum usuário cadastrado.</p>}</div><div className="panel role-list"><div className="users-list-title"><b>Roles disponíveis</b><span className="numeric">{roles.length}</span></div>{roles.map(role => <div className="role-row" key={role.id}><div><b>{role.name}</b><span>{role.tenant_id ? 'Role específica do tenant' : 'Role da plataforma'}</span></div><span className="permission-count numeric">{role.permissions.length} permissões</span></div>)}{!loading && roles.length === 0 && <p className="users-empty">Nenhuma role cadastrada.</p>}</div></div>}</section>;
}
