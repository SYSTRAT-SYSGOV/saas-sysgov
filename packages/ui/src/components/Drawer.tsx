import * as React from 'react';
import { cn } from '../lib/utils';
import {
  Sheet as SheetPrimitive,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from './sheet-primitive';

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const drawerSizeMap: Record<NonNullable<DrawerProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-2xl',
};

/**
 * Cortina lateral (slide-over) — mesma API monolítica open/onClose/title/footer
 * do Modal, mas ancorada na borda da tela em vez de centralizada, para
 * consulta de conteúdo secundário sem cobrir a tela inteira. Sempre inicia
 * fechada; quem consome controla `open` via estado próprio.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  onOpenChange,
  title,
  icon,
  children,
  footer,
  side = 'right',
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
    <SheetPrimitive open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={side}
        className={cn('flex w-full flex-col gap-0 p-0', drawerSizeMap[size], className)}
      >
        <SheetHeader className="shrink-0 flex-row items-center gap-2 space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            {icon}
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {children}
        </div>

        {footer && (
          <SheetFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t px-5 py-3 sm:justify-end">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </SheetPrimitive>
  );
};

export default Drawer;
