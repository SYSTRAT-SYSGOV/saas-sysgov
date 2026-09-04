import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

export interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string | React.ReactNode;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, badge, actions, className }) => (
  <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && <Badge variant="primary">{badge}</Badge>}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;