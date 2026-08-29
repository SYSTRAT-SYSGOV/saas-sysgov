import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Power, RotateCcw, KeyRound, Users, Loader2, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { adminApi } from './api';
import { User, Role } from './types';
import { useAuthContext } from '../../contexts/AuthContext';

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuthContext();
  const isSelf = (user: User) => String(user.id) === String(currentUser?.id ?? '');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [reason, setReason] = useState('');

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: search || undefined,
        status: status || undefined,
        page,
      });
      setUsers(res.data);
      setMeta(res.meta ?? { current_page: page, last_page: 1, total: 0 });
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      alert(error.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    loadUsers();
    adminApi.getRoles({ scope: 'systrat' }).then((r) => setRoles(r.data ?? [])).catch(() => undefined);
  }, [loadUsers]);

  const handleDeactivate = async (user: User) => {
    if (!reason.trim() || reason.trim().length < 10) {
      alert('Informe o motivo da desativação (mínimo 10 caracteres).');
      return;
    }
    try {
      await adminApi.deactivateUser(user.id, reason.trim());
      setDeactivating(null);
      setReason('');
      loadUsers(meta.current_page);
    } catch (error: any) {
      alert(error.message || 'Erro ao desativar usuário.');
    }
  };

  const handleReactivate = async (user: User) => {
    try {
      await adminApi.reactivateUser(user.id);
      loadUsers(meta.current_page);
    } catch (error: any) {
      alert(error.message || 'Erro ao reativar usuário.');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`Enviar e-mail de redefinição de senha para ${user.email}?`)) return;
    try {
      await adminApi.requestPasswordReset(user.id);
      alert(`E-mail de redefinição de senha enviado para ${user.email}.`);
    } catch (error: any) {
      alert(error.message || 'Erro ao solicitar redefinição.');
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (editingUser) {
        const payload: any = {
          name: data.name,
          email: data.email,
          role_slug: data.role_slug,
          is_active: data.is_active,
        };
        // Só envia a senha quando informada (edição sem troca de senha mantém a atual)
        if (data.password) {
          payload.password = data.password;
          payload.password_confirmation = data.password_confirmation;
        }
        await adminApi.updateUser(editingUser.id, payload);
      } else {
        await adminApi.createUser({
          name: data.name,
          email: data.email,
          password: data.password,
          password_confirmation: data.password_confirmation,
          role_slug: data.role_slug,
        });
      }
      setModalOpen(false);
      setEditingUser(null);
      loadUsers(meta.current_page);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar usuário.');
    }
  };

  const roleNames = (user: User) =>
    (user.roles ?? []).map((r) => r.name).join(', ') || '—';

  const statusBadge = (user: User) => {
    if (!user.is_active) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">INATIVO</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">ATIVO</span>;
  };

  const mfaBadge = (user: User) =>
    user.mfa_enabled ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <ShieldCheck className="w-3 h-3" /> MFA
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
        <ShieldAlert className="w-3 h-3" /> Sem MFA
      </span>
    );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Usuários SYSTRAT
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Equipe da plataforma: super_admin, admin_ops e suporte.
          </p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      <div className="mod-card p-4 border-b mod-border">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 mod-text-secondary" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); loadUsers(1); }}
              className="mod-input w-full pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); loadUsers(1); }}
            className="mod-input md:w-48"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      <div className="mod-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b mod-border text-left text-xs uppercase tracking-wider mod-text-secondary">
                <th className="py-3 px-4 font-semibold">Nome</th>
                <th className="py-3 px-4 font-semibold">E-mail</th>
                <th className="py-3 px-4 font-semibold">Roles</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">MFA</th>
                <th className="py-3 px-4 font-semibold">Criado em</th>
                <th className="py-3 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center mod-text-secondary">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{user.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{user.email}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{roleNames(user)}</td>
                    <td className="py-3 px-4">{statusBadge(user)}</td>
                    <td className="py-3 px-4">{mfaBadge(user)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditingUser(user); setModalOpen(true); }} title="Editar" className="p-2 mod-text-secondary hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleResetPassword(user)} title="Reset de senha" className="p-2 mod-text-secondary hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-lg transition-colors">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {user.is_active ? (
                          isSelf(user) ? (
                            <span title="Você não pode desativar a própria conta" className="p-2 mod-text-secondary opacity-40 cursor-not-allowed inline-flex">
                              <Power className="w-4 h-4" />
                            </span>
                          ) : (
                            <button onClick={() => { setDeactivating(user); setReason(''); }} title="Desativar" className="p-2 mod-text-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors">
                              <Power className="w-4 h-4" />
                            </button>
                          )
                        ) : (
                          <button onClick={() => handleReactivate(user)} title="Reativar" className="p-2 mod-text-secondary hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="px-4 py-3 border-t mod-border flex items-center justify-between text-sm mod-text-secondary">
            <span>Página {meta.current_page} de {meta.last_page} — {meta.total} usuários</span>
            <div className="flex items-center gap-2">
              <button onClick={() => loadUsers(meta.current_page - 1)} disabled={meta.current_page === 1} className="px-3 py-1.5 border mod-border rounded-lg hover:mod-inner disabled:opacity-50 text-xs">
                Anterior
              </button>
              <button onClick={() => loadUsers(meta.current_page + 1)} disabled={meta.current_page === meta.last_page} className="px-3 py-1.5 border mod-border rounded-lg hover:mod-inner disabled:opacity-50 text-xs">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onClose={() => { setModalOpen(false); setEditingUser(null); }}
          onSave={handleSave}
        />
      )}

      {deactivating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="mod-card w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b mod-border">
              <h3 className="text-sm font-bold mod-text-primary">Desativar Usuário</h3>
              <button onClick={() => setDeactivating(null)} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs mod-text-secondary">
                Desativar <strong className="font-mono">{deactivating.email}</strong>? O motivo é obrigatório e será registrado na auditoria (RN-USR-007).
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Motivo da desativação (mín. 10 caracteres)..."
                className="mod-input w-full"
              />
              <div className="flex justify-end gap-3 pt-4 border-t mod-border">
                <button type="button" onClick={() => setDeactivating(null)} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border mod-border rounded-lg hover:mod-inner">
                  Cancelar
                </button>
                <button onClick={() => handleDeactivate(deactivating)} className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg">
                  Desativar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserFormModal: React.FC<{
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ user, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_slug: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role_slug: user.roles?.[0]?.slug ?? '',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="mod-card w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b mod-border">
          <h2 className="text-sm font-bold mod-text-primary">{user ? 'Editar Usuário' : 'Novo Usuário SYSTRAT'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">Nome *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mod-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">E-mail *</label>
            <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mod-input w-full font-mono" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mod-text-secondary mb-1">{user ? 'Nova senha' : 'Senha *'}</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!user} minLength={8} className="mod-input w-full" />
              <p className="text-[10px] mod-text-secondary mt-1">Mín. 8 chars, maiúscula, minúscula, número e símbolo.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mod-text-secondary mb-1">Confirmar senha</label>
              <input type="password" value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} required={!user} className="mod-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">Role *</label>
            <select required value={formData.role_slug} onChange={(e) => setFormData({ ...formData, role_slug: e.target.value })} className="mod-input w-full">
              <option value="">— Selecione a role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mod-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border mod-border rounded-lg hover:mod-inner">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Salvando...' : (user ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
