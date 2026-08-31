import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, Users, UserCheck, Briefcase, Layers, X } from 'lucide-react';
import { accessApi, AccessCategory, AccessGroup, AccessGroupAccess, AccessUser } from '../AccessApi';
import { ModuleAccessPicker } from './ModuleAccessPicker';
import { OrgUnitNode } from '../AccessApi';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface GroupsManagementProps {
  modules: { alias: string; name: string }[];
  units: OrgUnitNode[];
  notify: (t: any) => void;
}

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

export const GroupsManagement: React.FC<GroupsManagementProps> = ({ modules, units, notify }) => {
  const [categories, setCategories] = useState<AccessCategory[]>([]);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [catModal, setCatModal] = useState<{ edit?: AccessCategory } | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [groupModal, setGroupModal] = useState<{ edit?: AccessGroup } | null>(null);
  const [gName, setGName] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gCategory, setGCategory] = useState<number | ''>('');
  const [gAccesses, setGAccesses] = useState<AccessGroupAccess[]>([]);
  const [showUsers, setShowUsers] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<AccessUser[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, g, u] = await Promise.all([accessApi.categories(), accessApi.groups(), accessApi.users()]);
      setCategories(c); setGroups(g); setAllUsers(u.items);
    } catch { notify({ type: 'error', title: 'Erro', message: 'Falha ao carregar grupos e categorias.' }); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const saveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (catModal?.edit) await accessApi.updateCategory(catModal.edit.id, { name: catName.trim(), description: catDesc.trim() || null });
      else await accessApi.createCategory({ name: catName.trim(), description: catDesc.trim() || null });
      notify({ type: 'success', title: 'Salvo', message: 'Categoria salva.' }); setCatModal(null); load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const deleteCategory = async (c: AccessCategory) => {
    if (!window.confirm(`Excluir categoria "${c.name}"? Grupos ficarão sem categoria.`)) return;
    try { await accessApi.deleteCategory(c.id); load(); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.message }); }
  };

  const toggleUser = async (groupId: number, userId: number, isMember: boolean) => {
    try {
      if (isMember) { await accessApi.removeGroupUser(groupId, userId); }
      else { await accessApi.assignGroupUsers(groupId, [userId]); }
      notify({ type: 'success', title: isMember ? 'Removido' : 'Atribuído', message: 'Usuário atualizado.' });
      load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.message }); }
  };

  const openGroup = (g?: AccessGroup) => {
    setGName(g?.name ?? ''); setGDesc(g?.description ?? ''); setGCategory(g?.category_id ?? '');
    setGAccesses(g?.accesses ?? []);
    setGroupModal(g ? { edit: g } : {});
  };

  const saveGroup = async () => {
    if (!gName.trim()) return;
    try {
      const payload = { name: gName.trim(), description: gDesc.trim() || null, category_id: gCategory === '' ? null : gCategory, accesses: gAccesses };
      if (groupModal?.edit) await accessApi.updateGroup(groupModal.edit.id, payload);
      else await accessApi.createGroup(payload);
      notify({ type: 'success', title: 'Salvo', message: 'Grupo salvo.' }); setGroupModal(null); load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const deleteGroup = async (g: AccessGroup) => {
    if (!window.confirm(`Excluir grupo "${g.name}"?`)) return;
    try { await accessApi.deleteGroup(g.id); load(); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.message }); }
  };

  const updateAccess = (alias: string, patch: Partial<AccessGroupAccess>) => {
    setGAccesses((prev) => {
      const existing = prev.find((a) => a.module_alias === alias);
      if (!existing) return [...prev, { module_alias: alias, role: 'viewer', org_unit_ids: null, can_manage_users: false, can_create: false, can_edit: false, can_delete: false, valid_to: null, ...patch }];
      return prev.map((a) => (a.module_alias === alias ? { ...a, ...patch } : a));
    });
  };

  const categoryColumns: ColumnDef<AccessCategory, any>[] = [
    { id: 'name', header: 'Nome', accessorKey: 'name', cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span> },
    { id: 'groups_count', header: 'Grupos', cell: ({ row }) => <span className="text-muted-foreground">{row.original.groups_count ?? 0} grupos</span> },
    { id: 'description', header: 'Descrição', cell: ({ row }) => <span className="text-muted-foreground">{row.original.description ?? ''}</span> },
    {
      id: 'actions', header: 'Ações', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => { setCatName(row.original.name); setCatDesc(row.original.description ?? ''); setCatModal({ edit: row.original }); }} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => deleteCategory(row.original)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  const groupColumns: ColumnDef<AccessGroup, any>[] = [
    { id: 'name', header: 'Nome', accessorKey: 'name', cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span> },
    { id: 'details', header: 'Detalhes', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.category?.name ?? 'sem categoria'} · {row.original.accesses?.length ?? 0} módulos · {row.original.users_count ?? 0} usuários</span> },
    {
      id: 'actions', header: 'Ações', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setShowUsers(showUsers === row.original.id ? null : row.original.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Users className="h-4 w-4" /></button>
          <button onClick={() => openGroup(row.original)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => deleteGroup(row.original)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Categorias */}
      <Card noPadding className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Briefcase className="h-4 w-4 text-primary" /> Categorias
          </h3>
          <button onClick={() => { setCatName(''); setCatDesc(''); setCatModal({}); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="h-3.5 w-3.5" /> Nova Categoria
          </button>
        </div>
        <div className="p-3">
          <DataTable columns={categoryColumns} data={categories} loading={loading} emptyText="Nenhuma categoria." pageSize={10} />
        </div>
      </Card>

      {/* Grupos */}
      <Card noPadding className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Grupos de Acesso
          </h3>
          <button onClick={() => openGroup()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="h-3.5 w-3.5" /> Novo Grupo
          </button>
        </div>
        <div className="p-3">
          <DataTable columns={groupColumns} data={groups} loading={loading} emptyText="Nenhum grupo cadastrado." pageSize={10} />
        </div>
      </Card>

      {/* Modal categoria */}
      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal?.edit ? 'Editar Categoria' : 'Nova Categoria'} icon={<Briefcase className="h-5 w-5 text-primary" />} size="sm"
        footer={
          <>
            <button onClick={() => setCatModal(null)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancelar</button>
            <button onClick={saveCategory} disabled={!catName.trim()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            <input value={catName} onChange={(e) => setCatName(e.target.value)} className={inputCls} placeholder="Ex.: Licitações" />
          </Field>
          <Field label="Descrição">
            <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className={inputCls} placeholder="Descrição opcional" />
          </Field>
        </div>
      </Modal>

      {/* Modal grupo */}
      <Modal open={!!groupModal} onClose={() => setGroupModal(null)} title={groupModal?.edit ? 'Editar Grupo' : 'Novo Grupo'} icon={<Layers className="h-5 w-5 text-primary" />} size="xl"
        footer={
          <>
            <button onClick={() => setGroupModal(null)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancelar</button>
            <button onClick={saveGroup} disabled={!gName.trim()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" required>
              <input value={gName} onChange={(e) => setGName(e.target.value)} className={inputCls} placeholder="Ex.: Grupo de Licitações" />
            </Field>
            <Field label="Categoria">
              <select value={gCategory} onChange={(e) => setGCategory(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descrição">
            <input value={gDesc} onChange={(e) => setGDesc(e.target.value)} className={inputCls} placeholder="Descrição opcional" />
          </Field>

          <div className="border-t border-border pt-4">
            <h4 className="mb-2 text-xs font-bold text-foreground">Acessos do grupo (por módulo)</h4>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {modules.map((m) => {
                const acc = gAccesses.find((a) => a.module_alias === m.alias);
                return (
                  <div key={m.alias} className="rounded-xl border border-border p-3">
                    <label className="mb-2 flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={!!acc} onChange={(e) => { if (!e.target.checked) setGAccesses((p) => p.filter((a) => a.module_alias !== m.alias)); else updateAccess(m.alias, {}); }} className="accent-primary" />
                      <span className="text-xs font-bold text-foreground">{m.name}</span>
                    </label>
                    {acc && (
                      <ModuleAccessPicker
                        units={units}
                        selectedIds={acc.org_unit_ids ?? []}
                        onChange={(ids) => updateAccess(m.alias, { org_unit_ids: ids })}
                        allSelected={acc.org_unit_ids === null}
                        onToggleAll={() => updateAccess(m.alias, { org_unit_ids: acc.org_unit_ids === null ? [] : null })}
                        canManageUsers={acc.can_manage_users}
                        onToggleManageUsers={(v) => updateAccess(m.alias, { can_manage_users: v })}
                        role={acc.role}
                        onRoleChange={(r) => updateAccess(m.alias, { role: r })}
                        canCreate={acc.can_create}
                        canEdit={acc.can_edit}
                        canDelete={acc.can_delete}
                        onPermissionChange={(perm, v) => updateAccess(m.alias, { [perm]: v })}
                        validTo={acc.valid_to ?? undefined}
                        onValidToChange={(v) => updateAccess(m.alias, { valid_to: v })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal atribuir usuários */}
      {showUsers !== null && (() => {
        const group = groups.find((g) => g.id === showUsers);
        if (!group) return null;
        const members = (group as AccessGroup & { users?: { id: number }[] }).users?.map((u) => u.id) ?? [];
        const filtered = allUsers.filter((u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
        return (
          <Modal open={!!showUsers} onClose={() => setShowUsers(null)} title={`Usuários do grupo: ${group.name}`} icon={<UserCheck className="h-5 w-5 text-primary" />} size="lg"
            footer={
              <button onClick={() => setShowUsers(null)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Fechar</button>
            }
          >
            <div className="space-y-3">
              <div className="relative">
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar usuário..." className={inputCls} />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {filtered.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</p>}
                {filtered.map((u) => {
                  const isMember = members.includes(u.id);
                  return (
                    <label key={u.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/60">
                      <div>
                        <p className="text-xs font-medium text-foreground">{u.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      <input type="checkbox" checked={isMember} onChange={() => toggleUser(group.id, u.id, isMember)} className="h-4 w-4 accent-primary" />
                    </label>
                  );
                })}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};