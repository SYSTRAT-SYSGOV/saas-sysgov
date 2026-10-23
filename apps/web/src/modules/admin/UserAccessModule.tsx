import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, KeyRound, MailPlus, UserCog, Headset } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@sysgov/ui';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { PermissionManagement } from './PermissionManagement';
import { InvitationsPage } from './InvitationsPage';
import AnalystManagement from './AnalystManagement';

interface Props {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
  initialTab?: 'users' | 'roles' | 'permissions' | 'invitations' | 'analysts';
}

/**
 * Módulo Gestão de Usuários & Acessos (RBAC)
 * Submenus: Usuários | Roles | Permissões | Convites | Analistas
 */
export const UserAccessModule: React.FC<Props> = ({ onAddToast = () => {}, initialTab = 'users' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'users' | 'roles' | 'permissions' | 'invitations' | 'analysts' | null;
  const [tab, setTab] = useState<string>(tabParam || initialTab);

  useEffect(() => {
    if (tabParam && ['users', 'roles', 'permissions', 'invitations', 'analysts'].includes(tabParam) && tabParam !== tab) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const tabs = [
    { id: 'users', label: 'Usuários', icon: Users, desc: 'Contas e acessos de usuários' },
    { id: 'roles', label: 'Roles', icon: KeyRound, desc: 'Papéis e perfis de permissão' },
    { id: 'permissions', label: 'Permissões', icon: ShieldCheck, desc: 'Permissões granulares do sistema' },
    { id: 'invitations', label: 'Convites', icon: MailPlus, desc: 'Convites com expiração de 72h' },
    { id: 'analysts', label: 'Analistas', icon: Headset, desc: 'Suporte e analistas técnicos' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho do módulo */}
      <div className="bg-card p-6 rounded-2xl border border-border  shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <UserCog className="w-6 h-6 text-primary " />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Gestão de Usuários & Acessos (RBAC)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usuários cadastrados, controle de acesso baseado em papéis (RBAC), permissões granulares e convites.
            </p>
          </div>
        </div>
      </div>

      {/* Submenus (Abas) */}
      <Card className="gap-0 py-0 overflow-hidden">
        <div className="flex flex-wrap border-b border-border ">
          {tabs.map((it) => {
            const isActive = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => handleTabChange(it.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
 isActive
                    ? 'border-primary text-status-success  bg-status-success-bg/40  font-bold'
                    : 'border-transparent text-muted-foreground  hover:text-foreground  hover:bg-accent '
                }`}
                title={it.desc}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Conteúdo da Aba Ativa */}
      {tab === 'users' && <UserManagement />}
      {tab === 'roles' && <RoleManagement />}
      {tab === 'permissions' && <PermissionManagement />}
      {tab === 'invitations' && <InvitationsPage onAddToast={onAddToast} />}
      {tab === 'analysts' && <AnalystManagement onAddToast={onAddToast} />}
    </div>
  );
};

export default UserAccessModule;
