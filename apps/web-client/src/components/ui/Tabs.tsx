import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabsItem<T extends string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export interface TabsProps<T extends string> {
  items: TabsItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Tabs no padrão shadcn/ui (sem dependência externa), paleta GOV.BR.
 * Container com role="tablist" e botões role="tab" acessíveis.
 */
export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl bg-accent/60 p-1',
        className
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
