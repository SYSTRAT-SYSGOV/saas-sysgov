import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check, Users } from 'lucide-react';
import { accessApi, AccessCategory, AccessGroup, AccessGroupAccess } from '../AccessApi';
import { ModuleAccessPicker } from './ModuleAccessPicker';
import { OrgUnitNode } from '../AccessApi';

interface GroupsManagementProps {
  modules: { alias: string; name: string }[];
  units: OrgUnitNode[];
  notify: (t: any) => void;
}

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, g] = await Promise.all([accessApi.categories(), accessApi.groups()]);
      setCategories(c); setGroups(g);
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

  return (
    <div className="space-y-5">
      {/* Categorias */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gov-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gov-text-primary">Categorias</h3>
          <button onClick={() => { setCatName(''); setCatDesc(''); setCatModal({}); }} className="inline-flex items-center gap-1.5 bg-gov-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nova Categoria
          </button>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gov-primary" /></div>
          : categories.length === 0 ? <p className="text-center text-gov-text-muted py-8 text-xs">Nenhuma categoria.</p>
          : <ul className="divide-y divide-gov-border">
            {categories.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div><p className="text-xs font-medium text-gov-text-primary">{c.name}</p><p className="text-[10px] text-gov-text-muted">{c.groups_count ?? 0} grupos · {c.description ?? ''}</p></div>
                <div className="flex gap-1">
                  <button onClick={() => { setCatName(c.name); setCatDesc(c.description ?? ''); setCatModal({ edit: c }); }} className="p-1.5 text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteCategory(c)} className="p-1.5 text-gov-text-secondary hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>}
      </div>

      {/* Grupos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gov-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-gov-text-primary">Grupos de Acesso</h3>
          <button onClick={() => openGroup()} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Novo Grupo
          </button>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gov-primary" /></div>
          : groups.length === 0 ? <p className="text-center text-gov-text-muted py-8 text-xs">Nenhum grupo cadastrado.</p>
          : <ul className="divide-y divide-gov-border">
            {groups.map((g) => (
              <li key={g.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gov-text-primary">{g.name}</p>
                  <p className="text-[10px] text-gov-text-muted">{g.category?.name ?? 'sem categoria'} · {g.accesses?.length ?? 0} módulos · {g.users_count ?? 0} usuários</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setShowUsers(showUsers === g.id ? null : g.id)} className="p-1.5 text-gov-text-secondary hover:text-gov-primary"><Users className="w-4 h-4" /></button>
                  <button onClick={() => openGroup(g)} className="p-1.5 text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteGroup(g)} className="p-1.5 text-gov-text-secondary hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>}
      </div>

      {/* Modal categoria */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{catModal.edit ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setCatModal(null)}><X className="w-5 h-5 text-gov-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold mb-1">Nome *</label><input value={catName} onChange={(e) => setCatName(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold mb-1">Descrição</label><input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setCatModal(null)} className="px-4 py-2 text-xs border border-gov-border rounded-lg">Cancelar</button>
                <button onClick={saveCategory} className="px-4 py-2 text-xs bg-gov-primary text-white rounded-lg"><Check className="w-3.5 h-3.5 inline" /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal grupo */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{groupModal.edit ? 'Editar Grupo' : 'Novo Grupo'}</h3>
              <button onClick={() => setGroupModal(null)}><X className="w-5 h-5 text-gov-text-muted" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs font-semibold mb-1">Nome *</label><input value={gName} onChange={(e) => setGName(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold mb-1">Categoria</label>
                <select value={gCategory} onChange={(e) => setGCategory(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm">
                  <option value="">Sem categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="block text-xs font-semibold mb-1">Descrição</label><input value={gDesc} onChange={(e) => setGDesc(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm mb-3" /></div>

            <h4 className="text-xs font-bold text-gov-text-primary mb-2">Acessos do grupo (por módulo)</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {modules.map((m) => {
                const acc = gAccesses.find((a) => a.module_alias === m.alias);
                return (
                  <div key={m.alias} className="border border-gov-border rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" checked={!!acc} onChange={(e) => { if (!e.target.checked) setGAccesses((p) => p.filter((a) => a.module_alias !== m.alias)); else updateAccess(m.alias, {}); }} className="accent-gov-primary" />
                      <span className="text-xs font-bold">{m.name}</span>
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

            <div className="flex justify-end gap-2 pt-4 border-t border-gov-border mt-4">
              <button onClick={() => setGroupModal(null)} className="px-4 py-2 text-xs border border-gov-border rounded-lg">Cancelar</button>
              <button onClick={saveGroup} disabled={!gName.trim()} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg disabled:opacity-50"><Check className="w-3.5 h-3.5 inline" /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};