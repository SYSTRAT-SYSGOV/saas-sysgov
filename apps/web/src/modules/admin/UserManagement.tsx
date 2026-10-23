import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Power, RotateCcw, KeyRound, Users, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { adminApi } from './api';
import { User, Role } from './types';
import { useAuthContext } from '../../contexts/AuthContext';
import type { ColumnDef } from '@tanstack/react-table';
import { Modal, Input, Select, Button, DataTable, ActionsMenu } from '@sysgov/ui';
import { useFormValidationModal } from '@sysgov/ui';

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuthContext();
  const isSelf = (user: User) => String(user.id) === String(currentUser?.id ?? '');
  const [users, setUsers] = useState<User[]>([]);
  const { modal: modalValidacao, validar, invalidar, tratarErro } = useFormValidationModal();
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [perPage, setPerPage] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [reason, setReason] = useState('');

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: search || undefined,
        status: status || undefined,
        page,
        per_page: perPage,
      });
      setUsers(res.data);
      setMeta(res.meta ?? { current_page: page, last_page: 1, total: 0 });
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      alert(error.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, [search, status, perPage]);

  useEffect(() => {
    loadUsers();
    adminApi.getRoles({ scope: 'systrat' }).then((r) => setRoles(r.data ?? [])).catch(() => undefined);
  }, [loadUsers]);

  const handleDeactivate = async (user: User) => {
    if (!validar([['Motivo da desativação', reason]])) return;
    if (reason.trim().length < 10) {
      invalidar([['Motivo da desativação', 'Informe o motivo da desativação (mínimo 10 caracteres).']]);
      return;
    }
    try {
      await adminApi.deactivateUser(user.id, reason.trim());
      setDeactivating(null);
      setReason('');
      loadUsers(meta.current_page);
    } catch (error: any) {
      if (!tratarErro(error)) alert(error.message || 'Erro ao desativar usuário.');
    }
  };

  const handleReactivate = async (user: User) => {
    try {
      await adminApi.reactivateUser(user.id);
      loadUsers(meta.current_page);
    } catch (error: any) {
      if (!tratarErro(error)) alert(error.message || 'Erro ao reativar usuário.');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`Enviar e-mail de redefinição de senha para ${user.email}?`)) return;
    try {
      await adminApi.requestPasswordReset(user.id);
      alert(`E-mail de redefinição de senha enviado para ${user.email}.`);
    } catch (error: any) {
      alert(error.message || 'Erro ao solicitar redefinição.');
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (editingUser) {
        const payload: any = {
          name: data.name,
          email: data.email,
          role_slug: data.role_slug,
          is_active: data.is_active,
        };
        // Só envia a senha quando informada (edição sem troca de senha mantém a atual)
        if (data.password) {
          payload.password = data.password;
          payload.password_confirmation = data.password_confirmation;
        }
        await adminApi.updateUser(editingUser.id, payload);
      } else {
        await adminApi.createUser({
          name: data.name,
          email: data.email,
          password: data.password,
          password_confirmation: data.password_confirmation,
          role_slug: data.role_slug,
        });
      }
      setModalOpen(false);
      setEditingUser(null);
      loadUsers(meta.current_page);
    } catch (error: any) {
      if (!tratarErro(error)) alert(error.message || 'Erro ao salvar usuário.');
    }
  };

  const roleNames = (user: User) =>
    (user.roles ?? []).map((r) => r.name).join(', ') || '—';

  const statusBadge = (user: User) => {
    if (!user.is_active) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground ">INATIVO</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-success-bg text-status-success ">ATIVO</span>;
  };

  const mfaBadge = (user: User) =>
    user.mfa_enabled ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
        <ShieldCheck className="w-3 h-3" /> MFA
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-status-danger border border-status-danger-border">
        <ShieldAlert className="w-3 h-3" /> Sem MFA
      </span>
    );

  const columns: ColumnDef<User>[] = [
    {
      id: 'acoes', header: '', enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex justify-center">
            <ActionsMenu triggerLabel="Ações do usuário" items={[
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => { setEditingUser(user); setModalOpen(true); } },
              { key: 'reset', label: 'Reset de senha', icon: <KeyRound className="h-3.5 w-3.5" />, onSelect: () => handleResetPassword(user) },
              ...(user.is_active
                ? (isSelf(user) ? [] : [{ key: 'desativar', label: 'Desativar', icon: <Power className="h-3.5 w-3.5" />, onSelect: () => { setDeactivating(user); setReason(''); } }])
                : [{ key: 'reativar', label: 'Reativar', icon: <RotateCcw className="h-3.5 w-3.5" />, onSelect: () => handleReactivate(user) }]),
            ]} />
          </div>
        );
      },
      meta: { exportIgnore: true },
    },
    { accessorKey: 'name', header: 'Nome' },
    { accessorKey: 'email', header: 'E-mail', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span> },
    { id: 'roles', header: 'Roles', accessorFn: (u) => roleNames(u) },
    { id: 'status', header: 'Status', accessorFn: (u) => (u.is_active ? 'Ativo' : 'Inativo'), cell: ({ row }) => statusBadge(row.original) },
    { id: 'mfa', header: 'MFA', accessorFn: (u) => (u.mfa_enabled ? 'Com MFA' : 'Sem MFA'), cell: ({ row }) => mfaBadge(row.original) },
    {
      id: 'created_at', header: 'Criado em',
      accessorFn: (u) => (u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'),
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.created_at ? new Date(row.original.created_at).toLocaleDateString('pt-BR') : '—'}</span>,
    },
  ];

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modalValidacao}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Usuários SYSTRAT
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Equipe da plataforma: super_admin, admin_ops e suporte.
          </p>
        </div>
        <Button onClick={() => { setEditingUser(null); setModalOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>
          Novo Usuário
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 border-b border-border">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); loadUsers(1); }}
              className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); loadUsers(1); }}
            className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 md:w-48"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      <DataTable<User, unknown>
        columns={columns}
        data={users}
        loading={loading}
        emptyText="Nenhum usuário encontrado."
        pageSizeOptions={[10, 25, 50, 100]}
        paginationState={{
          currentPage: meta.current_page,
          totalPages: meta.last_page,
          onPageChange: (p) => loadUsers(p),
          total: meta.total,
          perPage,
          onPerPageChange: (n) => { setPerPage(n); },
        }}
      />

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onClose={() => { setModalOpen(false); setEditingUser(null); }}
          onSave={handleSave}
        />
      )}

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Desativar Usuário"
        icon={<Power size={18} className="text-status-danger" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeactivating(null)}>Cancelar</Button>
            <Button onClick={() => deactivating && handleDeactivate(deactivating)} className="bg-destructive hover:bg-destructive">Desativar</Button>
          </>
        }
      >
        {deactivating && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Desativar <strong className="font-mono">{deactivating.email}</strong>? O motivo é obrigatório e será registrado na auditoria (RN-USR-007).
            </p>
            <div className="w-full space-y-2">
              <label className="block font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Motivo da desativação
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Mín. 10 caracteres..."
                className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 "
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const UserFormModal: React.FC<{
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ user, roles, onClose, onSave }) => {
  const { modal: modalValidacao, validar } = useFormValidationModal();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_slug: '',
  });
  const [saving, setSaving] = useState(false);
  const [roleError, setRoleError] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role_slug: user.roles?.[0]?.slug ?? '',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar([['Nome', formData.name], ['E-mail', formData.email]])) return;
    if (!formData.role_slug) {
      setRoleError(true);
      return;
    }
    setRoleError(false);
    setSaving(true);
    onSave(formData);
    setSaving(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? 'Editar Usuário' : 'Novo Usuário SYSTRAT'}
      icon={<Users size={18} className="text-primary" />}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="user-form" isLoading={saving}>
            {user ? 'Atualizar' : 'Criar'}
          </Button>
        </>
      }
    >
      {modalValidacao}
      <form noValidate id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Input
          label="E-mail *"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="font-mono"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={user ? 'Nova senha' : 'Senha *'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!user}
            minLength={8}
            helperText="Mín. 8 chars, maiúscula, minúscula, número e símbolo."
          />
          <Input
            label="Confirmar senha"
            type="password"
            value={formData.password_confirmation}
            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
            required={!user}
          />
        </div>
        <div>
          <Select
            label="Role *"
            value={formData.role_slug || null}
            onChange={(v) => { setFormData({ ...formData, role_slug: v }); setRoleError(false); }}
            placeholder="— Selecione a role —"
            options={roles.map((r) => ({ value: r.slug, label: `${r.name} (${r.slug})` }))}
          />
          {roleError && <p className="mt-1.5 text-xs sm:text-sm font-medium text-destructive">Selecione uma role.</p>}
        </div>
      </form>
    </Modal>
  );
};

export default UserManagement;
