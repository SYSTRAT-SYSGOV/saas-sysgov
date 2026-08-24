import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Table,
  CreditCard,
  Plug,
  ShieldAlert,
  Settings,
  UserCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  PinOff,
  X,
  Sparkles,
  Layers,
  Landmark,
  Receipt,
  Scale,
  HandCoins,
  GraduationCap,
  Trophy,
  Award,
  BellRing,
  MapPin,
  Database,
  Sliders,
  FileText,
  Ticket,
  BookOpen,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS, AdminNavGroup, AdminNavItem } from '../config/adminNavigation';
import { useAdminConfig } from '../contexts/AdminConfigContext';
import { adminApi } from '../modules/admin/api';
import { MenuGroup as ApiMenuGroup } from '../modules/admin/types';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Building2, Table, CreditCard, Plug, ShieldAlert,
  Settings, UserCheck, BarChart3, Layers, Landmark, Receipt, Scale, HandCoins,
  GraduationCap, Trophy, Award, BellRing, MapPin, Database, Sliders, FileText,
  Ticket, BookOpen,
};

export interface NavItem {
  id: string;
  number?: string;
  emoji?: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'indigo';
  desc: string;
  shortcut?: string;
  roles?: string[];
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isPinned: boolean;
  onTogglePinned: () => void;
  authRole?: string;
  novasEmendas7Dias?: number;
  cidade?: string;
  currentMode?: 'universal' | 'municipal';
  onToggleMode?: (mode: 'universal' | 'municipal') => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onToggleOpen,
  isPinned,
  onTogglePinned,
  authRole = 'SUPER_ADMIN',
  novasEmendas7Dias = 0,
  cidade = 'SysGov Enterprise',
  currentMode = 'universal',
  onToggleMode,
}) => {
  const { config } = useAdminConfig();
  const [searchFilter, setSearchFilter] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [dynamicGroups, setDynamicGroups] = useState<ApiMenuGroup[]>([]);

  useEffect(() => {
    adminApi.getNavigation()
      .then((g) => {
        if (Array.isArray(g) && g.length > 0) setDynamicGroups(g);
      })
      .catch((err) => {
        console.warn('[Sidebar] getNavigation falhou, usando menu estático', err);
        setDynamicGroups([]);
      });
  }, []);

  // Universal Navigation Groups mapped to standard structure
  const universalGroups: NavGroup[] = useMemo(() => {
    if (dynamicGroups.length > 0) {
      return dynamicGroups.map((grp) => ({
        id: String(grp.id),
        title: grp.name,
        items: grp.items.map((item) => ({
          id: String(item.id),
          label: item.label,
          shortLabel: item.label.substring(0, 8),
          icon: ICON_MAP[item.icon] || LayoutDashboard,
          badge: item.badge ? String(item.badge.value) : undefined,
          badgeColor: item.badge?.tone === 'rose' ? 'rose' : 'amber',
          desc: item.module_alias || '',
        })),
      }));
    }
    return ADMIN_NAV_GROUPS.map((grp) => ({
      id: grp.id,
      title: grp.title,
      items: grp.items.map((item) => ({
        id: item.id,
        label: item.label,
        shortLabel: item.shortLabel,
        icon: item.icon,
        badge: item.badge,
        badgeColor: item.badgeColor,
        desc: item.description,
      })),
    }));
  }, [dynamicGroups]);

  // Specialized Municipal Preset Groups (Preserved for full compatibility)
  const municipalGroups: NavGroup[] = useMemo(() => {
    return [
      {
        id: 'gabinete',
        title: 'GABINETE & DECISÃO ESTRATÉGICA',
        items: [
          {
            id: 'painel_prefeito',
            number: 'PREF',
            emoji: '🏛️',
            label: 'Painel do Prefeito',
            shortLabel: 'Gabinete',
            icon: Landmark,
            badge: 'Executivo',
            badgeColor: 'emerald',
            desc: 'Visão executiva, margem da folha em R$ e decisões da semana',
            shortcut: 'P',
          },
          {
            id: 'painel_gestao',
            number: 'GES',
            emoji: '📊',
            label: 'Saúde Financeira',
            shortLabel: 'Gestão',
            icon: BarChart3,
            badge: 'Contratos',
            badgeColor: 'blue',
            desc: 'Contratos, índice de corte e simulador de contingenciamento',
            shortcut: 'G',
          },
          {
            id: 'benchmark',
            number: '07',
            emoji: '🏆',
            label: 'Benchmark Regional',
            shortLabel: 'Benchmark',
            icon: Trophy,
            badge: 'Comparativo',
            badgeColor: 'amber',
            desc: 'Comparativo regional pareado e eficiência fiscal',
            shortcut: 'B',
          },
          {
            id: 'selo',
            number: '08',
            emoji: '🎖️',
            label: 'Selo de Conformidade',
            shortLabel: 'Selo Fiscal',
            icon: Award,
            badge: 'Oficial',
            badgeColor: 'emerald',
            desc: 'Certificado de gestão fiscal transparente',
            shortcut: 'S',
          },
          {
            id: 'alertas_prazos',
            number: '09',
            emoji: '🔔',
            label: 'Alertas & Prazos Críticos',
            shortLabel: 'Radar Riscos',
            icon: BellRing,
            badge: '2 Críticos',
            badgeColor: 'rose',
            desc: 'Vencimento de certidões do CAUC e prazos SICONFI',
            shortcut: 'A',
          },
          {
            id: 'simulador_loa',
            number: 'E SE',
            emoji: '🎛️',
            label: 'Simulador LOA ("E Se")',
            shortLabel: 'Simulador LOA',
            icon: Sliders,
            badge: 'Decisão',
            badgeColor: 'blue',
            desc: 'Simulação preditiva de alíquotas de ISS/ITBI',
            shortcut: 'E',
          },
        ],
      },
      {
        id: 'gestao_fiscal',
        title: 'GESTÃO FISCAL & ORÇAMENTÁRIA',
        items: [
          {
            id: 'modulo1',
            number: '01',
            emoji: '📈',
            label: 'Dashboard Geral & KPIs',
            shortLabel: 'Dashboard',
            icon: LayoutDashboard,
            desc: 'Visão geral, KPIs consolidados e semáforos da LRF',
            shortcut: '1',
          },
          {
            id: 'modulo2',
            number: '02',
            emoji: '💰',
            label: 'Receitas & Reforma Tributária',
            shortLabel: 'Receitas',
            icon: BarChart3,
            badge: 'EC 132',
            badgeColor: 'blue',
            desc: 'Arrecadação LOA e Simulador da Reforma Tributária',
            shortcut: '2',
          },
          {
            id: 'modulo3',
            number: '03',
            emoji: '🧾',
            label: 'Despesas e Funções',
            shortLabel: 'Despesas',
            icon: Receipt,
            desc: 'Execução por função de governo e natureza de despesa',
            shortcut: '3',
          },
          {
            id: 'modulo4',
            number: '04',
            emoji: '⚖️',
            label: 'Limites LRF & Folha',
            shortLabel: 'Limites LRF',
            icon: Scale,
            badge: 'Alerta',
            badgeColor: 'amber',
            desc: 'Folha de pessoal e limites constitucionais',
            shortcut: '4',
          },
          {
            id: 'modulo5',
            number: '05',
            emoji: '🤝',
            label: 'Captação & Convênios',
            shortLabel: 'Captação',
            icon: HandCoins,
            badge: novasEmendas7Dias > 0 ? `+${novasEmendas7Dias} novas` : undefined,
            badgeColor: 'emerald',
            desc: 'Radar Transferegov e emendas parlamentares',
            shortcut: '5',
          },
          {
            id: 'modulo6',
            number: '06',
            emoji: '🎓',
            label: 'FUNDEB & Educação',
            shortLabel: 'FUNDEB',
            icon: GraduationCap,
            desc: 'Magistério e matrizes SIOPE',
            shortcut: '6',
          },
        ],
      },
      {
        id: 'contratos_financeiro',
        title: 'CONTRATOS & CONTABILIDADE',
        items: [
          {
            id: 'contratos',
            number: '10',
            emoji: '📑',
            label: 'Gestão de Contratos',
            shortLabel: 'Contratos',
            icon: FileText,
            badge: 'Lei 14.133',
            badgeColor: 'indigo' as const,
            desc: 'Ciclo de vida contratual, aditivos e fiscalização',
            shortcut: 'C',
          },
          {
            id: 'helpdesk',
            number: '11',
            emoji: '🎫',
            label: 'Suporte & Helpdesk',
            shortLabel: 'Helpdesk',
            icon: Ticket,
            badge: 'SLA',
            badgeColor: 'amber' as const,
            desc: 'Chamados internos com SLA automático por prioridade',
            shortcut: 'H',
          },
          {
            id: 'contabilidade',
            number: '12',
            emoji: '📚',
            label: 'Contabilidade Pública',
            shortLabel: 'Contabilidade',
            icon: BookOpen,
            badge: 'PCASP',
            badgeColor: 'emerald' as const,
            desc: 'PCASP, empenho-liquidação-pagamento e partidas dobradas',
            shortcut: 'K',
          },
        ],
      },
    ];
  }, [novasEmendas7Dias]);

  const activeGroups = currentMode === 'municipal' ? municipalGroups : universalGroups;

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '[' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        onToggleOpen();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleOpen]);

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'blue':
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700 font-bold';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar-navigation"
        className={`fixed top-0 left-0 h-full z-50 bg-[#0a1128] dark:bg-[#0a1128] border-r border-[#1a2a52] text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl overflow-x-hidden ${
          isOpen
            ? 'translate-x-0 w-80 max-w-[85vw]'
            : '-translate-x-full lg:translate-x-0 lg:w-16 w-80'
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-14 border-b border-[#1a2a52] flex items-center justify-between px-3 shrink-0 bg-[#0a1128] dark:bg-[#0a1128]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: config.primaryColor || '#10b981' }}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-950" />
            </div>
            {isOpen && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="text-xs font-bold font-mono tracking-tight text-white uppercase truncate">
                  {config.appName || 'SYSGOV ADMIN'}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-medium truncate">
                  {config.appSubtitle || 'Painel de Controle'}
                </span>
              </div>
            )}
          </div>

          {isOpen && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onTogglePinned}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isPinned
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
                title={isPinned ? 'Desafixar menu' : 'Fixar menu aberto'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 text-emerald-400" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onToggleOpen}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Recolher menu lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Search in Sidebar */}
        {isOpen && (
          <div className="p-3 border-b border-[#1a2a52]/80 bg-[#0a1128]/80 dark:bg-[#0a1128]/80 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrar módulos e telas..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#101a3a] border border-[#1a2a52] rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav Items List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 custom-scrollbar">
          {activeGroups.map((group) => {
            const filteredItems = group.items.filter(
              (item) =>
                searchFilter === '' ||
                item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
                item.desc.toLowerCase().includes(searchFilter.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1.5">
                {isOpen && (
                  <div className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase border-b border-[#1a2a52]/60 pb-1">
                    {group.title}
                  </div>
                )}

                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon || LayoutDashboard;
                    const isActive = activeTab === item.id;

                    return (
                      <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => setHoveredTab(item.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                      >
                        <button
                          id={`sidebar-nav-${item.id}`}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            if (!isPinned && typeof window !== 'undefined' && window.innerWidth < 1024) {
                              onToggleOpen();
                            }
                          }}
                          className={`w-full flex items-center ${
                            isOpen ? 'gap-3 px-2.5 text-left' : 'justify-center px-0 text-center'
                          } py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer group border ${
                            isActive
                              ? 'bg-[#101a3a] border-emerald-400 text-white font-bold shadow-sm'
                              : 'bg-[#0a1128] border-transparent text-slate-300 hover:bg-[#101a3a] hover:text-white'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              isActive
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                                : 'bg-[#101a3a] text-slate-300 group-hover:text-white group-hover:bg-[#1a2a52] border border-[#1a2a52]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          {isOpen && (
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 overflow-hidden">
                              <span className="text-[13px] font-medium text-slate-200 group-hover:text-white truncate">
                                {item.label}
                              </span>

                              {item.badge && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-mono rounded border shrink-0 ${getBadgeClass(
                                    item.badgeColor
                                  )}`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </button>

                        {/* Floating Tooltip when Collapsed */}
                        {!isOpen && hoveredTab === item.id && (
                          <div className="fixed left-16 ml-2 z-50 bg-[#101a3a] border border-[#1a2a52] text-white rounded-lg py-2 px-3.5 shadow-2xl pointer-events-none min-w-[220px] animate-fade-in">
                            <div className="font-bold text-xs font-mono text-emerald-400 pb-1 border-b border-[#1a2a52]">
                              {item.label}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">
                              {item.desc}
                            </p>
                            {item.badge && (
                              <span
                                className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-mono rounded border ${getBadgeClass(
                                  item.badgeColor
                                )}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-[#1a2a52] bg-[#0a1128]/95 dark:bg-[#0a1128]/95 shrink-0 text-center">
          {!isOpen ? (
            <button
              onClick={onToggleOpen}
              className="p-2 text-slate-300 hover:text-white hover:bg-[#101a3a] rounded-lg w-full flex justify-center transition cursor-pointer"
              title="Expandir menu lateral"
            >
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>{config.appName}</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                v2.5.0
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidebarNav;
