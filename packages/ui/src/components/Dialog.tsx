import * as React from 'react';
import { cn } from '../lib/utils';
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from './dialog-primitive';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeMap: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'sm:max-w-4xl',
};

/**
 * Dialog/Modal "monolítico" (props open/onClose/title/footer/size) usado
 * pelas ~9 telas do painel do cliente — Dialog.tsx e Modal.tsx eram
 * hand-rolled quase idênticos (drift de copy-paste); unificados aqui num
 * único componente, agora sobre o Dialog real do shadcn/ui (Radix: focus
 * trap, scroll lock, Esc, portal — nativos, não mais reimplementados à mão).
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  className,
}) => {
  return (
    <DialogPrimitive open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] w-full flex-col gap-0 p-0',
          sizeMap[size],
          className
        )}
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 border-b px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className={cn('flex-1 overflow-y-auto custom-scrollbar p-6', !footer && 'pb-6')}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t px-6 py-4 sm:justify-end">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </DialogPrimitive>
  );
};

export default Dialog;

// Modal era um clone quase idêntico do Dialog (mesma API, sem scroll-lock
// explícito — redundante já que o Radix trava o scroll por padrão).
export { Dialog as Modal };
export type { DialogProps as ModalProps };
