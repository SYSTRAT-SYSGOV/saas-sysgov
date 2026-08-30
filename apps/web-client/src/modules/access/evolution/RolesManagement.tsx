import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check, ShieldCheck } from 'lucide-react';
import { accessApi, TenantRole, TenantPermission } from '../AccessApi';

interface RolesManagementProps {
  notify: (t: any) => void;
}

/**
 * Tela de Roles e Permissões do tenant (client SaaS).
 * Permite criar/editar/excluir roles e atribuir permissões (modular).
 */
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

  const openCreate = () => { setName(''); setSlug(''); setDescription(''); setSelectedPerms([]); setModal({}); };
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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gov-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-gov-text-primary flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gov-primary" /> Roles & Permissões
        </h3>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-gov-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Nova Role
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gov-primary" /></div>
        : roles.length === 0 ? <p className="text-center text-gov-text-muted py-12 text-xs">Nenhuma role cadastrada.</p>
        : <table className="w-full text-xs">
            <thead><tr className="text-left text-gov-text-muted uppercase tracking-wider text-[10px] border-b border-gov-border">
              <th className="py-3 px-4">Role</th><th className="py-3 px-4">Slug</th><th className="py-3 px-4">Permissões</th><th className="py-3 px-4">Sistema</th><th className="py-3 px-4 text-right">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-gov-border">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4"><span className="font-medium text-gov-text-primary">{role.name}</span>{role.description ? <span className="block text-[10px] text-gov-text-muted">{role.description}</span> : null}</td>
                  <td className="py-3 px-4 font-mono text-gov-text-secondary">{role.slug}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {role.permissions.slice(0, 4).map((p) => <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gov-primary/10 text-gov-primary font-mono">{p.slug}</span>)}
                      {role.permissions.length > 4 && <span className="text-[10px] text-gov-text-muted">+{role.permissions.length - 4}</span>}
                      {role.permissions.length === 0 && <span className="text-[10px] text-gov-text-muted">—</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">{role.is_system ? 'Sim' : 'Não'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(role)} className="p-1.5 text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(role)} disabled={role.is_system} className="p-1.5 text-gov-text-secondary hover:text-rose-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{modal.edit ? 'Editar Role' : 'Nova Role'}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gov-text-muted" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div><label className="block text-xs font-semibold mb-1">Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" placeholder="Ex.: Gestor de Licitações" /></div>
              <div><label className="block text-xs font-semibold mb-1">Slug *</label>
                <input value={slug} disabled={modal.edit?.is_system} onChange={(e) => handleSlug(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono" placeholder="gestor_licitacoes" /></div>
            </div>
            <div><label className="block text-xs font-semibold mb-1">Descrição</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm mb-4" /></div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gov-text-primary">Permissões ({selectedPerms.length} selecionadas)</h4>
              <select value={permFilter} onChange={(e) => setPermFilter(e.target.value)} className="text-xs px-2 py-1 border border-gov-border rounded-lg">
                <option value="">Todos os módulos</option>
                {modules.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="max-h-56 overflow-y-auto border border-gov-border rounded-lg p-2 space-y-1">
              {filteredPerms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-gov-primary/5 rounded">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="accent-gov-primary" />
                  <span className="font-medium text-gov-text-primary">{p.name}</span>
                  <span className="text-[10px] text-gov-text-muted font-mono">{p.slug} · {p.module ?? 'admin'}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gov-border mt-4">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-xs border border-gov-border rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-xs bg-gov-primary text-white rounded-lg"><Check className="w-3.5 h-3.5 inline" /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};