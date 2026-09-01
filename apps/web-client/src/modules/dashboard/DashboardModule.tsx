import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { useOrgUnit } from '@/core/orgunit';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';import {
  Sparkles,
  Building2,
  Settings2,
  Star,
  Plus,
  X,
  Loader2,
  ArrowRight,
  LayoutDashboard,
  FileCheck,
  Handshake,
  DollarSign,
  BookOpen,
  Users,
  ShieldCheck,
  Shield,
  ChevronRight,
  MapPin,
} from 'lucide-react';

const FAVORITES_KEY = 'sysgov:welcome:favorites';
const CUSTOM_ORDER_KEY = 'sysgov:welcome:custom_order';

interface ModuleShortcut {
  id: string;
  name: string;
  icon: string;
  route: string;
  permission?: string;
}

function getModuleRoute(id: string): string {
  const routes: Record<string, string> = {
    dashboard: '/',
    org: '/organograma',
    procurement: '/licitacoes',
    contracts: '/contratos',
    finance: '/financeiro',
    pedagogico: '/pedagogico',
    rh: '/rh',
    cemiterios: '/cemiterios',
    users: '/usuarios',
    menuManager: '/gerenciar-menus',
    moduleGranularity: '/granularidade-módulos',
  };
  return routes[id] || '/';
}

function getModuleIcon(id: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard className="h-6 w-6" />,
    org: <Building2 className="h-6 w-6" />,
    procurement: <FileCheck className="h-5 w-5" />,
    contracts: <Handshake className="h-5 w-5" />,
    finance: <DollarSign className="h-5 w-5" />,
    pedagogico: <BookOpen className="h-5 w-5" />,
    rh: <Users className="h-5 w-5" />,
    cemiterios: <Shield className="h-5 w-5" />,
    users: <ShieldCheck className="h-5 w-5" />,
    menuManager: <Settings2 className="h-5 w-5" />,
    moduleGranularity: <Shield className="h-5 w-5" />,
  };
  return icons[id] || <LayoutDashboard className="h-5 w-5" />;
}

export const DashboardModule: React.FC = () => {
  const { user, modules: activeModules, permissions } = useAuth();
  const { tenant } = useTenant();
  const { scopeInfo, unitList, activeUnit, orgTree, loading: loadingUnits, hasMultipleUnits } = useOrgUnit();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
  });
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_ORDER_KEY) || '[]'); } catch { return []; }
  });
  const [editMode, setEditMode] = useState(false);

  const saveFavorites = (f: string[]) => {
    setFavorites(f);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(f));
  };

  const saveCustomOrder = (o: string[]) => {
    setCustomOrder(o);
    localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(o));
  };

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      saveFavorites(favorites.filter((f) => f !== id));
    } else {
      saveFavorites([...favorites, id]);
    }
  };

  const allModules = Object.entries(MODULE_REGISTRY)
    .filter(([id, def]) => {
      if (id === 'menuManager' || id === 'moduleGranularity') return false;
      if (def.requiredPermission && !permissions.includes('*') && !permissions.includes(def.requiredPermission)) return false;
      if (!activeModules.includes(id)) return false;
      return true;
    })
    .map(([id, def]) => ({
      id,
      name: def.name,
      icon: id,
      route: getModuleRoute(id),
      permission: def.requiredPermission,
    }));

  const orderedModules = customOrder.length > 0
    ? [...customOrder.map((id) => allModules.find((m) => m.id === id)).filter(Boolean) as ModuleShortcut[],
       ...allModules.filter((m) => !customOrder.includes(m.id))]
    : allModules;

  const pinnedModules = orderedModules.filter((m) => favorites.includes(m.id));
  const otherModules = orderedModules.filter((m) => !favorites.includes(m.id));

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Hero - Boas-vindas */}
      <Card className="!p-6 sm:!p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">
              {userInitial}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Bem-vindo ao <strong className="text-foreground">{tenant?.name}</strong>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {loadingUnits ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                ) : scopeInfo?.is_unrestricted ? (
                  <Badge variant="success" icon={<ShieldCheck className="h-3 w-3" />}>
                    Acesso irrestrito a todas as unidades
                  </Badge>
                ) : activeUnit ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info" icon={<Building2 className="h-3 w-3" />}>
                      {activeUnit.name}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      Hierarquia: {(() => {
                        const parts: string[] = [];
                        const findAncestors = (id: number, nodes: typeof orgTree): boolean => {
                          for (const n of nodes) {
                            if (n.id === id) { parts.push(n.name); return true; }
                            if (n.children?.length && findAncestors(id, n.children)) { parts.push(n.name); return true; }
                          }
                          return false;
                        };
                        const root = findAncestors(activeUnit.id, orgTree);
                        return parts.reverse().join(' › ') || '—';
                      })()}
                    </span>
                  </div>
                ) : (
                  <Badge variant="neutral">Usuário sem vínculo de unidade</Badge>
                )}
                {user?.is_platform_admin && <Badge variant="warning">Administrador da Plataforma</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                editMode ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground hover:bg-accent'
              )}
            >
              <Settings2 className="h-4 w-4" />
              {editMode ? 'Concluir edição' : 'Personalizar'}
            </button>
          </div>
        </div>
      </Card>

      {/* Seção de atalhos favoritos */}
      {pinnedModules.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <h2 className="text-base font-bold text-foreground">Favoritos</h2>
            <span className="text-xs text-muted-foreground">({pinnedModules.length} atalho(s))</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {pinnedModules.map((mod) => (
              <a
                key={mod.id}
                href={mod.route}
                onClick={(e) => { e.preventDefault(); navigate(mod.route); }}
                className={cn(
                  'group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all',
                  'hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
                  editMode && 'border-dashed border-primary/60'
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {getModuleIcon(mod.id)}
                </span>
                <span className="text-sm font-semibold text-foreground">{mod.name}</span>
                {editMode && (
                  <button
                    onClick={(e) => { e.preventDefault(); toggleFavorite(mod.id); }}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    title="Remover dos favoritos"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Seção de todos os módulos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Módulos disponíveis</h2>
            <span className="text-xs text-muted-foreground">({otherModules.length} módulo(s))</span>
          </div>
          {editMode && favorites.length > 0 && pinnedModules.length > 0 && (
            <span className="text-xs text-muted-foreground">Clique no coração para adicionar/remover favoritos</span>
          )}
        </div>
        {otherModules.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-12 w-12 text-border" />
            <p className="text-sm text-muted-foreground">Nenhum outro módulo disponível no momento.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {otherModules.map((mod) => (
              <a
                key={mod.id}
                href={mod.route}
                onClick={(e) => { e.preventDefault(); navigate(mod.route); }}
                className={cn(
                  'group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all',
                  'hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
                  editMode && 'border-dashed border-muted-foreground/30'
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                  {getModuleIcon(mod.id)}
                </span>
                <span className="text-sm font-semibold text-foreground">{mod.name}</span>
                {editMode && (
                  <button
                    onClick={(e) => { e.preventDefault(); toggleFavorite(mod.id); }}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
                    title="Adicionar aos favoritos"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Seção de boas-vindas expandida */}
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <Sparkles className="h-8 w-8" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-foreground">Dicas rápidas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use o botão <strong>Personalizar</strong> no topo da página para adicionar ou remover atalhos dos seus módulos favoritos.
              Você pode organizar a página do jeito que for mais produtivo para o seu dia a dia.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Star className="h-3 w-3 text-warning" /> Marque como favorito
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Settings2 className="h-3 w-3" /> Personalize a página
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <ArrowRight className="h-3 w-3" /> Navegue pelos módulos
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardModule;
