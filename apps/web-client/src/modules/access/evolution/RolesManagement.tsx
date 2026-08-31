import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, ShieldCheck, Filter } from 'lucide-react';
import { accessApi, TenantRole, TenantPermission } from '../AccessApi';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

interface RolesManagementProps {
  notify: (t: any) => void;
}

export const RolesManagement: React.FC<RolesManagementProps> = ({ notify }) => {
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [permissions, setPermissions] = useState<TenantPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ edit?: TenantRole } | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [permFilter, setPermFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([accessApi.tenantRoles(), accessApi.tenantPermissions()]);
      setRoles(r); setPermissions(p);
    } catch { notify({ type: 'error', title: 'Erro', message: 'Falha ao carregar roles e permissões.' }); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setName(''); setSlug(''); setDescription(''); setSelectedPerms([]); setPermFilter(''); setModal({}); };
  const openEdit = (role: TenantRole) => {
    setName(role.name); setSlug(role.slug); setDescription(role.description ?? '');
    setSelectedPerms(role.permissions.map((p) => p.id)); setModal({ edit: role });
  };

  const handleSlug = (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''));

  const togglePerm = (id: number) => setSelectedPerms((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) { notify({ type: 'warning', title: 'Campos obrigatórios', message: 'Nome e slug são obrigatórios.' }); return; }
    try {
      if (modal?.edit) {
        await accessApi.updateTenantRole(modal.edit.id, { name: name.trim(), description: description.trim() || null, permission_ids: selectedPerms });
        notify({ type: 'success', title: 'Atualizado', message: 'Role atualizada.' });
      } else {
        await accessApi.createTenantRole({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, permission_ids: selectedPerms });
        notify({ type: 'success', title: 'Criada', message: 'Role criada.' });
      }
      setModal(null); load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' }); }
  };

  const handleDelete = async (role: TenantRole) => {
    if (!window.confirm(`Excluir role "${role.name}"?`)) return;
    try { await accessApi.deleteTenantRole(role.id); notify({ type: 'success', title: 'Excluída', message: 'Role removida.' }); load(); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const modules = [...new Set(permissions.map((p) => p.module ?? 'admin'))].sort();
  const filteredPerms = permissions.filter((p) => !permFilter || (p.module ?? 'admin') === permFilter);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Roles & Permissões
        </h3>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="h-3.5 w-3.5" /> Nova Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : roles.length === 0 ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Nenhuma role cadastrada.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left uppercase tracking-wider text-[10px] text-muted-foreground">
              <th className="py-3 pl-4 font-semibold">Role</th>
              <th className="py-3 font-semibold">Slug</th>
              <th className="py-3 font-semibold">Permissões</th>
              <th className="py-3 font-semibold">Sistema</th>
              <th className="py-3 pr-4 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roles.map((role) => (
              <tr key={role.id} className="transition-colors hover:bg-accent/40">
                <td className="py-3 pl-4">
                  <span className="font-medium text-foreground">{role.name}</span>
                  {role.description ? <span className="block text-[10px] text-muted-foreground">{role.description}</span> : null}
                </td>
                <td className="py-3 font-mono text-muted-foreground">{role.slug}</td>
                <td className="py-3">
                  <div className="flex max-w-xs flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map((p) => <Badge key={p.id} variant="primary"><span className="font-mono">{p.slug}</span></Badge>)}
                    {role.permissions.length > 4 && <span className="text-[10px] text-muted-foreground">+{role.permissions.length - 4}</span>}
                    {role.permissions.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="py-3">{role.is_system ? <Badge variant="warning">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</td>
                <td className="py-3 pr-4 text-right">
                  <button onClick={() => openEdit(role)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(role)} disabled={role.is_system} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.edit ? 'Editar Role' : 'Nova Role'}
        icon={<ShieldCheck className="h-5 w-5 text-primary" />}
        size="xl"
        footer={
          <>
            <button onClick={() => setModal(null)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancelar</button>
            <button onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Gestor de Licitações" />
            </Field>
            <Field label="Slug" required hint="Identificador único, minúsculo">
              <input value={slug} disabled={modal?.edit?.is_system} onChange={(e) => handleSlug(e.target.value)} className={inputCls} placeholder="gestor_licitacoes" />
            </Field>
          </div>
          <Field label="Descrição">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Descrição opcional" />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="primary">Permissões ({selectedPerms.length} selecionadas)</Badge>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select value={permFilter} onChange={(e) => setPermFilter(e.target.value)} className="rounded-lg border border-input px-2 py-1 text-xs">
                  <option value="">Todos os módulos</option>
                  {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-input p-2">
              {filteredPerms.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhuma permissão neste módulo.</p>}
              {filteredPerms.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs transition-colors hover:bg-accent">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="accent-primary" />
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.slug} · {p.module ?? 'admin'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
};