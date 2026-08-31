import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, Loader2,
  LayoutGrid, X, GripVertical, ArrowRight, FolderTree, Lock,
} from 'lucide-react';
import { apiClient } from '@/core/api/client';
import { MenuGroup, MenuItem } from './MenuApi';

interface Toast { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string; }

interface ModuleTemplate { label: string; route: string; icon: string; permission: string; }

const MODULE_TEMPLATES: Record<string, ModuleTemplate> = {
  dashboard: { label: 'Painel Geral', route: '/', icon: 'LayoutDashboard', permission: 'dashboard.view' },
  org: { label: 'Organograma Municipal', route: '/organograma', icon: 'Network', permission: 'org.view' },
  procurement: { label: 'Licitações', route: '/licitacoes', icon: 'FileText', permission: 'procurement.view' },
  contracts: { label: 'Contratos', route: '/contratos', icon: 'FileSignature', permission: 'contracts.view' },
  finance: { label: 'Execução Financeira', route: '/financeiro', icon: 'Coins', permission: 'finance.view' },
  pedagogico: { label: 'Módulo Pedagógico', route: '/pedagogico', icon: 'GraduationCap', permission: 'pedagogico.view' },
  rh: { label: 'Recursos Humanos / Folha', route: '/rh', icon: 'Users', permission: 'rh.view' },
  cemiterios: { label: 'Gestão de Cemitérios', route: '/cemiterios', icon: 'Cross', permission: 'cemiterios.view' },
  users: { label: 'Usuários e Acessos', route: '/usuarios', icon: 'Users', permission: 'users.manage' },
};

interface GroupFormData { name: string; slug: string; icon: string; }
interface ItemFormData { label: string; route: string; icon: string; permission: string; shortcut: string; module_alias: string; parent_id: number | null; }
const EMPTY_GROUP: GroupFormData = { name: '', slug: '', icon: '' };
const EMPTY_ITEM: ItemFormData = { label: '', route: '', icon: '', permission: '', shortcut: '', module_alias: '', parent_id: null };

type DragState = { type: 'item'; itemId: number; groupId: number; parentId: number | null } | null;

