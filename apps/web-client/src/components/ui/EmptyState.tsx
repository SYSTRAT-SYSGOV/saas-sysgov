import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction, className }) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
    {icon && <span className="text-muted-foreground opacity-40">{icon}</span>}
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    {actionLabel && onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
  </div>
);

export default EmptyState;