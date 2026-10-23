import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Menu,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  Presentation,
  ShieldCheck,
  LogOut,
  Sparkles,
  Building,
  Printer,
} from 'lucide-react';
import { SiconfiApiStatus } from '../types/fiscal';
import { useAuthContext } from '../contexts/AuthContext';
import { TenantBrandingConfig } from '../types/saas';

interface HeaderProps {
  siconfiStatus?: SiconfiApiStatus | null;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  novasEmendas7Dias?: number;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  tenantInfo?: {
    id?: string;
    nomePrefeitura: string;
    cidade: string;
    uf: string;
    codigoIbge: string;
    cnpj?: string;
    status?: string;
    branding?: TenantBrandingConfig;
  };
  authRole?: 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE' | string;
  onChangeAuthRole?: (role: any) => void;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
  onOpenRelatorioExecutivo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siconfiStatus = null,
  activeTab = 'admin_dashboard',
  setActiveTab = () => {},
  isPresentationMode = false,
  onTogglePresentationMode,
  tenantInfo = {
    id: '',
    nomePrefeitura: '',
    cidade: 'SysGov Central',
    uf: 'BR',
    codigoIbge: '0000000',
  },
  authRole = 'EMPRESA_MASTER',
  onChangeAuthRole,
  onToggleSidebar,
  onLogout,
  onOpenRelatorioExecutivo,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuthContext();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    if (roleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleDropdownOpen]);

  const handleSelectRole = (newRole: 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE') => {
    if (onChangeAuthRole) {
      onChangeAuthRole(newRole);
    }
    setRoleDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border  text-foreground  shadow-xs  transition-colors">
      {/* Container Principal: Desktop e Tablet */}
      <div className="w-full px-2 sm:px-4 flex items-center justify-between h-13 sm:h-14 gap-1.5 sm:gap-3">
        {/* Esquerda: Botão Menu + Brasão e Nome do Município */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 max-w-[260px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-sm bg-muted hover:bg-accent text-foreground border-border border transition cursor-pointer shrink-0 shadow-xs active:scale-95"
            title="Abrir / Fechar Menu Lateral ([)"
            aria-label="Alternar Menu Lateral"
          >
            <Menu className="w-4 h-4 text-primary " />
          </button>
        </div>

        {/* Direita: Controles e Ações Adaptados para Não Quebrar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Status SICONFI / Sincronização */}
          {siconfiStatus && (
            <div
              className={`hidden xl:flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-mono border shrink-0 ${
 siconfiStatus.online
                  ? 'bg-status-success-bg  border-status-success-border  text-status-success '
                  : 'bg-status-warning-bg  border-status-warning-border  text-status-warning '
              }`}
              title={siconfiStatus.online ? 'API Siconfi Online' : 'Cache Local Ativo'}
            >
              {siconfiStatus.online ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-status-warning shrink-0" />
              )}
              <span className="text-[10px] font-bold tracking-tight">
                {siconfiStatus.online ? 'SICONFI CONECTADO' : 'SICONFI OFFLINE'}
              </span>
            </div>
          )}

          {/* Botão Dossiê Executivo 1-Click PDF */}
          {onOpenRelatorioExecutivo && (
            <button
              onClick={onOpenRelatorioExecutivo}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-mono font-bold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground border border-primary transition cursor-pointer shadow-xs shrink-0"
              title="Gerar Dossiê Executivo Consolidado Timbrado em PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dossiê Executivo (PDF)</span>
            </button>
          )}

          {/* Modo Apresentação */}
          {onTogglePresentationMode && (
            <button
              onClick={onTogglePresentationMode}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-sm text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
 isPresentationMode
                  ? 'bg-status-warning text-foreground border-status-warning-border shadow-sm'
                  : 'bg-muted hover:bg-accent text-foreground border-border    '
              }`}
              title="Alternar Modo Apresentação para Reuniões e Audiências"
            >
              <Presentation className="w-3.5 h-3.5 text-status-warning " />
              <span className="hidden xl:inline">{isPresentationMode ? 'Sair' : 'Apresentação'}</span>
            </button>
          )}

          {/* Seletor de Papel / Perfil do Usuário */}
          <div className="relative shrink-0" ref={roleDropdownRef}>
            <button
              onClick={() => setRoleDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-muted hover:bg-accent border-border text-foreground border text-xs font-sans transition cursor-pointer"
              title="Perfil de Acesso do Usuário"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></div>
              <span className="hidden sm:inline font-bold">
                {authRole === 'EMPRESA_MASTER' ? 'Master SaaS' : `Painel ${tenantInfo?.cidade || 'Admin'}`}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border  rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150 font-sans">
                <div className="p-2.5 bg-muted border-b border-border  text-xs">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Conta Conectada</span>
                  <span className="font-bold text-foreground truncate block">
                    {currentUser?.email || (authRole === 'EMPRESA_MASTER' ? 'admin@sysgov.online' : 'gestor@sysgov.online')}
                  </span>
                </div>

                <div className="p-2 space-y-1.5">
                  {authRole === 'EMPRESA_MASTER' ? (
                    <div className="p-2 rounded-xs text-xs flex items-center justify-between bg-status-success-bg text-status-success  border border-status-success-border ">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary " />
                        <div>
                          <span className="font-bold block">{currentUser?.nome || 'Administrador Master'}</span>
                          <span className="text-[10px] text-muted-foreground block">Gestão multi-tenant global</span>
                        </div>
                      </div>
                      <Check className="w-3.5 h-3.5 text-primary " />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xs text-xs flex items-center justify-between bg-muted border border-border  text-foreground ">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary " />
                        <div>
                          <span className="font-bold block text-foreground ">Gestor</span>
                          <span className="text-[10px] text-muted-foreground block">{tenantInfo?.cidade || 'Central'} / {tenantInfo?.uf || 'BR'}</span>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                    </div>
                  )}
                </div>

                {onLogout && (
                  <div className="p-1 border-t border-border bg-muted ">
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left p-2 rounded-xs text-xs text-status-danger hover:bg-status-danger-bg  hover:text-status-danger  transition flex items-center gap-2 font-sans font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-status-danger " />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
