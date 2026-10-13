import React from 'react';
import { cn } from '../lib/utils';

export type TimelineStatus =
  | 'completed'
  | 'current'
  | 'pending'
  | 'warning'
  | 'critical'
  | 'neutral';

export interface TimelineItem {
  id?: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  date?: React.ReactNode;
  content?: React.ReactNode;
  status?: TimelineStatus;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const statusDotStyles: Record<TimelineStatus, string> = {
  completed: 'bg-emerald-500 border-emerald-600 dark:bg-emerald-600',
  current: 'bg-primary border-primary ring-4 ring-primary/20',
  pending: 'bg-muted-foreground/30 border-muted-foreground/40',
  warning: 'bg-amber-500 border-amber-600',
  critical: 'bg-rose-500 border-rose-600',
  neutral: 'bg-sky-500 border-sky-600',
};

export function Timeline({ items, className }: TimelineProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      {/* Linha vertical conectora */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border -translate-x-1/2" />

      {items.map((item, index) => {
        const status = item.status ?? 'neutral';

        return (
          <div key={item.id ?? index} className="relative group">
            {/* Ponto / Ícone do nó */}
            <div
              className={cn(
                'absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 transition-transform group-hover:scale-125 z-10',
                statusDotStyles[status]
              )}
            >
              {item.icon && (
                <div className="absolute -inset-2 flex items-center justify-center">
                  {item.icon}
                </div>
              )}
            </div>

            {/* Conteúdo do item */}
            <div className="flex flex-col gap-1.5 bg-card/40 border border-border/60 hover:border-border transition-colors rounded-lg p-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground tracking-tight">
                    {item.title}
                  </h4>
                  {item.badge}
                </div>

                {item.date && (
                  <time className="text-xs text-muted-foreground font-mono tabular-nums">
                    {item.date}
                  </time>
                )}
              </div>

              {item.subtitle && (
                <div className="text-xs text-muted-foreground font-medium">
                  {item.subtitle}
                </div>
              )}

              {item.content && (
                <div className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
