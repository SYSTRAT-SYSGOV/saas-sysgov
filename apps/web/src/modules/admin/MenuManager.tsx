import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Search,
  FolderTree,
  ShieldAlert,
  GripVertical,
  X,
  Save,
} from 'lucide-react';
import { MenuGroup, MenuItem } from './types';
import { adminApi } from './api';

const DEFAULT_MENUS: MenuGroup[] = [
  {
    id: 1,
    name: 'PAINEL PRINCIPAL',
    slug: 'painel-principal',
    icon: 'LayoutDashboard',
    order: 1,
    is_active: true,
    items: [
      { id: 1, label: 'Visão Geral & KPIs', route: '/admin/dashboard', icon: 'LayoutDashboard', shortcut: '1', module_alias: 'dashboard', order: 1, is_active: true },
      { id: 2, label: 'Desempenho & Métricas', route: '/admin/analytics', icon: 'BarChart3', shortcut: '2', module_alias: 'analytics', order: 2, is_active: true },
    ],
  },
  {
    id: 2,
    name: 'GESTÃO & CADASTROS',
    slug: 'gestao-cadastros',
    icon: 'Building2',
    order: 2,
    is_active: true,
    items: [
      { id: 3, label: 'Usuários & Permissões', route: '/admin/users', icon: 'Users', shortcut: 'U', module_alias: 'users', order: 1, is_active: true },
      { id: 4, label: 'Organizações & Tenants', route: '/admin/tenants', icon: 'Building2', shortcut: 'T', module_alias: 'tenants', order: 2, is_active: true },
      { id: 5, label: 'Registros & Tabelas', route: '/admin/records', icon: 'Layers', shortcut: 'R', module_alias: 'records', order: 3, is_active: true },
      { id: 6, label: 'Gerenciador de Menus', route: '/admin/menus', icon: 'FolderTree', shortcut: 'M', module_alias: 'menus', order: 4, is_active: true },
      { id: 15, label: 'Módulos da Plataforma', route: '/admin/module-catalog', icon: 'Database', shortcut: 'C', module_alias: 'catalog', order: 5, is_active: true },
    ],
  },
  {
    id: 3,
    name: 'FINANCEIRO & INFRAESTRUTURA',
    slug: 'financeiro-infra',
    icon: 'CreditCard',
    order: 3,
    is_active: true,
    items: [
      { id: 7, label: 'Faturamento & Invoices', route: '/admin/billing', icon: 'CreditCard', shortcut: 'F', module_alias: 'billing', order: 1, is_active: true },
      { id: 8, label: 'APIs & Integrações', route: '/admin/apis', icon: 'Plug', shortcut: 'I', module_alias: 'apis', order: 2, is_active: true },
      { id: 9, label: 'Logs & Auditoria', route: '/admin/logs', icon: 'ShieldAlert', shortcut: 'L', module_alias: 'compliance', order: 3, is_active: true },
    ],
  },
  {
    id: 4,
    name: 'SISTEMA & PREFERÊNCIAS',
    slug: 'sistema-preferencias',
    icon: 'Settings',
    order: 4,
    is_active: true,
    items: [
      { id: 10, label: 'Configurações & White-Label', route: '/admin/settings', icon: 'Settings', module_alias: 'settings', order: 1, is_active: true },
      { id: 11, label: 'Meu Perfil & Segurança', route: '/admin/profile', icon: 'UserCheck', module_alias: 'profile', order: 2, is_active: true },
    ],
  },
  {
    id: 5,
    name: 'MÓDULOS DE NEGÓCIO',
    slug: 'modulos-negocio',
    icon: 'FileText',
    order: 5,
    is_active: true,
    items: [
      { id: 12, label: 'Gestão de Contratos', route: '/admin/contratos', icon: 'FileText', module_alias: 'contracts', order: 1, is_active: true },
      { id: 13, label: 'Suporte & Helpdesk', route: '/admin/helpdesk', icon: 'Ticket', module_alias: 'support', order: 2, is_active: true },
      { id: 14, label: 'Contabilidade Pública', route: '/admin/contabilidade', icon: 'BookOpen', module_alias: 'contabilidade', order: 3, is_active: true },
    ],
  },
];

