import * as React from 'react';
import { Loader2, AlertCircle, FileSearch, Database, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScreenStateType = 'loading' | 'error' | 'empty' | 'ready';

interface ScreenStateProps {
  state: ScreenStateType;
  loadingMessage?: string;
  errorMessage?: string;
  errorAction?: { label: string; onClick: () => void };
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}

const stateConfig: Record<ScreenStateType, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  loading: { Icon: Loader2, color: 'text-emerald-600 dark:text-emerald-400' },
  error: { Icon: AlertCircle, color: 'text-rose-600 dark:text-rose-400' },
  empty: { Icon: FileSearch, color: 'text-slate-500 dark:text-slate-400' },
  ready: { Icon: Database, color: 'text-emerald-600 dark:text-emerald-400' },
};

export function ScreenState({
  state,
  loadingMessage = 'Carregando...',
  errorMessage = 'Ocorreu um erro ao carregar os dados.',
  errorAction,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyAction,
  children,
  className,
}: ScreenStateProps) {
  const { Icon, color } = stateConfig[state];

  if (state === 'loading') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
        <Icon className={cn('w-8 h-8 animate-spin', color)} />
        <span className="font-mono text-xs text-muted-foreground">{loadingMessage}</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 py-12 text-center', className)}>
        <Icon className={cn('w-10 h-10', color)} />
        <p className="text-sm text-foreground max-w-md">{errorMessage}</p>
        {errorAction && (
          <button
            onClick={errorAction.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            {errorAction.label}
          </button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 py-12 text-center', className)}>
        <Icon className={cn('w-10 h-10', color)} />
        <p className="text-sm text-muted-foreground max-w-md">{emptyMessage}</p>
        {emptyAction && (
          <button
            onClick={emptyAction.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

export default ScreenState;