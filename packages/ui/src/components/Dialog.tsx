import * as React from 'react';
import { cn } from '../lib/utils';
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog-primitive';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const sizeMap: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-4xl',
  full: 'sm:max-w-6xl lg:max-w-7xl',
};

/**
 * Dialog/Modal "monolítico" (props open/onClose/onOpenChange/title/footer/size) usado
 * pelas telas do sistema — Dialog.tsx e Modal.tsx unificados sobre o Dialog real
 * do shadcn/ui (Radix: focus trap, scroll lock, Esc, portal — nativos).
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  headerActions,
  size = 'md',
  className,
}) => {
  const handleOpenChange = (next: boolean) => {
    onOpenChange?.(next);
    if (!next) {
      onClose?.();
    }
  };

  return (
    <DialogPrimitive open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] w-full flex-col gap-0 p-0',
          sizeMap[size],
          className
        )}
      >
        <DialogHeader className="shrink-0 flex-col items-start gap-1 space-y-0 border-b px-6 py-4 text-left pr-12">
          <div className="flex w-full items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {icon}
              {title}
            </DialogTitle>
            {headerActions && <div className="flex items-center gap-2 mr-2">{headerActions}</div>}
          </div>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </DialogDescription>
          )}
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