interface Props {
  groups?: MenuGroup[];
  onUpdateGroups?: (groups: MenuGroup[]) => void;
  onCreateGroup?: () => void;
  onCreateItem?: (groupId: number) => void;
  onEditGroup?: (group: MenuGroup) => void;
  onEditItem?: (item: MenuItem) => void;
  onDeleteGroup?: (group: MenuGroup) => void;
  onDeleteItem?: (item: MenuItem) => void;
}

const SortableItem: React.FC<{
  item: MenuItem;
  onEdit: (i: MenuItem) => void;
  onDelete: (i: MenuItem) => void;
}> = ({ item, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item-${item.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 mod-card mod-row-hover text-xs transition-colors group"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Arrastar item">
        <GripVertical size={14} />
      </button>
      <span className="flex-1 mod-text-primary font-medium">{item.label}</span>
      {item.shortcut && (
        <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mod-text-secondary">
          [{item.shortcut}]
        </span>
      )}
      {item.permission && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
          {item.permission}
        </span>
      )}
      {item.badge && item.badge.value > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700/40 px-2 py-0.5">
          <ShieldAlert size={10} /> {item.badge.value}
        </span>
      )}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500" title="Editar">
          <Edit size={14} />
        </button>
        <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500" title="Excluir">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const MenuManager: React.FC<Props> = ({
  groups: externalGroups,
  onUpdateGroups: externalOnUpdateGroups,
  onCreateGroup: externalOnCreateGroup,
  onCreateItem: externalOnCreateItem,
  onEditGroup: externalOnEditGroup,
  onEditItem: externalOnEditItem,
  onDeleteGroup: externalOnDeleteGroup,
  onDeleteItem: externalOnDeleteItem,
}) => {
  const [internalGroups, setInternalGroups] = useState<MenuGroup[]>(DEFAULT_MENUS);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [creatingForGroupId, setCreatingForGroupId] = useState<number | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Carrega da API quando usado standalone
  useEffect(() => {
    if (!externalGroups) {
      adminApi.getMenus()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setInternalGroups(res);
          }
        })
        .catch(() => {
          /* mantém DEFAULT_MENUS */
        });
    }
  }, [externalGroups]);

  const activeGroups = externalGroups !== undefined ? externalGroups : internalGroups;
  const safeGroups = (activeGroups || []).map((g) => ({
    ...g,
    items: Array.isArray(g?.items) ? g.items : [],
  }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filtered = safeGroups.filter((g) => {
    const groupName = (g?.name || '').toLowerCase();
    const matchesGroup = groupName.includes(search.toLowerCase());
    const matchesItems = (g.items || []).some((i) =>
      (i?.label || '').toLowerCase().includes(search.toLowerCase())
    );
    return matchesGroup || matchesItems;
  });

  const toggle = (id: number) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const updateGroups = (newGroups: MenuGroup[]) => {
    if (externalOnUpdateGroups) {
      externalOnUpdateGroups(newGroups);
    } else {
      setInternalGroups(newGroups);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('item-') && overId.startsWith('item-')) {
      const activeItemId = Number(activeId.replace('item-', ''));
      const overItemId = Number(overId.replace('item-', ''));

      let sourceGroup: MenuGroup | undefined;
      let targetGroup: MenuGroup | undefined;

      for (const g of safeGroups) {
        if (g.items.some((i) => i.id === activeItemId)) sourceGroup = g;
        if (g.items.some((i) => i.id === overItemId)) targetGroup = g;
      }

      if (sourceGroup && targetGroup) {
        if (sourceGroup.id === targetGroup.id) {
          const oldIndex = sourceGroup.items.findIndex((i) => i.id === activeItemId);
          const newIndex = sourceGroup.items.findIndex((i) => i.id === overItemId);
          const newItems = arrayMove(sourceGroup.items, oldIndex, newIndex);

          const updated = safeGroups.map((g) =>
            g.id === sourceGroup!.id ? { ...g, items: newItems } : g
          );
          updateGroups(updated);
        } else {
          const itemToMove = sourceGroup.items.find((i) => i.id === activeItemId);
          if (!itemToMove) return;

          const sourceItems = sourceGroup.items.filter((i) => i.id !== activeItemId);
          const targetItems = [...targetGroup.items];
          const overIndex = targetItems.findIndex((i) => i.id === overItemId);
          targetItems.splice(overIndex >= 0 ? overIndex : targetItems.length, 0, {
            ...itemToMove,
            menu_group_id: targetGroup.id,
          } as any);

          const updated = safeGroups.map((g) => {
            if (g.id === sourceGroup!.id) return { ...g, items: sourceItems };
            if (g.id === targetGroup!.id) return { ...g, items: targetItems };
            return g;
          });
          updateGroups(updated);
        }
      }
    }
  };

  const handleEditItem = (item: MenuItem) => {
    if (externalOnEditItem) {
      externalOnEditItem(item);
    } else {
      setEditingItem(item);
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    if (externalOnDeleteItem) {
      externalOnDeleteItem(item);
    } else {
      if (!window.confirm(`Excluir o item "${item.label}"?`)) return;
      const updated = safeGroups.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== item.id),
      }));
      updateGroups(updated);
    }
  };

  const handleEditGroup = (group: MenuGroup) => {
    if (externalOnEditGroup) {
      externalOnEditGroup(group);
    } else {
      setEditingGroup(group);
    }
  };

  const handleDeleteGroup = (group: MenuGroup) => {
    if (externalOnDeleteGroup) {
      externalOnDeleteGroup(group);
    } else {
      if (!window.confirm(`Excluir o grupo "${group.name}"?`)) return;
      const updated = safeGroups.filter((g) => g.id !== group.id);
      updateGroups(updated);
    }
  };

  const handleCreateGroup = () => {
    if (externalOnCreateGroup) {
      externalOnCreateGroup();
    } else {
      setCreatingGroup(true);
    }
  };

  const handleCreateItem = (groupId: number) => {
    if (externalOnCreateItem) {
      externalOnCreateItem(groupId);
    } else {
      setCreatingForGroupId(groupId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="mod-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold mod-text-primary flex items-center gap-2">
              <FolderTree className="text-indigo-500" size={20} /> Gerenciador de Menus Dinâmico
            </h1>
            <p className="text-sm mod-text-secondary mt-1">
              Arraste os itens para reorganizar posições ou movê-los entre grupos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateGroup}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Grupo
            </button>
          </div>
        </div>

        <div className="mod-card p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 mod-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo ou item de menu..."
              className="mod-input w-full pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="mod-card p-8 text-center text-xs mod-text-secondary">
              Nenhum menu ou item localizado para a busca informada.
            </div>
          ) : (
            filtered.map((group) => {
              const isOpen = expanded[group.id] ?? true;
              const itemIds = (group.items || []).map((i) => `item-${i.id}`);

              return (
                <div key={group.id} className="mod-card overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#101a3a]/40 border-b mod-border">
                    <button
                      onClick={() => toggle(group.id)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      {isOpen ? <ChevronDown size={16} className="mod-text-secondary" /> : <ChevronRight size={16} className="mod-text-secondary" />}
                      <span className="text-xs font-bold uppercase tracking-wider mod-text-primary truncate">
                        {group.name}
                      </span>
                      <span className="sgf-badge-oficial px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCreateItem(group.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Adicionar Item"
                      >
                        <Plus size={12} /> Adicionar Item
                      </button>
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-500 transition-colors"
                        title="Editar Grupo"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                        title="Excluir Grupo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-3 bg-white dark:bg-[#152244]/40">
                      {group.items.length === 0 ? (
                        <div className="text-center py-6 text-xs mod-text-secondary italic border border-dashed mod-border rounded-xl">
                          Nenhum item neste grupo. Clique em "Adicionar Item" ou arraste itens para cá.
                        </div>
                      ) : (
                        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {group.items.map((item) => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                onEdit={handleEditItem}
                                onDelete={handleDeleteItem}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Novo Grupo quando standalone */}
        {creatingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="mod-card w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b mod-border">
                <h2 className="text-sm font-bold mod-text-primary">Novo Grupo de Menu</h2>
                <button onClick={() => setCreatingGroup(false)} className="p-1 rounded-lg mod-text-secondary hover:mod-inner">
                  <X size={16} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const name = (form.elements.namedItem('groupName') as HTMLInputElement).value.trim();
                  if (!name) return;

                  const newGroup: MenuGroup = {
                    id: Date.now(),
                    name: name.toUpperCase(),
                    slug: name.toLowerCase().replace(/\s+/g, '-'),
                    order: safeGroups.length + 1,
                    is_active: true,
                    items: [],
                  };
                  updateGroups([...safeGroups, newGroup]);
                  setCreatingGroup(false);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Nome do Grupo</label>
                  <input name="groupName" required autoFocus placeholder="Ex: Organograma" className="mod-input w-full" />
                </div>
                <div className="mt-5 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreatingGroup(false)}
                    className="px-4 py-2 text-xs rounded-lg mod-text-secondary hover:mod-inner"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                  >
                    Criar Grupo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Edição de Item quando standalone */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="mod-card w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b mod-border">
                <h2 className="text-sm font-bold mod-text-primary">Editar Item: {editingItem.label}</h2>
                <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg mod-text-secondary hover:mod-inner">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Rótulo</label>
                  <input
                    className="mod-input w-full"
                    value={editingItem.label}
                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Rota</label>
                  <input
                    className="mod-input w-full font-mono"
                    value={editingItem.route}
                    onChange={(e) => setEditingItem({ ...editingItem, route: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Permissão Obrigatória</label>
                  <input
                    className="mod-input w-full font-mono"
                    value={editingItem.permission || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, permission: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs rounded-lg mod-text-secondary hover:mod-inner"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const updated = safeGroups.map((g) => ({
                      ...g,
                      items: g.items.map((i) => (i.id === editingItem.id ? editingItem : i)),
                    }));
                    updateGroups(updated);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Novo Item quando standalone */}
        {creatingForGroupId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="mod-card w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b mod-border">
                <h2 className="text-sm font-bold mod-text-primary">Adicionar Item de Menu</h2>
                <button onClick={() => setCreatingForGroupId(null)} className="p-1 rounded-lg mod-text-secondary hover:mod-inner">
                  <X size={16} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const label = (form.elements.namedItem('itemLabel') as HTMLInputElement).value;
                  const route = (form.elements.namedItem('itemRoute') as HTMLInputElement).value;
                  const perm = (form.elements.namedItem('itemPerm') as HTMLInputElement).value;

                  const newItem: MenuItem = {
                    id: Date.now(),
                    label,
                    route,
                    icon: 'Layers',
                    permission: perm || undefined,
                    module_alias: route.replace('/admin/', ''),
                    order: 99,
                    is_active: true,
                    menu_group_id: creatingForGroupId,
                  };

                  const updated = safeGroups.map((g) =>
                    g.id === creatingForGroupId ? { ...g, items: [...g.items, newItem] } : g
                  );
                  updateGroups(updated);
                  setCreatingForGroupId(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Rótulo do Item</label>
                  <input name="itemLabel" required placeholder="Ex: Novo Módulo" className="mod-input w-full" />
                </div>
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Rota</label>
                  <input name="itemRoute" required placeholder="Ex: /admin/novo-modulo" className="mod-input w-full font-mono" />
                </div>
                <div>
                  <label className="block font-semibold mod-text-secondary mb-1">Permissão (opcional)</label>
                  <input name="itemPerm" placeholder="Ex: novo_modulo.view" className="mod-input w-full font-mono" />
                </div>
                <div className="mt-5 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreatingForGroupId(null)}
                    className="px-4 py-2 text-xs rounded-lg mod-text-secondary hover:mod-inner"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default MenuManager;
