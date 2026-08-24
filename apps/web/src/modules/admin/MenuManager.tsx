import React, { useState } from 'react';
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
  Layers,
  Sparkles,
} from 'lucide-react';
import { MenuGroup, MenuItem } from './types';

interface Props {
  groups: MenuGroup[];
  onUpdateGroups: (groups: MenuGroup[]) => void;
  onCreateGroup: () => void;
  onCreateItem: (groupId: number) => void;
  onEditGroup: (group: MenuGroup) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteGroup: (group: MenuGroup) => void;
  onDeleteItem: (item: MenuItem) => void;
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
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <GripVertical size={14} />
      </button>
      <span className="flex-1 mod-text-primary font-medium">{item.label}</span>
      {item.shortcut && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mod-text-secondary">
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
  groups,
  onUpdateGroups,
  onCreateGroup,
  onCreateItem,
  onEditGroup,
  onEditItem,
  onDeleteGroup,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.items.some((i) => i.label.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: number) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

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

      for (const g of groups) {
        if (g.items.some((i) => i.id === activeItemId)) sourceGroup = g;
        if (g.items.some((i) => i.id === overItemId)) targetGroup = g;
      }

      if (sourceGroup && targetGroup) {
        if (sourceGroup.id === targetGroup.id) {
          const oldIndex = sourceGroup.items.findIndex((i) => i.id === activeItemId);
          const newIndex = sourceGroup.items.findIndex((i) => i.id === overItemId);
          const newItems = arrayMove(sourceGroup.items, oldIndex, newIndex);

          const updated = groups.map((g) =>
            g.id === sourceGroup!.id ? { ...g, items: newItems } : g
          );
          onUpdateGroups(updated);
        } else {
          // Mover entre grupos diferentes
          const itemToMove = sourceGroup.items.find((i) => i.id === activeItemId);
          if (!itemToMove) return;

          const sourceItems = sourceGroup.items.filter((i) => i.id !== activeItemId);
          const targetItems = [...targetGroup.items];
          const overIndex = targetItems.findIndex((i) => i.id === overItemId);
          targetItems.splice(overIndex >= 0 ? overIndex : targetItems.length, 0, {
            ...itemToMove,
            menu_group_id: targetGroup.id,
          } as any);

          const updated = groups.map((g) => {
            if (g.id === sourceGroup!.id) return { ...g, items: sourceItems };
            if (g.id === targetGroup!.id) return { ...g, items: targetItems };
            return g;
          });
          onUpdateGroups(updated);
        }
      }
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
              onClick={onCreateGroup}
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
          {filtered.map((group) => {
            const isOpen = expanded[group.id] ?? true;
            const itemIds = group.items.map((i) => `item-${i.id}`);

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
                    <span className="sgf-badge-oficial px-2 py-0.5 rounded-full text-[10px]">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onCreateItem(group.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Adicionar Item"
                    >
                      <Plus size={12} /> Adicionar Item
                    </button>
                    <button
                      onClick={() => onEditGroup(group)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-500 transition-colors"
                      title="Editar Grupo"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteGroup(group)}
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
                              onEdit={onEditItem}
                              onDelete={onDeleteItem}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
};
