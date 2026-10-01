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
  success: 'bg-status-success-bg border-status-success-border',
  warning: 'bg-status-warning-bg border-status-warning-border',
  danger: 'bg-status-danger-bg border-status-danger-border',
  info: 'bg-status-info-bg border-status-info-border',
};

const iconColors: Record<string, string> = {
  default: 'text-muted-foreground',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  info: 'text-status-info',
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