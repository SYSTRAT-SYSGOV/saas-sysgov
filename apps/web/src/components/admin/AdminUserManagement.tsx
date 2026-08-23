import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  KeyRound,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { INITIAL_ADMIN_USERS } from '../../services/adminMockData';
import { ADMIN_PERMISSIONS, AVAILABLE_ROLES } from '../../config/adminConfig';
import { AdminUser, AdminRole, UserStatus } from '../../types/admin';

interface AdminUserManagementProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onAddToast }) => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: AdminRole;
    department: string;
    status: UserStatus;
    tenantName: string;
    permissions: string[];
  }>({
    name: '',
    email: '',
    role: 'ADMIN',
    department: 'Geral',
    status: 'active',
    tenantName: 'SysGov Central',
    permissions: ['users.read', 'export.data'],
  });

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.tenantName && u.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
      const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      role: 'ADMIN',
      department: 'Tecnologia & Operações',
      status: 'active',
      tenantName: 'SysGov Central',
      permissions: ['users.read', 'export.data'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      tenantName: user.tenantName || 'SysGov Central',
      permissions: user.permissions || [],
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      onAddToast({
        type: 'error',
        title: 'Campos Obrigatórios',
        message: 'Preencha o nome e o e-mail do usuário.',
      });
      return;
    }

    if (editingUserId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                name: formData.name,
                email: formData.email,
                role: formData.role,
                department: formData.department,
                status: formData.status,
                tenantName: formData.tenantName,
                permissions: formData.permissions,
              }
            : u
        )
      );
      onAddToast({
        type: 'success',
        title: 'Usuário Atualizado',
        message: `As credenciais de ${formData.name} foram salvas.`,
      });
    } else {
      const newUser: AdminUser = {
        id: `usr-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        status: formData.status,
        createdAt: new Date().toISOString().split('T')[0],
        lastLoginAt: 'Nunca',
        permissions: formData.permissions,
        tenantName: formData.tenantName,
      };
      setUsers((prev) => [newUser, ...prev]);
      onAddToast({
        type: 'success',
        title: 'Novo Usuário Criado',
        message: `O usuário ${formData.name} foi cadastrado com sucesso.`,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteConfirmId(null);
    onAddToast({
      type: 'info',
      title: 'Usuário Removido',
      message: `A conta de ${target?.name || 'usuário'} foi desativada.`,
    });
  };

  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus: UserStatus = u.status === 'active' ? 'suspended' : 'active';
          onAddToast({
            type: nextStatus === 'active' ? 'success' : 'warning',
            title: `Status: ${nextStatus === 'active' ? 'Ativado' : 'Suspenso'}`,
            message: `Usuário ${u.name} agora está ${nextStatus === 'active' ? 'ativo' : 'suspenso'}.`,
          });
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const handleExportCSV = () => {
    const headers = ['ID,Nome,E-mail,Cargo,Departamento,Organização,Status,Criado Em'];
    const rows = filteredUsers.map(
      (u) =>
        `"${u.id}","${u.name}","${u.email}","${u.role}","${u.department}","${u.tenantName || '-'}","${u.status}","${u.createdAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_sysgov_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddToast({
      type: 'success',
      title: 'Exportação Concluída',
      message: `${filteredUsers.length} usuários exportados em formato CSV.`,
    });
  };

  const togglePermission = (permId: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      };
    });
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'ADMIN':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'MANAGER':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'OPERATOR':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ativo
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Suspenso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Inativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Gestão de Usuários & Acessos (RBAC)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre novos administradores, defina papéis de acesso, permissões granulares e controle de status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md hover:shadow-blue-600/30"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adicionar Usuário</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, departamento ou organização..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Cargos</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="pending">Pendentes</option>
            <option value="suspended">Suspensos</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Cargo / Nível</th>
                <th className="py-3.5 px-4">Departamento</th>
                <th className="py-3.5 px-4">Organização</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Último Acesso</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {u.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {u.department}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {u.tenantName || 'SysGov Central'}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(u.status)}</td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {u.lastLoginAt || 'Nunca'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          title={u.status === 'active' ? 'Suspender Conta' : 'Ativar Conta'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            u.status === 'active'
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(u)}
                          title="Editar Usuário"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          title="Excluir Usuário"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white font-mono">{filteredUsers.length}</strong> de{' '}
            <strong className="text-slate-900 dark:text-white font-mono">{users.length}</strong> usuários cadastrados
          </span>
          <span className="text-[11px] font-mono">sysgov-rbac-v2</span>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@dominio.com"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cargo / Nível de Acesso
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departamento / Setor
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Ex: Controladoria, Finanças"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Organização / Tenant
                  </label>
                  <input
                    type="text"
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    placeholder="Ex: SysGov Central ou Prefeitura"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status da Conta
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="active">Ativo</option>
                    <option value="pending">Pendente</option>
                    <option value="suspended">Suspenso</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Permissões Granulares
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 max-h-48 overflow-y-auto">
                  {ADMIN_PERMISSIONS.map((p) => {
                    const isChecked = formData.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-blue-500"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-md"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Confirmar Exclusão
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5">
              Tem certeza que deseja remover este usuário? Esta ação revogará todas as sessões ativas e permissões imediatamente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
