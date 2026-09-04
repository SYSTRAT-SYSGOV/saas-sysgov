import React from 'react';
import { Loader2, AlertCircle, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export type ScreenStateType = 'loading' | 'error' | 'empty' | 'ready';

export interface ScreenStateProps {
  type: ScreenStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const ScreenState: React.FC<ScreenStateProps> = ({ type, title, description, actionLabel, onAction, className, children }) => {
  if (type === 'ready' && children) return <>{children}</>;

  const config: Record<ScreenStateType, { icon: React.ReactNode; defaultTitle: string }> = {
    loading: {
      icon: <Loader2 className="h-10 w-10 animate-spin text-primary" />,
      defaultTitle: 'Carregando...',
    },
    error: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      defaultTitle: 'Erro ao carregar',
    },
    empty: {
      icon: <FileX className="h-10 w-10 text-muted-foreground opacity-40" />,
      defaultTitle: 'Nenhum registro encontrado',
    },
    ready: { icon: null, defaultTitle: '' },
  };

  const cfg = config[type];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {cfg.icon}
      <h3 className="text-lg font-semibold text-foreground">{title ?? cfg.defaultTitle}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && <Button variant={type === 'error' ? 'destructive' : 'primary'} onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
};

export default ScreenState;