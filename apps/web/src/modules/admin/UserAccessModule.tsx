import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, KeyRound, MailPlus, UserCog, Headset } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
      <div className="bg-white dark:bg-[#101a3a] p-6 rounded-2xl border border-slate-200 dark:border-[#1a2a52] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <UserCog className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gestão de Usuários & Acessos (RBAC)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Usuários cadastrados, controle de acesso baseado em papéis (RBAC), permissões granulares e convites.
            </p>
          </div>
        </div>
      </div>

      {/* Submenus (Abas) */}
      <div className="bg-white dark:bg-[#101a3a] rounded-xl border border-slate-200 dark:border-[#1a2a52] overflow-hidden shadow-sm">
        <div className="flex flex-wrap border-b border-slate-200 dark:border-[#1a2a52]">
          {tabs.map((it) => {
            const isActive = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => handleTabChange(it.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
                title={it.desc}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </button>
            );
          })}
        </div>
      </div>

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
