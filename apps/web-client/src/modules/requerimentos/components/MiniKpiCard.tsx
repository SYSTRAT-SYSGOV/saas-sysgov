import React from 'react';
import { Card, CardContent } from '@sysgov/ui';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-card border-border',
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
  danger: 'bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800',
  info: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950 dark:border-cyan-800',
};

const iconColors: Record<string, string> = {
  default: 'text-muted-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  info: 'text-cyan-600 dark:text-cyan-400',
};

export const MiniKpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  description,
  variant = 'default',
  className,
  loading = false,
}) => {
  return (
    <Card className={cn('border', variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted mt-1" />
            ) : (
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {icon && (
            <span className={cn('shrink-0', iconColors[variant])}>
              {icon}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};