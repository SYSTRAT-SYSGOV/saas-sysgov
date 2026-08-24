import React, { useEffect, useMemo, useState } from 'react';
import { Search, Settings, LogOut, Layers } from 'lucide-react';
import { adminApi } from '../../modules/admin/api';
import { MenuGroup } from '../../modules/admin/types';

interface SidebarProps {
  activeItemId?: string;
  onSelect?: (route: string, id: number) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItemId, onSelect, onLogout }) => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminApi.getNavigation().then(setGroups).catch(() => setGroups([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  return (
    <aside className="flex flex-col w-64 h-full bg-slate-950 text-slate-300 border-r border-slate-800">
      <div className="px-4 py-4 flex items-center gap-2 border-b border-slate-800">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="font-bold text-sm tracking-wider text-white">SYSGOV</span>
        <Layers className="ml-auto w-4 h-4 text-slate-500" />
      </div>

      <div className="px-3 py-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar módulo..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3 space-y-4">
        {filtered.map((group) => (
          <div key={group.id} className="space-y-1">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-1">{group.name}</h3>
            {group.items.map((item) => {
              const isActive = activeItemId === String(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect?.(item.route, item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && item.badge.value > 0 && (
                    <span className="rounded-full bg-rose-600 text-white text-[10px] font-bold px-1.5 min-w-[18px] text-center">
                      {item.badge.value}
                    </span>
                  )}
                  {item.shortcut && (
                    <span className="font-mono text-xs text-slate-600">[{item.shortcut}]</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3 space-y-1">
        <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-900 transition-colors">
          <Settings className="w-3.5 h-3.5" /> Configurações
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
