import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  X,
  Loader2,
  ShieldCheck,
  Landmark,
  Pencil,
  KeyRound,
  Check,
  LayoutDashboard,
  Grid2x2,
} from 'lucide-react';
import { accessApi, AccessDashboardData, AccessUser, AccessModule, ModuleAccessItem, OrgUnitNode } from './AccessApi';
import { AdminAccessPanel, NewUserWizard } from './evolution';

const DASHBOARD_CACHE_KEY = 'sysgov:access:dashboard:v1';

// Aplica os dados do dashboard no estado (renderização imediata)
function applyDashboardData(
  d: AccessDashboardData,
  setters: { setUsers: (v: AccessUser[]) => void; setModules: (v: AccessModule[]) => void; setUnits: (v: OrgUnitNode[]) => void; setIsGlobalAdmin: (v: boolean) => void; setMyManagedModules: (v: string[]) => void }
) {
  setters.setIsGlobalAdmin(d.summary.is_global_admin);
  const managed = d.summary.modules.filter((m) => m.can_manage_users && m.module !== '*').map((m) => m.module);
  setters.setMyManagedModules(managed);
  setters.setModules(d.summary.is_global_admin ? d.modules : d.modules.filter((m) => managed.includes(m.alias)));
  setters.setUnits(d.org_units);
  setters.setUsers(d.users);
}

interface Toast {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  accesses: ModuleAccessItem[];
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', password_confirmation: '', accesses: [] };

// Achata a árvore de unidades em uma lista com indentação
function flattenUnits(nodes: OrgUnitNode[], depth = 0): { node: OrgUnitNode; depth: number }[] {
  const out: { node: OrgUnitNode; depth: number }[] = [];
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    if (n.children?.length) out.push(...flattenUnits(n.children, depth + 1));
  });
  return out;
}

