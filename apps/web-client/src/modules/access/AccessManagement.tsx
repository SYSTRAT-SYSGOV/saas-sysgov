import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  ShieldCheck,
  Pencil,
  KeyRound,
  LayoutDashboard,
} from 'lucide-react';
import { accessApi, AccessDashboardData, AccessUser, AccessModule, OrgUnitNode, Cargo, AccessGroup, AccessCategory } from './AccessApi';
import { AdminAccessPanel, NewUserWizard, UserEditModal, AdvancedFilters, UserFilters } from './evolution';

const DASHBOARD_CACHE_KEY = 'sysgov:access:dashboard:v1';

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
  const [filters, setFilters] = useState<UserFilters>({});
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [categories, setCategories] = useState<AccessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'lista' | 'painel'>('lista');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccessUser | null>(null);
  const [pagination, setPagination] = useState({ current_page: 1, per_page: 25, total: 0, last_page: 1 });

  const loadDashboard = useCallback(async () => {
    const setters = { setUsers, setModules, setUnits, setIsGlobalAdmin, setMyManagedModules };
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
      notify({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar os acessos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const [c, g, cat] = await Promise.all([accessApi.cargos(), accessApi.groups(), accessApi.categories()]);
      setCargos(c);
      setGroups(g);
      setCategories(cat);
    } catch {
    }
  }, []);

  const loadServerUsers = useCallback(async (f: UserFilters, page = 1) => {
    try {
      const result = await accessApi.users({ ...f, q: search || undefined, page });
      setUsers(Array.isArray(result.items) ? result.items : []);
      setPagination(result.meta ?? { current_page: 1, per_page: 25, total: 0, last_page: 1 });
    } catch {
      setUsers([]);
    }
  }, [search]);

  const load = useCallback(async () => {
    await loadDashboard();
    await loadFilters();
  }, [loadDashboard, loadFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (viewMode === 'lista') {
      loadServerUsers({ ...filters, q: search || undefined }, 1);
    }
  }, [viewMode, filters, search, loadServerUsers]);

  const safeUsers: AccessUser[] = Array.isArray(users) ? users : [];

  const openEdit = (user: AccessUser) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleUserSaved = (saved: AccessUser) => {
    setEditModalOpen(false);
    setEditingUser(null);
    loadServerUsers({ ...filters, q: search || undefined }, pagination.current_page);
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
        <AdminAccessPanel modules={modules} units={units} notify={notify} />
      )}

      {viewMode === 'lista' && !wizardOpen && (<>
      <AdvancedFilters
        modules={modules}
        units={units}
        groups={groups}
        categories={categories}
        cargos={cargos}
        filters={filters}
        onChange={(f) => { setFilters(f); setPagination((p) => ({ ...p, current_page: 1 })); }}
      />

      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gov-border shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gov-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-gov-border text-gov-text-primary placeholder-gov-text-muted focus:outline-none focus:ring-2 focus:ring-gov-primary/30"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
        {safeUsers.length === 0 ? (
          <div className="p-12 text-center text-gov-text-muted">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gov-border text-left text-xs uppercase tracking-wider text-gov-text-secondary">
                <th className="py-3 px-4 font-semibold">Nome</th>
                <th className="py-3 px-4 font-semibold">E-mail</th>
                <th className="py-3 px-4 font-semibold">Cargo</th>
                <th className="py-3 px-4 font-semibold">Acessos (módulos)</th>
                <th className="py-3 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {safeUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-gov-text-primary">{u.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gov-text-secondary">{u.email}</td>
                  <td className="py-3 px-4 text-xs text-gov-text-secondary">{u.cargo ?? <span className="text-gov-text-muted">—</span>}</td>
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
                      title="Editar usuário"
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

      {pagination.total > pagination.per_page && (
        <div className="flex items-center justify-between px-4 py-3 border border-gov-border rounded-xl bg-white dark:bg-slate-900">
          <span className="text-xs text-gov-text-secondary">
            Mostrando <span className="font-semibold">{(pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span> de <span className="font-semibold">{pagination.total}</span> usuários
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { const p = pagination.current_page - 1; if (p >= 1) loadServerUsers({ ...filters, q: search || undefined }, p); }}
              disabled={pagination.current_page <= 1}
              className="px-3 py-1.5 text-xs border border-gov-border rounded-lg disabled:opacity-40 hover:bg-gov-primary/5"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
              const page = pagination.current_page <= 3 ? i + 1 : pagination.current_page + i - 2;
              if (page < 1 || page > pagination.last_page) return null;
              return (
                <button key={page} onClick={() => loadServerUsers({ ...filters, q: search || undefined }, page)}
                  className={`w-8 h-8 text-xs rounded-lg border ${page === pagination.current_page ? 'bg-gov-primary text-white border-gov-primary' : 'border-gov-border hover:bg-gov-primary/5'}`}>
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => { const p = pagination.current_page + 1; if (p <= pagination.last_page) loadServerUsers({ ...filters, q: search || undefined }, p); }}
              disabled={pagination.current_page >= pagination.last_page}
              className="px-3 py-1.5 text-xs border border-gov-border rounded-lg disabled:opacity-40 hover:bg-gov-primary/5"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {editModalOpen && editingUser && (
        <UserEditModal
          user={editingUser}
          modules={modules}
          units={units}
          cargos={cargos}
          groups={groups}
          onClose={() => { setEditModalOpen(false); setEditingUser(null); }}
          onSaved={handleUserSaved}
          notify={notify}
        />
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
