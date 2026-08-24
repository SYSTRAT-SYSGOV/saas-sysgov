import React from 'react';

export type Tab = string;

interface TabsProps {
  value: Tab;
  onChange: (next: Tab) => void;
  items: { id: Tab; label: string; count?: number }[];
}

export const Tabs: React.FC<TabsProps> = ({ value, onChange, items }) => {
  return (
    <div className="mod-card overflow-hidden border-b mod-border">
      <div className="flex">
        {items.map((it) => {
          const isActive = value === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent mod-text-secondary hover:mod-text-primary'
              }`}
            >
              {it.label}
              {typeof it.count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 mod-text-secondary">
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