export const AccessManagement: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [modules, setModules] = useState<AccessModule[]>([]);
  const [units, setUnits] = useState<OrgUnitNode[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(true);
  const [myManagedModules, setMyManagedModules] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccessUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewMode, setViewMode] = useState<'lista' | 'painel'>('lista');
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = useCallback(async () => {
    const setters = { setUsers, setModules, setUnits, setIsGlobalAdmin, setMyManagedModules };

    // Renderização imediata com dados cacheados (evita o spinner a cada visita)
    const cachedRaw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (cachedRaw) {
      try {
        applyDashboardData(JSON.parse(cachedRaw) as AccessDashboardData, setters);
      } catch {
        sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
      }
    } else {
      setLoading(true);
    }

    try {
      const d = await accessApi.dashboard();
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(d));
      applyDashboardData(d, setters);
    } catch (error: any) {
      console.error('Erro ao carregar acessos:', error);
      notify({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar os acessos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flatUnits = flattenUnits(units);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleModule = (alias: string, enabled: boolean) => {
    setForm((prev) => {
      if (enabled) {
        const exists = prev.accesses.some((a) => a.module === alias);
        return {
          ...prev,
          accesses: exists ? prev.accesses : [...prev.accesses, { module: alias, role: 'member', all_org_units: true, org_unit_ids: [], can_manage_users: false }],
        };
      }
      return { ...prev, accesses: prev.accesses.filter((a) => a.module !== alias) };
    });
  };

  const updateAccess = (alias: string, patch: Partial<ModuleAccessItem>) => {
    setForm((prev) => ({
      ...prev,
      accesses: prev.accesses.map((a) => (a.module === alias ? { ...a, ...patch } : a)),
    }));
  };

  const toggleUnit = (alias: string, unitId: number) => {
    setForm((prev) => ({
      ...prev,
      accesses: prev.accesses.map((a) => {
        if (a.module !== alias) return a;
        const ids = a.org_unit_ids.includes(unitId)
          ? a.org_unit_ids.filter((id) => id !== unitId)
          : [...a.org_unit_ids, unitId];
        return { ...a, org_unit_ids: ids };
      }),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      notify({ type: 'warning', title: 'Campos obrigatórios', message: 'Preencha nome e e-mail.' });
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await accessApi.updateUser(editingUser.id, { name: form.name, email: form.email, accesses: form.accesses });
        notify({ type: 'success', title: 'Acessos atualizados', message: `${form.email} foi atualizado.` });
      } else {
        await accessApi.createUser({ ...form, password: form.password, password_confirmation: form.password_confirmation });
        notify({ type: 'success', title: 'Usuário criado', message: `${form.email} criado com os acessos configurados.` });
      }
      setModalOpen(false);
      setEditingUser(null);
      setForm(EMPTY_FORM);
      load();
    } catch (error: any) {
      notify({ type: 'error', title: 'Falha ao salvar', message: error.message || 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: AccessUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      accesses: user.accesses,
    });
    setModalOpen(true);
  };

  const moduleName = (alias: string) => modules.find((m) => m.alias === alias)?.name ?? alias;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gov-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">Usuários & Acessos</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gov-primary-light text-gov-primary border border-gov-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Por módulo e secretaria
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
            {isGlobalAdmin
              ? 'Administrador geral: habilita módulos, secretarias e administradores de módulo.'
              : `Você administra: ${myManagedModules.map(moduleName).join(', ')} — só é possível conceder acesso nesses módulos.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gov-primary/10 rounded-lg p-1">
            <button
              onClick={() => { setViewMode('lista'); setWizardOpen(false); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'lista' ? 'bg-white dark:bg-slate-800 text-gov-primary shadow-sm' : 'text-gov-text-secondary'
              }`}
            >
              <Users className="w-4 h-4" /> Lista
            </button>
            <button
              onClick={() => { setViewMode('painel'); setWizardOpen(false); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'painel' ? 'bg-white dark:bg-slate-800 text-gov-primary shadow-sm' : 'text-gov-text-secondary'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Painel do Admin
            </button>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>
      </div>

      {wizardOpen && (
        <NewUserWizard
          modules={modules}
          units={units}
          isGlobalAdmin={isGlobalAdmin}
          myManagedModules={myManagedModules}
          onCreated={() => { setWizardOpen(false); load(); }}
          onClose={() => setWizardOpen(false)}
          notify={notify}
        />
      )}

      {viewMode === 'painel' && !wizardOpen && (
        <AdminAccessPanel notify={notify} />
      )}

      {viewMode === 'lista' && !wizardOpen && (<>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gov-border shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gov-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-gov-border text-gov-text-primary placeholder-gov-text-muted focus:outline-none focus:ring-2 focus:ring-gov-primary/30"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gov-text-muted">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gov-border text-left text-xs uppercase tracking-wider text-gov-text-secondary">
                <th className="py-3 px-4 font-semibold">Nome</th>
                <th className="py-3 px-4 font-semibold">E-mail</th>
                <th className="py-3 px-4 font-semibold">Acessos (módulos)</th>
                <th className="py-3 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-gov-text-primary">{u.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gov-text-secondary">{u.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.accesses.length === 0 && <span className="text-xs text-gov-text-muted">—</span>}
                      {u.accesses.map((a) => (
                        <span key={a.module} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${a.can_manage_users ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {moduleName(a.module)}
                          {a.can_manage_users && <KeyRound className="w-3 h-3" />}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-2 rounded-lg text-gov-primary hover:bg-gov-primary-light transition-colors"
                      title="Editar acessos"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="text-lg font-bold text-[#0c326f] dark:text-white">
                {editingUser ? 'Editar Usuário & Acessos' : 'Novo Usuário & Acessos'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gov-text-muted hover:text-gov-text-primary"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Nome completo *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
                />
                <input
                  type="email"
                  required
                  placeholder="E-mail *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary text-sm font-mono focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
                />
              </div>
              {!editingUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Senha * (mín. 8, maiúsc., minúsc., número, símbolo)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Confirmar senha *"
                    value={form.password_confirmation}
                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
                  />
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-[#0c326f] dark:text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gov-primary" /> Acessos por módulo
                </h3>
                <p className="text-xs text-gov-text-secondary mb-3">
                  Marque os módulos e defina a secretaria (ou "todas"). Cada módulo pode ter um administrador que cria usuários só nele.
                </p>

                {modules.length === 0 ? (
                  <div className="p-6 text-center text-gov-text-muted border border-dashed border-gov-border rounded-xl">
                    Nenhum módulo ativo. Libere módulos no painel SYSTRAT.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modules.map((m) => {
                      const access = form.accesses.find((a) => a.module === m.alias);
                      const checked = !!access;
                      return (
                        <div key={m.alias} className={`rounded-xl border p-4 transition-colors ${checked ? 'border-gov-primary bg-gov-primary-light/30' : 'border-gov-border'}`}>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleModule(m.alias, e.target.checked)}
                                className="w-4 h-4 rounded text-gov-primary focus:ring-gov-primary"
                              />
                              <span className="text-sm font-semibold text-gov-text-primary">{m.name}</span>
                              <span className="font-mono text-[10px] text-gov-text-muted">{m.alias}</span>
                            </label>
                            {checked && (
                              <select
                                value={access.role}
                                onChange={(e) => updateAccess(m.alias, { role: e.target.value as 'member' | 'manager' })}
                                className="px-2 py-1 text-xs rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary focus:outline-none"
                              >
                                <option value="member">Membro</option>
                                <option value="manager">Gestor do módulo</option>
                              </select>
                            )}
                          </div>

                          {checked && (
                            <div className="mt-3 space-y-3">
                              <label className="flex items-center gap-2 text-xs text-gov-text-secondary cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={access.all_org_units}
                                  onChange={(e) => updateAccess(m.alias, { all_org_units: e.target.checked, org_unit_ids: e.target.checked ? [] : access.org_unit_ids })}
                                  className="w-4 h-4 rounded text-gov-primary focus:ring-gov-primary"
                                />
                                <Landmark className="w-3.5 h-3.5" /> Acesso a <strong>TODAS</strong> as secretarias/órgãos
                              </label>

                              {!access.all_org_units && (
                                <div className="max-h-40 overflow-y-auto border border-gov-border rounded-lg p-2 bg-gov-surface">
                                  {flatUnits.length === 0 ? (
                                    <div className="p-3 text-center">
                                      <p className="text-xs text-gov-text-muted mb-2">Nenhuma secretaria cadastrada no organograma.</p>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await accessApi.seedOrgUnits();
                                            notify({ type: 'success', title: 'Organograma inicializado', message: 'Gabinete e secretarias padrão criados.' });
                                            const u = await accessApi.orgUnits();
                                            setUnits(u);
                                          } catch (error: any) {
                                            notify({ type: 'error', title: 'Falha ao inicializar', message: error.message || 'Não foi possível inicializar o organograma.' });
                                          }
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg"
                                      >
                                        <Landmark className="w-3.5 h-3.5 inline mr-1" /> Inicializar Organograma
                                      </button>
                                    </div>
                                  ) : (
                                    flatUnits.map(({ node, depth }) => (
                                      <label
                                        key={node.id}
                                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gov-primary-light/30 cursor-pointer text-xs text-gov-text-primary"
                                        style={{ paddingLeft: `${8 + depth * 16}px` }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={access.org_unit_ids.includes(node.id)}
                                          onChange={() => toggleUnit(m.alias, node.id)}
                                          className="w-3.5 h-3.5 rounded text-gov-primary focus:ring-gov-primary"
                                        />
                                        <span className="font-mono text-[10px] text-gov-text-muted">{node.code}</span>
                                        {node.name}
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}

                              <label className="flex items-center gap-2 text-xs text-gov-text-secondary cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={access.can_manage_users}
                                  onChange={(e) => updateAccess(m.alias, { can_manage_users: e.target.checked })}
                                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                                />
                                <KeyRound className="w-3.5 h-3.5 text-amber-500" /> <strong>Administrador do módulo</strong> — pode criar usuários somente neste módulo
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gov-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gov-text-secondary border border-gov-border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingUser ? 'Salvar Acessos' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>)}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t, i) => (
          <div key={i} className={`px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'error' ? 'bg-rose-600 text-white' :
            t.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
          }`}>
            <strong className="block text-xs font-bold uppercase">{t.title}</strong>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessManagement;
