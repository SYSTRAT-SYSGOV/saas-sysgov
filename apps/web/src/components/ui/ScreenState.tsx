import * as React from 'react';
import { ScreenState as SharedScreenState, type ScreenStateType } from '@sysgov/ui';

export type { ScreenStateType };

interface ScreenStateProps {
  state: ScreenStateType;
  loadingMessage?: string;
  errorMessage?: string;
  errorAction?: { label: string; onClick: () => void };
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  children?: React.ReactNode;
  className?: string;
}

/**
 * Adaptador do `ScreenState` compartilhado (@sysgov/ui) para a assinatura que as telas do admin já usam
 * (mensagens e ação por estado). O visual vem do componente compartilhado.
 */
export const ScreenState: React.FC<ScreenStateProps> = ({
  state, loadingMessage, errorMessage, errorAction, emptyMessage, emptyAction, children, className,
}) => {
  const porEstado = {
    loading: { title: loadingMessage },
    error: { description: errorMessage, actionLabel: errorAction?.label, onAction: errorAction?.onClick },
    empty: { description: emptyMessage, actionLabel: emptyAction?.label, onAction: emptyAction?.onClick },
    ready: {},
  }[state];
  return (
    <SharedScreenState type={state} className={className} {...porEstado}>
      {children}
    </SharedScreenState>
  );
};

export default ScreenState;