export const MenuManager: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormData>(EMPTY_GROUP);
  const [groupSaving, setGroupSaving] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingItemGroupId, setEditingItemGroupId] = useState<number>(0);
  const [itemForm, setItemForm] = useState<ItemFormData>(EMPTY_ITEM);
  const [itemSaving, setItemSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [dragState, setDragState] = useState<DragState>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<number | null>(null);
  const [dropTargetParentId, setDropTargetParentId] = useState<number | null>(null);
  const [tenantModules, setTenantModules] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, modRes] = await Promise.all([
        apiClient.get<{ data: MenuGroup[] }>('/client/menus'),
        apiClient.get<{ data: string[] }>('/client/modules'),
      ]);
      setGroups(Array.isArray(menuRes.data?.data) ? menuRes.data.data : []);
      setTenantModules(Array.isArray(modRes.data?.data) ? modRes.data.data : []);
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao carregar', message: e?.response?.data?.message || e?.message || 'Não foi possível carregar os menus.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleGroup = (id: number) => setExpandedGroups((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleItem = (id: number) => setExpandedItems((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openCreateGroup = () => { setEditingGroup(null); setGroupForm(EMPTY_GROUP); setGroupModalOpen(true); };
  const openEditGroup = (g: MenuGroup) => { setEditingGroup(g); setGroupForm({ name: g.name, slug: g.slug, icon: g.icon ?? '' }); setGroupModalOpen(true); };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim() || !groupForm.slug.trim()) { notify({ type: 'warning', title: 'Campos obrigatórios', message: 'Nome e slug são obrigatórios.' }); return; }
    setGroupSaving(true);
    try {
      if (editingGroup) {
        await apiClient.put(`/client/menus/groups/${editingGroup.id}`, { name: groupForm.name, slug: groupForm.slug, icon: groupForm.icon || null });
        notify({ type: 'success', title: 'Grupo atualizado', message: `"${groupForm.name}" foi salvo.` });
      } else {
        await apiClient.post('/client/menus/groups', { name: groupForm.name, slug: groupForm.slug, icon: groupForm.icon || null });
        notify({ type: 'success', title: 'Grupo criado', message: `"${groupForm.name}" foi criado.` });
      }
      setGroupModalOpen(false);
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao salvar', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' });
    } finally { setGroupSaving(false); }
  };

  const handleDeleteGroup = async (g: MenuGroup) => {
    if (!window.confirm(`Excluir o grupo "${g.name}" e todos os seus itens?`)) return;
    try {
      await apiClient.delete(`/client/menus/groups/${g.id}`);
      notify({ type: 'success', title: 'Grupo excluído', message: `"${g.name}" foi removido.` });
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao excluir', message: e?.response?.data?.message || e?.message || 'Erro ao excluir.' });
    }
  };

  const openCreateItem = (groupId: number, parentId: number | null = null) => {
    setEditingItem(null);
    setEditingItemGroupId(groupId);
    setItemForm({ ...EMPTY_ITEM, parent_id: parentId });
    setItemModalOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditingItemGroupId(item.menu_group_id);
    setItemForm({
      label: item.label,
      route: item.route,
      icon: item.icon ?? '',
      permission: item.permission ?? '',
      shortcut: item.shortcut ?? '',
      module_alias: item.module_alias ?? '',
      parent_id: (item as any).parent_id ?? null,
    });
    setItemModalOpen(true);
  };

  const handleModuleChange = (moduleAlias: string) => {
    const tmpl = MODULE_TEMPLATES[moduleAlias];
    if (tmpl) {
      setItemForm((prev) => ({
        ...prev,
        module_alias: moduleAlias,
        label: tmpl.label,
        route: tmpl.route,
        icon: tmpl.icon,
        permission: tmpl.permission,
      }));
    } else {
      setItemForm((prev) => ({ ...prev, module_alias: moduleAlias, label: '', route: '', icon: '', permission: '' }));
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.label.trim() || !itemForm.route.trim()) { notify({ type: 'warning', title: 'Campos obrigatórios', message: 'Rótulo e rota são obrigatórios.' }); return; }
    setItemSaving(true);
    try {
      const payload = {
        menu_group_id: editingItemGroupId,
        parent_id: itemForm.parent_id,
        label: itemForm.label,
        route: itemForm.route,
        icon: itemForm.icon || null,
        permission: itemForm.permission || null,
        shortcut: itemForm.shortcut || null,
        module_alias: itemForm.module_alias || null,
      };
      if (editingItem) {
        await apiClient.put(`/client/menus/items/${editingItem.id}`, payload);
        notify({ type: 'success', title: 'Item atualizado', message: `"${itemForm.label}" foi salvo.` });
      } else {
        await apiClient.post('/client/menus/items', payload);
        notify({ type: 'success', title: 'Item criado', message: `"${itemForm.label}" foi criado.` });
      }
      setItemModalOpen(false);
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao salvar', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' });
    } finally { setItemSaving(false); }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Excluir o item "${item.label}" e seus sub-itens?`)) return;
    try {
      await apiClient.delete(`/client/menus/items/${item.id}`);
      notify({ type: 'success', title: 'Item excluído', message: `"${item.label}" foi removido.` });
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao excluir', message: e?.response?.data?.message || e?.message || 'Erro ao excluir.' });
    }
  };

  // Drag handlers
  const handleDragStart = (groupId: number, itemId: number, parentId: number | null) => {
    setDragState({ type: 'item', itemId, groupId, parentId });
  };

  const handleDragOverGroup = (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    setDropTargetGroupId(groupId);
    setDropTargetParentId(null);
  };

  const handleDragOverItem = (e: React.DragEvent, groupId: number, itemId: number, parentId: number | null) => {
    e.preventDefault();
    setDropTargetGroupId(groupId);
    setDropTargetParentId(parentId);
  };

  const handleDropOnGroup = async (targetGroupId: number) => {
    if (!dragState || dragState.type !== 'item') return;
    const { itemId, parentId } = dragState;

    setSavingOrder(true);
    try {
      await apiClient.put('/client/menus/reorder', {
        items: [{ id: itemId, menu_group_id: targetGroupId, parent_id: parentId, order: 0 }],
      });
      notify({ type: 'success', title: 'Item movido', message: 'Item movido para o grupo.' });
      setDragState(null);
      setDropTargetGroupId(null);
      setDropTargetParentId(null);
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao mover', message: e?.response?.data?.message || e?.message || 'Erro ao mover item.' });
    } finally { setSavingOrder(false); }
  };

  const handleDropOnItem = async (targetGroupId: number, targetItemId: number) => {
    if (!dragState || dragState.type !== 'item') return;
    const { itemId } = dragState;

    setSavingOrder(true);
    try {
      await apiClient.put('/client/menus/reorder', {
        items: [{ id: itemId, menu_group_id: targetGroupId, parent_id: targetItemId, order: 0 }],
      });
      notify({ type: 'success', title: 'Sub-item criado', message: 'Item movido para dentro do item pai.' });
      setDragState(null);
      setDropTargetGroupId(null);
      setDropTargetParentId(null);
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao mover', message: e?.response?.data?.message || e?.message || 'Erro ao criar sub-item.' });
    } finally { setSavingOrder(false); }
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTargetGroupId(null);
    setDropTargetParentId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gov-primary" /></div>;

  const moduleOptions = Object.entries(MODULE_TEMPLATES)
    .filter(([key]) => tenantModules.includes(key))
    .map(([key, val]) => ({ value: key, label: val.label }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0c326f]">Gerenciador de Menus</h1>
          <p className="text-xs text-gov-text-secondary mt-1">Arraste itens para outro grupo ou solte sobre um item para criar sub-item.</p>
        </div>
        <div className="flex gap-2">
          {savingOrder && <Loader2 className="w-5 h-5 animate-spin text-gov-primary" />}
          <button onClick={openCreateGroup} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Grupo
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gov-border rounded-xl text-gov-text-muted">Nenhum grupo de menu cadastrado.</div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const items = (group.items ?? []).filter((i) => !(i as any).parent_id);
            const isDropTarget = dropTargetGroupId === group.id && dropTargetParentId === null;

            return (
              <div
                key={group.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border-2 transition-colors overflow-hidden ${isDropTarget ? 'border-dashed border-gov-primary' : 'border-gov-border'}`}
                onDragOver={(e) => handleDragOverGroup(e, group.id)}
                onDragLeave={() => setDropTargetGroupId((p) => (p === group.id ? null : p))}
                onDrop={(e) => { e.preventDefault(); if (dragState) handleDropOnGroup(group.id); }}
              >
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gov-border bg-slate-50 dark:bg-slate-800/50">
                  <button onClick={() => toggleGroup(group.id)} className="text-gov-text-secondary hover:text-gov-primary transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <LayoutGrid className="w-4 h-4 text-gov-primary" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gov-text-primary">{group.name}</span>
                    <span className="ml-2 text-[10px] font-mono text-gov-text-muted">/{group.slug}</span>
                    {isDropTarget && <span className="ml-2 text-[10px] text-gov-primary font-bold">← Solte aqui</span>}
                  </div>
                  <span className="text-[10px] text-gov-text-muted">{items.length} item(s)</span>
                  <button onClick={() => openCreateItem(group.id)} className="p-1.5 rounded-lg text-gov-text-secondary hover:text-emerald-600 hover:bg-emerald-50" title="Adicionar item"><Plus className="w-4 h-4" /></button>
                  <button onClick={() => openEditGroup(group)} className="p-1.5 rounded-lg text-gov-text-secondary hover:text-gov-primary hover:bg-gov-primary/5" title="Editar grupo"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteGroup(group)} className="p-1.5 rounded-lg text-gov-text-secondary hover:text-rose-600 hover:bg-rose-50" title="Excluir grupo"><Trash2 className="w-4 h-4" /></button>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-gov-border/60">
                    {items.length === 0 ? (
                      <div className="px-6 py-4 text-xs text-gov-text-muted">Nenhum item neste grupo.</div>
                    ) : items.map((item) => {
                      const children = (item as any).children ?? [];
                      const isItemExpanded = expandedItems.has(item.id);
                      const isItemDropTarget = dropTargetGroupId === group.id && dropTargetParentId === item.id;

                      return (
                        <div key={item.id}>
                          <div
                            className={`flex items-center gap-2 px-6 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors ${isItemDropTarget ? 'bg-gov-primary/10 border-l-2 border-gov-primary' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(group.id, item.id, null)}
                            onDragOver={(e) => handleDragOverItem(e, group.id, item.id, null)}
                            onDrop={(e) => { e.preventDefault(); if (dragState) handleDropOnItem(group.id, item.id); }}
                            onDragEnd={handleDragEnd}
                          >
                            <GripVertical className="w-3.5 h-3.5 text-gov-text-muted shrink-0" />
                            <FolderTree className="w-3.5 h-3.5 text-gov-text-muted shrink-0" />
                            <span className="text-sm text-gov-text-primary flex-1">{item.label}</span>
                            <span className="text-[10px] font-mono text-gov-text-muted">{item.route}</span>
                            {item.permission && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">{item.permission}</span>}
                            {item.module_alias && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">{item.module_alias}</span>}
                            <button onClick={() => openCreateItem(group.id, item.id)} className="p-1 rounded text-gov-text-secondary hover:text-emerald-600" title="Criar sub-item"><ArrowRight className="w-3.5 h-3.5" /></button>
                            {children.length > 0 && (
                              <button onClick={() => toggleItem(item.id)} className="p-1 rounded text-gov-text-secondary hover:text-gov-primary">
                                {isItemExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button onClick={() => openEditItem(item)} className="p-1 rounded text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteItem(item)} className="p-1 rounded text-gov-text-secondary hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>

                          {isItemExpanded && children.length > 0 && (
                            <div className="pl-12 pr-6 pb-2 space-y-1">
                              {children.map((child: any) => (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  draggable
                                  onDragStart={() => handleDragStart(group.id, child.id, item.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <GripVertical className="w-3 h-3 text-gov-text-muted shrink-0" />
                                  <span className="text-sm text-gov-text-secondary flex-1">{child.label}</span>
                                  <span className="text-[10px] font-mono text-gov-text-muted">{child.route}</span>
                                  {child.permission && <span className="text-[10px] font-mono px-1 py-0.5 bg-amber-50 text-amber-600 rounded">{child.permission}</span>}
                                  <button onClick={() => openEditItem(child)} className="p-1 rounded text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-3 h-3" /></button>
                                  <button onClick={() => handleDeleteItem(child)} className="p-1 rounded text-gov-text-secondary hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Grupo */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border">
              <h2 className="text-lg font-bold text-[#0c326f]">{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h2>
              <button onClick={() => setGroupModalOpen(false)} className="text-gov-text-muted hover:text-gov-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Nome *</label>
                <input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ex.: GESTÃO FISCAL" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Slug *</label>
                <input value={groupForm.slug} onChange={(e) => setGroupForm({ ...groupForm, slug: e.target.value })} placeholder="gestao-fiscal" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Ícone (Lucide)</label>
                <input value={groupForm.icon} onChange={(e) => setGroupForm({ ...groupForm, icon: e.target.value })} placeholder="ShieldCheck" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gov-border">
              <button onClick={() => setGroupModalOpen(false)} className="px-4 py-2 text-sm border border-gov-border rounded-lg text-gov-text-secondary">Cancelar</button>
              <button onClick={handleSaveGroup} disabled={groupSaving} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gov-primary text-white rounded-lg disabled:opacity-50">
                {groupSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border">
              <h2 className="text-lg font-bold text-[#0c326f]">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setItemModalOpen(false)} className="text-gov-text-muted hover:text-gov-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Módulo (auto-preenche)
                  </label>
                  <select
                    value={itemForm.module_alias}
                    onChange={(e) => handleModuleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm"
                  >
                    <option value="">-- Selecione um módulo --</option>
                    {moduleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Módulo</label>
                  <input value={itemForm.module_alias || ''} readOnly className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono bg-slate-50 text-gov-text-muted" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1 flex items-center gap-1">
                  Rótulo * {itemForm.module_alias && !editingItem && <Lock className="w-3 h-3 text-gov-text-muted" />}
                </label>
                <input
                  value={itemForm.label}
                  onChange={(e) => setItemForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Ex.: Cadastro de Convênios"
                  readOnly={!!itemForm.module_alias && !editingItem}
                  className={`w-full px-3 py-2 border border-gov-border rounded-lg text-sm ${itemForm.module_alias && !editingItem ? 'bg-slate-50 text-gov-text-muted cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1 flex items-center gap-1">
                  Rota * {itemForm.module_alias && !editingItem && <Lock className="w-3 h-3 text-gov-text-muted" />}
                </label>
                <input
                  value={itemForm.route}
                  onChange={(e) => setItemForm((p) => ({ ...p, route: e.target.value }))}
                  placeholder="/convenios"
                  readOnly={!!itemForm.module_alias && !editingItem}
                  className={`w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono ${itemForm.module_alias && !editingItem ? 'bg-slate-50 text-gov-text-muted cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary mb-1 flex items-center gap-1">
                    Ícone {itemForm.module_alias && !editingItem && <Lock className="w-3 h-3 text-gov-text-muted" />}
                  </label>
                  <input
                    value={itemForm.icon}
                    onChange={(e) => setItemForm((p) => ({ ...p, icon: e.target.value }))}
                    placeholder="FileText"
                    readOnly={!!itemForm.module_alias && !editingItem}
                    className={`w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono ${itemForm.module_alias && !editingItem ? 'bg-slate-50 text-gov-text-muted cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Atalho</label>
                  <input value={itemForm.shortcut} onChange={(e) => setItemForm((p) => ({ ...p, shortcut: e.target.value }))} placeholder="C" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1 flex items-center gap-1">
                  Permissão {itemForm.module_alias && !editingItem && <Lock className="w-3 h-3 text-gov-text-muted" />}
                </label>
                <input
                  value={itemForm.permission}
                  onChange={(e) => setItemForm((p) => ({ ...p, permission: e.target.value }))}
                  placeholder="convênio.criar"
                  readOnly={!!itemForm.module_alias && !editingItem}
                  className={`w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono ${itemForm.module_alias && !editingItem ? 'bg-slate-50 text-gov-text-muted cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gov-border">
              <button onClick={() => setItemModalOpen(false)} className="px-4 py-2 text-sm border border-gov-border rounded-lg text-gov-text-secondary">Cancelar</button>
              <button onClick={handleSaveItem} disabled={itemSaving} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gov-primary text-white rounded-lg disabled:opacity-50">
                {itemSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t, i) => (
          <div key={i} className={`px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm ${
            t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'error' ? 'bg-rose-600 text-white' : t.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
          }`}>
            <strong className="block text-xs font-bold uppercase">{t.title}</strong>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuManager;