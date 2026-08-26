import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Button,
  StatusChip,
  StatusVariant,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Input,
} from '@/components/ui';
import { Users, UserPlus, Search, Pencil, Power, RotateCcw, Loader2, ShieldCheck } from 'lucide-react';
import { useTenant } from '@/core/tenant/useTenant';
import { useCan } from '@/core/rbac/useCan';
import { usersApi } from './UsersApi';
import { TenantUser } from './types';

const TENANT_ROLES = [
  'admin_tenant',
  'gestor',
  'pregoeiro',
  'requisitante',
  'parecerista',
  'fiscal',
  'membro',
];

interface FormState {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_slug: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', password_confirmation: '', role_slug: '' };

export const UsersModule: React.FC = () => {
  const { tenant } = useTenant();
  const { can } = useCan();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deactivating, setDeactivating] = useState<TenantUser | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canManage = can('users.manage') || can('*');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ search: search || undefined, role: roleFilter || undefined });
      setUsers(res.data);
    } catch (error) {
      console.error('Erro ao carregar usuários do tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          name: form.name,
          email: form.email,
          role_slug: form.role_slug,
        });
      } else {
        await usersApi.create(form);
      }
      setModalOpen(false);
      setEditingUser(null);
      setForm(EMPTY_FORM);
      load();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: TenantUser) => {
    if (!reason.trim() || reason.trim().length < 10) {
      alert('Informe o motivo da desativação (mínimo 10 caracteres).');
      return;
    }
    try {
      await usersApi.deactivate(user.id, reason.trim());
      setDeactivating(null);
      setReason('');
      load();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Erro ao desativar usuário.');
    }
  };

  const handleReactivate = async (user: TenantUser) => {
    try {
      await usersApi.reactivate(user.id);
      load();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Erro ao reativar usuário.');
    }
  };

  const openEdit = (user: TenantUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      role_slug: user.role_slug || user.roles?.[0]?.slug || '',
    });
    setModalOpen(true);
  };

  const roleBadge = (user: TenantUser) => {
    const slug = user.role_slug || user.roles?.[0]?.slug;
    return slug ? <span className="font-mono text-[11px] text-gov-primary bg-gov-primary-light px-2 py-0.5 rounded-full">{slug}</span> : '—';
  };

  const statusChip = (user: TenantUser): { label: string; variant: StatusVariant } =>
    user.is_active
      ? { label: 'Ativo', variant: 'success' }
      : { label: 'Inativo', variant: 'neutral' };

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Usuários do Município
              </h1>
              <StatusChip label="Gestão de Acesso" variant="primary" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Equipe vinculada a <strong className="text-gov-text-primary">{tenant?.name}</strong> —
              pregoeiros, fiscais, requisitantes e membros.
            </p>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => { setEditingUser(null); setForm(EMPTY_FORM); setModalOpen(true); }}
            >
              Novo Usuário
            </Button>
          )}
        </div>
      </Card>

      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gov-text-muted" />}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-12 px-4 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary font-mono text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
          >
            <option value="">Todas as roles</option>
            {TENANT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gov-primary animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gov-text-muted">
            Nenhum usuário encontrado neste município.
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>MFA</TableHeaderCell>
                <TableHeaderCell className="text-center">Status</TableHeaderCell>
                {canManage && <TableHeaderCell className="text-right">Ações</TableHeaderCell>}
              </tr>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="font-medium text-gov-text-primary">{u.name}</span>
                  </TableCell>
                  <TableCell isTechnical className="text-gov-text-secondary">
                    {u.email}
                  </TableCell>
                  <TableCell>{roleBadge(u)}</TableCell>
                  <TableCell isTechnical>
                    {u.mfa_enabled ? (
                      <span className="inline-flex items-center gap-1 text-status-success font-mono text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" /> Ativado
                      </span>
                    ) : (
                      <span className="text-gov-text-muted font-mono text-[11px]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusChip label={statusChip(u).label} variant={statusChip(u).variant} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          title="Editar"
                          className="p-2 rounded-lg text-gov-primary hover:bg-gov-primary-light transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => { setDeactivating(u); setReason(''); }}
                            title="Desativar"
                            className="p-2 rounded-lg text-status-danger hover:bg-status-danger-bg transition-colors"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(u)}
                            title="Reativar"
                            className="p-2 rounded-lg text-status-success hover:bg-status-success-bg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border">
              <h2 className="text-lg font-bold text-[#0c326f]">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário do Município'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gov-text-muted hover:text-gov-text-primary">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={editingUser ? 'Nova senha' : 'Senha *'}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingUser}
                  helperText="Mín. 8 chars, maiúscula, minúscula, número e símbolo."
                />
                <Input
                  label="Confirmar senha"
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-gov-text-secondary mb-2">
                  Role *
                </label>
                <select
                  required
                  value={form.role_slug}
                  onChange={(e) => setForm({ ...form, role_slug: e.target.value })}
                  className="w-full h-12 px-4 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary font-mono text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
                >
                  <option value="">— Selecione a role —</option>
                  {TENANT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gov-border">
                <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" isLoading={saving}>
                  {editingUser ? 'Atualizar' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deactivating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border">
              <h2 className="text-lg font-bold text-status-danger">Desativar Usuário</h2>
              <button onClick={() => setDeactivating(null)} className="text-gov-text-muted hover:text-gov-text-primary">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gov-text-secondary">
                Desativar <strong className="font-mono">{deactivating.email}</strong>? O motivo é obrigatório e será registrado na auditoria.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Motivo da desativação (mín. 10 caracteres)..."
                className="w-full px-4 py-3 rounded-lg border border-gov-border bg-gov-surface text-gov-text-primary text-sm focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-gov-border">
                <Button variant="ghost" onClick={() => setDeactivating(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={() => handleDeactivate(deactivating)}>
                  Desativar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
