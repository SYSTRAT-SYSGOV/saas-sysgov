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
  Settings2,
} from 'lucide-react';
import { accessApi, AccessDashboardData, AccessUser, AccessModule, OrgUnitNode, Cargo, AccessGroup, AccessCategory } from './AccessApi';
import { AdminAccessPanel, NewUserWizard, UserEditModal, AdvancedFilters, UserFilters } from './evolution';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

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

  const orgUnitName = (id: number) => {
    const find = (nodes: OrgUnitNode[]): string | null => {
      for (const n of nodes) {
        if (n.id === id) return n.name;
        if (n.children?.length) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(units) ?? `#${id}`;
  };

  const userColumns: ColumnDef<AccessUser, any>[] = [
    {
      id: 'name',
      header: 'Nome',
      accessorKey: 'name',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      id: 'email',
      header: 'E-mail',
      accessorKey: 'email',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: 'secretaria',
      header: 'Secretaria',
      cell: ({ row }) =>
        row.original.primary_org_unit_id ? (
          <Badge variant="info">{orgUnitName(row.original.primary_org_unit_id)}</Badge>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        ),
    },
    {
      id: 'acessos',
      header: 'Acessos (módulos)',
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.original.accesses.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {row.original.accesses.map((a) => (
            <Badge
              key={a.module}
              variant={a.can_manage_users ? 'warning' : 'neutral'}
              icon={a.can_manage_users ? <KeyRound className="h-3 w-3" /> : undefined}
            >
              <span className="font-mono">{moduleName(a.module)}</span>
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => openEdit(row.original)}
          className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Editar usuário"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gov-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários & Acessos</h1>
              <Badge variant="primary" className="mt-1">
                <ShieldCheck className="h-3 w-3" /> Por módulo e secretaria
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            {isGlobalAdmin
              ? 'Administrador geral: habilita módulos, secretarias e administradores de módulo.'
              : `Você administra: ${myManagedModules.map(moduleName).join(', ')} — só é possível conceder acesso nesses módulos.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            items={[
              { key: 'lista', label: 'Lista', icon: <Users className="h-4 w-4" /> },
              { key: 'painel', label: 'Painel do Admin', icon: <LayoutDashboard className="h-4 w-4" /> },
            ]}
            value={viewMode}
            onChange={(v) => { setViewMode(v); setWizardOpen(false); }}
          />
          <button
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserPlus className="h-4 w-4" /> Novo Usuário
          </button>
          <button
            onClick={() => { window.location.href = '/granularidade-módulos'; }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Granularidade de módulos por unidade"
          >
            <Settings2 className="h-4 w-4" /> Granularidade
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

      <Card noPadding>
        <div className="relative border-b border-border p-3">
          <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="p-3">
          <DataTable
            columns={userColumns}
            data={safeUsers}
            loading={loading}
            emptyText="Nenhum usuário encontrado."
            pageSize={25}
          />
        </div>
      </Card>

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
          <div key={i} className={cn(
            'rounded-lg px-4 py-3 text-sm shadow-lg max-w-sm',
            t.type === 'success' && 'bg-success text-success-foreground',
            t.type === 'error' && 'bg-destructive text-destructive-foreground',
            t.type === 'warning' && 'bg-warning text-warning-foreground',
            t.type === 'info' && 'bg-status-info text-white'
          )}>
            <strong className="block text-xs font-bold uppercase">{t.title}</strong>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessManagement;
