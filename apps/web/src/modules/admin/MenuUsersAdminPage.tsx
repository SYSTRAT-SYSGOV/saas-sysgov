import React, { useEffect, useState } from 'react';
import { Layers, Users, Sparkles, FolderTree } from 'lucide-react';
import { adminApi } from './api';
import { MenuGroup, MenuItem, User } from './types';
import { MenuManager } from './MenuManager';
import { UserManagement } from './UserManagement';
import { EditItemModal } from './EditItemModal';
import { EditUserModal } from './EditUserModal';
import { Tabs, Tab } from '../../components/admin/AdminTabs';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
  initialTab?: 'menus' | 'users';
}

const MOCK_MENUS: MenuGroup[] = [
  {
    id: 1, name: 'PAINEL PRINCIPAL', slug: 'painel-principal', icon: 'LayoutDashboard',
    order: 1, is_active: true,
    items: [
      { id: 1, label: 'Visão Geral & KPIs', route: 'admin_dashboard', icon: 'LayoutDashboard', shortcut: '1', module_alias: 'dashboard', order: 1, is_active: true },
      { id: 2, label: 'Desempenho & Métricas', route: 'admin_analytics', icon: 'BarChart3', shortcut: '2', module_alias: 'analytics', order: 2, is_active: true },
    ],
  },
  {
    id: 2, name: 'GESTÃO & CADASTROS', slug: 'gestao-cadastros', icon: 'Building2',
    order: 2, is_active: true,
    items: [
      { id: 3, label: 'Usuários & Permissões', route: 'admin_users', icon: 'Users', shortcut: 'U', module_alias: 'users', order: 1, is_active: true },
      { id: 4, label: 'Organizações & Tenants', route: 'admin_tenants', icon: 'Building2', shortcut: 'T', module_alias: 'tenants', order: 2, is_active: true },
      { id: 5, label: 'Registros & Tabelas', route: 'admin_records', icon: 'Layers', shortcut: 'R', module_alias: 'records', order: 3, is_active: true },
      { id: 6, label: 'Gerenciador de Menus', route: 'admin_menus', icon: 'FolderTree', shortcut: 'M', module_alias: 'menus', order: 4, is_active: true },
    ],
  },
  {
    id: 3, name: 'FINANCEIRO & INFRAESTRUTURA', slug: 'financeiro-infra', icon: 'CreditCard',
    order: 3, is_active: true,
    items: [
      { id: 7, label: 'Faturamento & Invoices', route: 'admin_billing', icon: 'CreditCard', shortcut: 'F', module_alias: 'billing', order: 1, is_active: true },
      { id: 8, label: 'APIs & Integrações', route: 'admin_apis', icon: 'Plug', shortcut: 'I', module_alias: 'apis', order: 2, is_active: true },
      { id: 9, label: 'Logs & Auditoria', route: 'admin_logs', icon: 'ShieldAlert', shortcut: 'L', module_alias: 'compliance', order: 3, is_active: true },
    ],
  },
  {
    id: 4, name: 'SISTEMA & PREFERÊNCIAS', slug: 'sistema-preferencias', icon: 'Settings',
    order: 4, is_active: true,
    items: [
      { id: 10, label: 'Configurações & White-Label', route: 'admin_settings', icon: 'Settings', module_alias: 'settings', order: 1, is_active: true },
      { id: 11, label: 'Meu Perfil & Segurança', route: 'admin_profile', icon: 'UserCheck', module_alias: 'profile', order: 2, is_active: true },
    ],
  },
  {
    id: 5, name: 'CONTRATOS & CONTABILIDADE', slug: 'contratos-contabilidade', icon: 'FileText',
    order: 5, is_active: true,
    items: [
      { id: 12, label: 'Gestão de Contratos', route: 'contratos', icon: 'FileText', module_alias: 'contracts', order: 1, is_active: true },
      { id: 13, label: 'Suporte & Helpdesk', route: 'helpdesk', icon: 'Ticket', module_alias: 'support', order: 2, is_active: true },
      { id: 14, label: 'Contabilidade Pública', route: 'contabilidade', icon: 'BookOpen', module_alias: 'contabilidade', order: 3, is_active: true },
    ],
  },
];

const MOCK_USERS: User[] = [
  {
    id: 1, name: 'Administrador SYSGOV', email: 'admin@sysgov.local',
    is_platform_admin: true, created_at: '2026-08-23T18:08:51.000000Z',
    tenants: [{ id: 1, name: 'Prefeitura de Araucária', slug: 'araucaria' }],
  },
];

