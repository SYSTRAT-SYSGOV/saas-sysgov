import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import {
  Menu,
  Search,
  Calendar,
  Building2,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
  FileDown,
  Bell,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, tenants, switchTenant, logout } = useAuth();
  const { tenant, settings } = useTenant();
  const location = useLocation();

  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const getBreadcrumbName = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Painel Geral';
      case '/licitacoes': return 'Licitações & Editais';
      case '/contratos': return 'Contratos & Aditivos';
      case '/financeiro': return 'Execução Financeira';
      case '/pedagogico': return 'Módulo Pedagógico';
      case '/rh': return 'Recursos Humanos / Folha';
      case '/cemiterios': return 'Gestão de Cemitérios';
      default: return 'Visão Geral';
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gov-border shadow-xs">
      {/* Header Main — Título SYS GOV e Busca (br-header main) */}
      <div className="px-4 lg:px-8 py-3.5 bg-white flex items-center justify-between gap-4 border-b border-gov-border/50">
        {/* Left: Hambúrguer + Brasão + Título SYS GOV */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2.5 rounded-full text-gov-text-secondary hover:bg-[#E8F0FE] hover:text-[#1351B4] transition focus-visible:ring-2 focus-visible:ring-[#1351B4]"
            aria-label="Abrir Menu de Navegação"
            title="Menu Principal (Atalho: M)"
          >
            <Menu className="w-6 h-6 text-gov-text-primary" />
          </button>

          <div className="flex items-center gap-3.5 min-w-0">
            {settings.customLogoUrl ? (
              <img
                src={settings.customLogoUrl}
                alt="Brasão"
                className="w-11 h-11 rounded-lg object-contain bg-white border border-gov-border p-1 shrink-0 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-[#1351B4] text-white font-mono font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                SG
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-[#0c326f] tracking-tight truncate uppercase">
                  <span className="text-[#0c326f]">SYS</span>
                  <span className="text-[#10b981]"> GOV</span>
                </span>
                <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8F0FE] text-[#0c326f] border border-[#C5D8F6]">
                  CLIENTE V3
                </span>
              </div>
              <span className="block text-xs sm:text-sm text-gov-text-secondary truncate font-normal">
                {settings.subtitle || tenant?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Barra de Busca Oficial Gov.br (br-input search) */}
        <div className="hidden lg:flex flex-1 max-w-lg mx-4">
          <div className="relative w-full flex items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O que você procura em processos, contratos ou despesas?"
              className="w-full bg-[#F8F9FA] border border-gov-border rounded-full py-2.5 pl-5 pr-11 text-sm sm:text-base text-gov-text-primary placeholder:text-gov-text-muted focus:outline-none focus:border-[#1351B4] focus:bg-white focus:ring-2 focus:ring-[#1351B4]/20 transition"
            />
            <button
              type="button"
              className="absolute right-3.5 text-gov-text-muted hover:text-[#1351B4] transition p-1"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Seletor de Órgão + Ações + Perfil */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Seletor de Município / Tenant */}
          <div className="relative">
            {tenants.length > 1 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gov-border bg-[#F8F9FA] hover:bg-white hover:border-[#1351B4] text-left transition shadow-2xs"
                >
                  <Building2 className="w-4 h-4 text-[#1351B4] shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold text-gov-text-primary block truncate max-w-[130px] sm:max-w-[200px]">
                      {tenant?.name}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gov-text-muted ml-0.5" />
                </button>

                {isTenantDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsTenantDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-gov-border py-2 z-50 divide-y divide-gov-border">
                      <div className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-gov-text-secondary">
                        Alternar Órgão / Município
                      </div>
                      <div className="py-1">
                        {tenants.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              switchTenant(t.id);
                              setIsTenantDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-[#F0F4FA] transition ${t.id === tenant?.id ? 'bg-[#E8F0FE] text-[#1351B4] font-semibold' : 'text-gov-text-primary'
                              }`}
                          >
                            <div className="truncate">
                              <span className="block font-medium truncate">{t.name}</span>
                              <span className="font-mono text-xs text-gov-text-secondary uppercase">{t.type}</span>
                            </div>
                            {t.id === tenant?.id && <Check className="w-5 h-5 text-[#1351B4] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm bg-[#F8F9FA] px-3.5 py-2 rounded-full border border-gov-border">
                <Building2 className="w-4 h-4 text-[#1351B4]" />
                <span className="font-semibold text-gov-text-primary truncate max-w-[160px]">{tenant?.name}</span>
              </div>
            )}
          </div>

          {/* Exercício Fiscal Selector */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full border border-gov-border bg-white shadow-2xs">
            <Calendar className="w-4 h-4 text-[#1351B4]" />
            <label htmlFor="select-year" className="font-mono text-xs font-bold text-gov-text-secondary uppercase">
              Ano:
            </label>
            <select
              id="select-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="font-mono text-sm font-bold text-gov-text-primary bg-transparent focus:outline-none cursor-pointer tabular-nums"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Notificações */}
          <button
            type="button"
            className="relative p-2.5 rounded-full text-gov-text-secondary hover:bg-[#E8F0FE] hover:text-[#1351B4] transition"
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-status-danger ring-2 ring-white" />
          </button>

          {/* Usuário Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-[#F0F4FA] border border-transparent hover:border-gov-border transition"
            >
              <div className="w-8 h-8 rounded-full bg-[#1351B4] text-white flex items-center justify-center font-mono font-bold text-sm">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-sm font-semibold text-gov-text-primary truncate max-w-[120px]">
                  {user?.name?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="block text-xs text-gov-text-secondary truncate max-w-[120px]">
                  {user?.roles?.[0] || 'Gestor'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gov-text-muted hidden md:block" />
            </button>

            {isUserDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-gov-border py-2 z-50 divide-y divide-gov-border">
                  <div className="px-4 py-3">
                    <span className="block text-sm font-semibold text-gov-text-primary">{user?.name}</span>
                    <span className="block text-xs text-gov-text-secondary font-mono mt-0.5">{user?.email}</span>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8F0FE] text-[#1351B4]">
                      {user?.roles?.[0] || 'Operador'}
                    </span>
                  </div>
                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-status-danger hover:bg-status-danger-bg transition font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Header Subbar — Breadcrumb Oficial Gov.br e Ações Rápidas (br-breadcrumb) */}
      <div className="px-4 lg:px-8 py-2.5 bg-[#F8F9FA] flex items-center justify-between text-sm border-t border-gov-border/40">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gov-text-secondary font-sans">
          <Link to="/" className="text-[#0c326f] hover:underline font-bold flex items-center gap-1">
            SYSGOV
          </Link>
          <ChevronRight className="w-4 h-4 text-gov-text-muted" />
          <span className="text-[#0c326f] font-bold">
            {getBreadcrumbName(location.pathname)}
          </span>
        </nav>

        <div className="hidden sm:flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            isLoading={isSyncing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            Sincronizar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileDown className="w-4 h-4" />}
          >
            Exportar PDF
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
