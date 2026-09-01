import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { useOrgUnit } from '@/core/orgunit';
import { Bell, LogOut, UserCircle, Settings2, ChevronRight, ChevronDown, Menu, Building2, ShieldCheck, Loader2 } from 'lucide-react';

interface TopBarProps { onToggleSidebar: () => void; }

/**
 * TopBar largura total: SYS GOV + tenant + secretaria abaixo do título.
 * Notificações e perfil à direita. Breadcrumb alinhado ao conteúdo.
 */
export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const { activeUnit, loading: loadingUnit } = useOrgUnit();
  const location = useLocation();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

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
    <header className="sticky top-0 z-30 w-full bg-white border-b border-border shadow-sm">
      {/* Header Main — largura total */}
      <div className="w-full bg-white border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Left: Hamburger + SYS GOV + Tenant/Secretaria */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button type="button" onClick={onToggleSidebar} className="p-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition focus-visible:ring-2 focus-visible:ring-ring" aria-label="Abrir Menu">
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <span className="text-base sm:text-lg tracking-tight leading-tight whitespace-nowrap">
                <span className="text-[#1351b4] font-[900]">SYS</span>
                <span className="ml-1 text-[#168821] font-[900]">GOV</span>
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary whitespace-nowrap">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {tenant?.name}
                </span>
                {loadingUnit ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : activeUnit ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success whitespace-nowrap">
                    <ShieldCheck className="h-3 w-3 shrink-0" />
                    {activeUnit.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Notificações + Perfil */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button type="button" className="relative p-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition" title="Notificações">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-white" />
            </button>
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
      </div>

      {/* Subbar — largura total, breadcrumb alinhado à página */}
      <div className="w-full bg-muted/40 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-2.5 flex items-center">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline font-bold">SYSGOV</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-bold">{getBreadcrumbName(location.pathname)}</span>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default TopBar;