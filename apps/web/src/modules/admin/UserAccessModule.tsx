import React, { useState } from 'react';
import { Users, ShieldCheck, KeyRound, MailPlus, UserCog, Headset } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { PermissionManagement } from './PermissionManagement';
import { InvitationsPage } from './InvitationsPage';
import AnalystManagement from './AnalystManagement';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
  initialTab?: 'users' | 'roles' | 'permissions' | 'invitations' | 'analysts';
}

/**
 * Módulo Gestão de Usuários & Acessos (RBAC)
 * Submenus: Usuários | Roles | Permissões | Convites
 */
export const UserAccessModule: React.FC<Props> = ({ onAddToast, initialTab = 'users' }) => {
  const [tab, setTab] = useState<string>(initialTab);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho do módulo */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <UserCog className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gestão de Usuários & Acessos (RBAC)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Usuários SYSTRAT, roles, permissões granulares e convites com expiração de 72h.
            </p>
          </div>
        </div>
      </div>

      {/* Submenus */}
      <div className="mod-card overflow-hidden border-b mod-border">
        <div className="flex">
          {[
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'roles', label: 'Roles', icon: KeyRound },
            { id: 'permissions', label: 'Permissões', icon: ShieldCheck },
            { id: 'invitations', label: 'Convites', icon: MailPlus },
            { id: 'analysts', label: 'Analistas', icon: Headset },
          ].map((it) => {
            const isActive = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent mod-text-secondary hover:mod-text-primary'
                }`}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'users' && <UserManagement />}
      {tab === 'roles' && <RoleManagement />}
      {tab === 'permissions' && <PermissionManagement />}
      {tab === 'invitations' && <InvitationsPage onAddToast={onAddToast} />}
      {tab === 'analysts' && <AnalystManagement onAddToast={onAddToast} />}
    </div>
  );
};

export default UserAccessModule;