export const MenuUsersAdminPage: React.FC<Props> = ({ onAddToast, initialTab = 'menus' }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [groups, setGroups] = useState<MenuGroup[]>(MOCK_MENUS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUserId, setCurrentUserId] = useState<number | null>(1);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [g, u] = await Promise.all([adminApi.getMenus(), adminApi.getUsers()]);
      if (Array.isArray(g) && g.length > 0) setGroups(g);
      if (Array.isArray(u) && u.length > 0) setUsers(u);
    } catch (e) {
      console.warn('Usando mock data:', e);
    }
  };

  const persistGroups = async (newGroups: MenuGroup[]) => {
    setGroups(newGroups);
    onAddToast({ type: 'success', title: 'Reorganização salva', message: 'Ordem dos itens atualizada.' });
    try {
      const updates: Promise<unknown>[] = [];
      newGroups.forEach((g) => {
        g.items.forEach((item, idx) => {
          updates.push(adminApi.updateItem(item.id, { ...item, order: idx + 1 } as any).catch(() => undefined));
        });
      });
      await Promise.all(updates);
    } catch {
      /* offline: dados locais já foram atualizados */
    }
  };

  const handleDeleteGroup = (g: MenuGroup) => {
    if (!window.confirm(`Excluir o grupo "${g.name}"?`)) return;
    adminApi.deleteGroup(g.id).catch(() => undefined);
    setGroups((prev) => prev.filter((g2) => g2.id !== g.id));
    onAddToast({ type: 'success', title: 'Grupo removido', message: g.name });
  };

  const handleDeleteItem = (i: MenuItem) => {
    if (!window.confirm(`Excluir o item "${i.label}"?`)) return;
    adminApi.deleteItem(i.id).catch(() => undefined);
    setGroups((prev) => prev.map((g) => ({ ...g, items: g.items.filter((item) => item.id !== i.id) })));
    onAddToast({ type: 'success', title: 'Item removido', message: i.label });
  };

  const handleDeleteUser = (u: User) => {
    adminApi.deleteUser(u.id).catch(() => undefined);
    setUsers((prev) => prev.filter((item) => item.id !== u.id));
    onAddToast({ type: 'success', title: 'Usuário removido', message: u.name });
  };

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
  const activeItems = groups.reduce((acc, g) => acc + g.items.filter((i) => i.is_active).length, 0);
  const withPermission = groups.reduce((acc, g) => acc + g.items.filter((i) => i.permission).length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Grupos de Menu', value: groups.length, icon: FolderTree, color: 'text-indigo-500' },
          { label: 'Total de Itens', value: totalItems, icon: Layers, color: 'text-emerald-500' },
          { label: 'Itens Ativos', value: activeItems, icon: Sparkles, color: 'text-amber-500' },
          { label: 'Com Permissões', value: withPermission, icon: Users, color: 'text-cyan-500' },
        ].map((s) => (
          <div key={s.label} className="mod-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider mod-text-secondary">{s.label}</p>
              <p className="text-2xl font-extrabold mod-text-primary font-mono tabular-nums mt-1">{s.value}</p>
            </div>
            <s.icon className={`w-7 h-7 ${s.color}`} />
          </div>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} items={[
        { id: 'menus', label: 'Gerenciamento de Menus', count: groups.length },
        { id: 'users', label: 'Gestão de Usuários', count: users.length },
      ]} />

      {tab === 'menus' && (
        <MenuManager
          groups={groups}
          onUpdateGroups={persistGroups}
          onCreateGroup={() => onAddToast({ type: 'info', title: 'Novo Grupo', message: 'Modal de criação de grupo.' })}
          onCreateItem={(gid) => {
            const newItem: MenuItem = {
              id: Date.now(),
              menu_group_id: gid,
              label: 'Novo Item',
              route: 'novo',
              icon: 'Layers',
              order: 999,
              is_active: true,
            };
            setGroups((prev) => prev.map((g) => g.id === gid ? { ...g, items: [...g.items, newItem] } : g));
            onAddToast({ type: 'success', title: 'Item adicionado', message: 'Lembre-se de configurar a rota e permissão.' });
          }}
          onEditGroup={() => onAddToast({ type: 'info', title: 'Editar Grupo', message: 'Modal de edição de grupo.' })}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteGroup={handleDeleteGroup}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {tab === 'users' && (
        <UserManagement
          users={users}
          onCreate={() => onAddToast({ type: 'info', title: 'Novo Usuário', message: 'Modal de provisionamento.' })}
          onEdit={(u) => setEditingUser(u)}
          onDelete={handleDeleteUser}
          currentUserId={currentUserId}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(item) => {
            setGroups((prev) => prev.map(g => ({
              ...g,
              items: g.items.map(i => i.id === item.id ? item : i)
            })));
            adminApi.updateItem(item.id, item as any).catch(() => undefined);
            setEditingItem(null);
            onAddToast({ type: 'success', title: 'Item atualizado', message: item.label });
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(user) => {
            setUsers((prev) => prev.map(u => u.id === user.id ? user : u));
            adminApi.updateUser(user.id, user as any).catch(() => undefined);
            setEditingUser(null);
            onAddToast({ type: 'success', title: 'Usuário atualizado', message: user.name });
          }}
        />
      )}
    </div>
  );
};
