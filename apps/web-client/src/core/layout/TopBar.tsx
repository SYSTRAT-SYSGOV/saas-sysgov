import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { apiClient } from '@/core/api/client';
import {
  Menu,
  Building2,
  ChevronDown,
  ChevronRight,
  Check,
  Bell,
  LogOut,
  UserCircle,
  Settings2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps { onToggleSidebar: () => void; }

interface OrgScopeInfo {
  primary_unit: { id: number; name: string; code: string; acronym?: string | null; role: string } | null;
  managed_units: { id: number; name: string; code: string; acronym?: string | null }[];
  is_unrestricted: boolean;
}

interface OrgTreeNode {
  id: number; name: string; code: string; type: string; level: number; path: string;
  children: OrgTreeNode[];
}

const ORG_UNIT_KEY = 'sysgov:active_org_unit_id';

/**
 * TopBar avançado: título SYS azul + GOV verde bold, alinhado ao max-w-7xl,
 * dropdown hierárquico de secretarias/departamentos, sem truncate.
 */
export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, tenants, switchTenant, logout } = useAuth();
  const { tenant, settings } = useTenant();
  const location = useLocation();

  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [scopeInfo, setScopeInfo] = useState<OrgScopeInfo | null>(null);
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<number | null>(() => {
    const v = localStorage.getItem(ORG_UNIT_KEY);
    return v ? Number(v) : null;
  });

  useEffect(() => {
    setLoadingScope(true);
    Promise.all([
      apiClient.get<{ data: OrgScopeInfo }>('/org-units/scope'),
      apiClient.get<{ data: OrgTreeNode[] }>('/org-units'),
    ])
      .then(([scopeRes, treeRes]) => {
        setScopeInfo(scopeRes.data?.data ?? null);
        setOrgTree(Array.isArray(treeRes.data?.data) ? treeRes.data.data : []);
      })
      .catch(() => { setScopeInfo(null); setOrgTree([]); })
      .finally(() => setLoadingScope(false));
  }, [tenant?.id]);

  const allowedIds = new Set(scopeInfo
    ? [
        ...(scopeInfo.primary_unit ? [scopeInfo.primary_unit.id] : []),
        ...scopeInfo.managed_units.map((u) => u.id),
      ]
    : []);

  const buildUnitList = (nodes: OrgTreeNode[], depth = 0): { id: number; name: string; code: string; type: string; level: number; depth: number }[] => {
    if (allowedIds.size === 0) return [];
    const out: { id: number; name: string; code: string; type: string; level: number; depth: number }[] = [];
    for (const n of nodes) {
      if (allowedIds.has(n.id)) {
        out.push({ id: n.id, name: n.name, code: n.code, type: n.type, level: n.level, depth });
      }
      if (n.children?.length) out.push(...buildUnitList(n.children, depth + 1));
    }
    return out;
  };

  const unitList = buildUnitList(orgTree);
  const hasMultipleUnits = unitList.length > 1;
  const activeUnit = unitList.find((u) => u.id === activeUnitId) ?? unitList[0] ?? null;

  const switchUnit = (unitId: number) => {
    setActiveUnitId(unitId);
    localStorage.setItem(ORG_UNIT_KEY, String(unitId));
    setIsUnitDropdownOpen(false);
  };

  const getBreadcrumbName = (pathname: string) => {
    const map: Record<string, string> = {
      '/': 'Painel Geral', '/licitacoes': 'Licitações & Editais', '/contratos': 'Contratos & Aditivos',
      '/financeiro': 'Execução Financeira', '/pedagogico': 'Módulo Pedagógico', '/rh': 'Recursos Humanos',
      '/cemiterios': 'Gestão de Cemitérios', '/organograma': 'Organograma Municipal', '/usuarios': 'Usuários & Acessos',
      '/perfil': 'Meu Perfil',
    };
    return map[pathname] || 'Visão Geral';
  };

  const roleLabel = user?.roles?.[0]
    ? user.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Operador';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border shadow-sm">
      {/* Header Main — alinhado ao max-w-7xl comoo conteúdo*/}
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-3.5 bg-white flex items-center justify-between gap-4">
        {/* Left: Hambúrger + Brasão + Título */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button type="button" onClick={onToggleSidebar} className="p-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition focus-visible:ring-2 focus-visible:ring-ring" aria-label="Abrir Menu">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3.5 min-w-0">
            {settings.customLogoUrl ? (
              <img src={settings.customLogoUrl} alt="Brasão" className="w-11 h-11 rounded-lg object-contain bg-white border border-border p-1 shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground font-mono font-extrabold flex items-center justify-center text-base shadow-sm shrink-0">SG</div>
            )}
            <div className="min-w-0">
              <span className="text-base sm:text-lg tracking-tight leading-tight">
                <span className="text-[#1351b4] font-[900]">SYS</span>
                <span className="ml-1 text-[#168821] font-[900]">GOV</span>
              </span>
              <span className="block text-xs sm:text-sm text-muted-foreground truncate font-normal">{settings.subtitle || tenant?.name}</span>
            </div>
          </div>
        </div>

        {/* Right: Tenant + Secretaria (hierárquico) + Notificações + Perfil */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tenant */}
          <div className="relative">
            {tenants.length > 1 ? (
              <div>
                <button type="button" onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-accent/40 hover:bg-accent text-left transition">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[130px] sm:max-w-[200px]">{tenant?.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground ml-0.5" />
                </button>
                {isTenantDropdownOpen && (
                  <><div className="fixed inset-0 z-40" onClick={() => setIsTenantDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-popover shadow-xl border border-border py-2 z-50 divide-y divide-border">
                    <div className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">Alternar Órgão/Município</div>
                    <div className="py-1">{tenants.map((t) => (
                      <button key={t.id} type="button" onClick={() => { switchTenant(t.id); setIsTenantDropdownOpen(false); }} className={cn('w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-accent transition', t.id === tenant?.id ? 'bg-accent text-primary font-semibold' : 'text-foreground')}>
                        <div className="truncate"><span className="block font-medium truncate">{t.name}</span><span className="font-mono text-xs text-muted-foreground uppercase">{t.type}</span></div>
                        {t.id === tenant?.id && <Check className="w-5 h-5 text-primary shrink-0" />}
                      </button>
                    ))}</div>
                  </div>
                  </>)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm bg-accent/40 px-3.5 py-2 rounded-lg border border-border">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground truncate max-w-[160px]">{tenant?.name}</span>
              </div>
            )}
          </div>`

          {/* Secretaria hierárquica (sem truncate) */}
          {loadingScope ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : activeUnit ? (
            <div className="relative min-w-0">
              <button type="button" onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-accent text-left transition max-w-full" title="Alternar secretaria de trabalho">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">{activeUnit.name}</span>
                {hasMultipleUnits && <ChevronDown className="w-4 h-4 text-muted-foreground ml-0.5 shrink-0" />}
              </button>
              {hasMultipleUnits && isUnitDropdownOpen && (
                <><div className="fixed inset-0 z-40" onClick={() => setIsUnitDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-96 rounded-xl bg-popover shadow-xl border border-border py-2 z-50 divide-y divide-border max-h-[70vh] overflow-y-auto">
                  <div className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Secretaria / Departamento</div>
                  <div className="py-1">
                    {unitList.map((u, i) => (
                      <button key={u.id} type="button" onClick={() => switchUnit(u.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-accent transition',
                          u.id === activeUnit.id ? 'bg-accent/60 text-primary font-semibold' : 'text-foreground'
                        )}
                        style={{ paddingLeft: `${16 + u.depth * 20}px` }}
                      >
                        <div className="flex items-center min-w-0 gap-2">
                          {u.depth > 0 && <span className="text-muted-foreground text-xs shrink-0">{'↳'}</span>}
                          <span className="font-medium truncate">{u.name}</span>
                          {u.level === 2 && <span className="font-mono text-[10px] text-muted-foreground uppercase">{u.type}</span>}
                        </div>
                        {u.id === activeUnit.id && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                </div>
                </>)}
            </div>
          ) : null}

          {/* Notificações */}
          <button type="button" className="relative p-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition" title="Notificações">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-white" />
          </button>

          {/* Perfil */}
          <div className="relative">
            <button type="button" onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-accent border border-transparent hover:border-border transition">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-sm font-semibold text-foreground truncate max-w-[120px]">{user?.name?.split(' ')[0] || 'Usuário'}</span>
                <span className="block text-xs text-muted-foreground truncate max-w-[120px]">{roleLabel}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>
            {isUserDropdownOpen && (
              <><div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-popover shadow-xl border border-border py-2 z-50 divide-y divide-border">
                <div className="px-4 py-3">
                  <span className="block text-sm font-semibold text-foreground">{user?.name}</span>
                  <span className="block text-xs text-muted-foreground font-mono mt-0.5">{user?.email}</span>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary">{roleLabel}</span>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setIsUserDropdownOpen(false); window.location.href = '/perfil'; }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition font-medium">
                    <UserCircle className="w-4 h-4 text-primary" /> Editar Perfil
                  </button>
                  <button onClick={() => { setIsUserDropdownOpen(false); window.location.href = '/configuracoes'; }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition font-medium">
                    <Settings2 className="w-4 h-4 text-muted-foreground" /> Configurações
                  </button>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setIsUserDropdownOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition font-semibold">
                    <LogOut className="w-4 h-4" /> Encerrar Sessão
                  </button>
                </div>
              </div>
              </>)}
          </div>
        </div>
      </div>

      {/* Subbar — Breadcrumb alinhado ao max-w-7xl */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-2.5 bg-muted/40 flex items-center justify-between text-sm border-t border-border/40">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline font-bold">SYSGOV</Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-bold">{getBreadcrumbName(location.pathname)}</span>
        </nav>
      </div>
    </header>
  );
};

export default TopBar;