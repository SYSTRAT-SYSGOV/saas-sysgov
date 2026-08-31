import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { useCan } from '@/core/rbac/useCan';
import { getIcon } from '@/config/iconMap';
import { MenuItem, MenuGroup } from '@sysgov/sdk';
import { X, ChevronRight, ChevronDown, LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { navigation, logout, user } = useAuth();
  const { tenant, settings, isStandardBranding } = useTenant();
  const { can, hasModule } = useCan();
  const location = useLocation();

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleGroup = (id: number) => setExpandedGroups((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleItem = (id: number) => setExpandedItems((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      {/* 1. Backdrop Translúcido */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
          aria-hidden="true"
        />
      )}

      {/* 2. Menu Lateral Retrátil com Fundo Branco Limpo Oficial (#FFFFFF) */}
      <aside
        aria-label="Menu Principal de Navegação"
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 sm:w-96 bg-white border-r border-gov-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform font-sans ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do Menu */}
        <div className="p-4 sm:p-5 border-b border-gov-border bg-[#F8F9FA] flex items-center justify-between">
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
              <div className="w-11 h-11 rounded-lg bg-[#0c326f] text-white font-mono font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                SG
              </div>
            )}
            <div className="min-w-0">
              <span className="block font-bold text-base tracking-tight text-[#0c326f] uppercase truncate" style={{ fontWeight: 800 }}>
                <span className="text-[#0c326f]">SYS</span>
                <span className="text-[#10b981]"> GOV</span>
              </span>
              <span className="block text-xs sm:text-sm text-gov-text-secondary truncate font-normal">
                {settings.subtitle || tenant?.name}
              </span>
            </div>
          </div>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gov-text-secondary hover:bg-[#E8F0FE] hover:text-[#0c326f] transition focus-visible:ring-2 focus-visible:ring-[#0c326f]"
            aria-label="Fechar menu de navegação"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Faixa de Identificação do Menu */}
        <div className="px-5 py-3.5 bg-[#F0F4FA] border-b border-gov-border flex items-center justify-between text-sm sm:text-base font-bold text-[#0c326f]">
          <span className="uppercase tracking-wider font-bold text-xs sm:text-sm text-[#0c326f]" style={{ fontWeight: 800 }}>
            Navegação do Sistema
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#0c326f] border border-[#C5D8F6]">
            Padrão Gov.br
          </span>
        </div>

        {/* Corpo do Menu com Fundo Branco */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-7 bg-white">
          {navigation.map((group) => {
            const GroupIcon = getIcon(group.icon);
            const isExpanded = expandedGroups.has(group.id);
            return (
              <div key={group.id} className="space-y-1.5">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0c326f] border-b-2 border-[#C5D8F6] flex items-center gap-2.5 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                >
                  {group.icon && <GroupIcon className="w-5 h-5 text-[#0c326f] stroke-[2.5]" />}
                  <span className="tracking-wider text-[#0c326f] flex-1 text-left" style={{ fontWeight: 800 }}>
                    {group.name}
                  </span>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-[#0c326f]" />
                    : <ChevronRight className="w-4 h-4 text-gov-text-muted" />
                  }
                </button>

                {isExpanded && (
                  <div className="pt-1 space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.route;
                      const ItemIcon = getIcon(item.icon);
                      const children = (item as any).children || [];
                      const hasChildren = children.length > 0;
                      const isItemExpanded = expandedItems.has(item.id);

                      return (
                        <div key={item.id}>
                          <div className="flex items-center">
                            <NavLink
                              to={item.route}
                              onClick={onClose}
                              className={`group flex-1 flex items-center justify-between px-4 py-3.5 rounded-lg text-sm sm:text-base font-bold transition-all ${
                                isActive
                                  ? 'bg-[#E8F0FE] text-[#0c326f] border-l-4 border-[#0c326f] shadow-2xs'
                                  : 'text-[#1B1B1B] hover:bg-[#F0F4FA] hover:text-[#0c326f]'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 truncate">
                                <ItemIcon
                                  className={`w-5 h-5 shrink-0 transition-colors ${
                                    isActive ? 'text-[#0c326f]' : 'text-[#333333] group-hover:text-[#0c326f]'
                                  }`}
                                />
                                <span className="truncate font-bold tracking-tight">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.shortcut && (
                                  <span className={`font-mono text-xs px-2 py-0.5 rounded border tabular-nums ${
                                    isActive
                                      ? 'bg-white text-[#0c326f] border-[#C5D8F6] font-bold'
                                      : 'bg-[#F0F2F5] text-gov-text-secondary border-gov-border group-hover:text-[#0c326f]'
                                  }`}>
                                    [{item.shortcut}]
                                  </span>
                                )}
                                {hasChildren && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); toggleItem(item.id); }}
                                    className="p-0.5 hover:bg-slate-200 rounded"
                                  >
                                    {isItemExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                )}
                                {!hasChildren && <ChevronRight className="w-4 h-4 text-gov-border group-hover:text-[#0c326f]" />}
                              </div>
                            </NavLink>
                          </div>

                          {hasChildren && isItemExpanded && (
                            <div className="pl-8 pr-2 space-y-0.5 pb-1">
                              {children.map((child: any) => (
                                <NavLink
                                  key={child.id}
                                  to={child.route}
                                  onClick={onClose}
                                  className={({ isActive }) =>
                                    `group flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                      isActive
                                        ? 'bg-[#E8F0FE] text-[#0c326f] border-l-4 border-[#0c326f]'
                                        : 'text-[#1B1B1B] hover:bg-[#F0F4FA] hover:text-[#0c326f]'
                                    }`
                                  }
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gov-text-muted shrink-0" />
                                    <span className="truncate tracking-tight">{child.label}</span>
                                  </div>
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé do Menu */}
        <div className="p-4 border-t border-gov-border bg-[#F8F9FA] space-y-3">
          {/* Card do Usuário Logado */}
          <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white border border-gov-border shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#0c326f] text-white flex items-center justify-center font-mono font-bold text-sm shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-[#0c326f] truncate">
                  {user?.name || 'Operador'}
                </span>
                <span className="block text-xs text-gov-text-secondary truncate font-medium">
                  {user?.roles?.[0] || 'Gestor'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              title="Encerrar Sessão"
              className="p-2 rounded-lg text-gov-text-secondary hover:text-status-danger hover:bg-status-danger-bg transition"
              aria-label="Sair da conta"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Assinatura SYS GOV */}
          {isStandardBranding && (
            <div className="text-center text-xs text-gov-text-secondary pt-1">
              <span>Plataforma </span>
              <span className="font-bold text-[#0c326f]">
                <span className="text-[#0c326f]">SYS</span>
                <span className="text-[#10b981]"> GOV</span>
              </span>
              <span className="block text-[11px] text-[#0c326f] font-mono mt-0.5 font-bold tracking-wider">
                PADRÃO DIGITAL GOV.BR • TEMPLATE BASE
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
