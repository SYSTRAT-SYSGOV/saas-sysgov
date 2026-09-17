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
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

/**
 * Cortina lateral (slide-over) — mesma API monolítica open/onClose/title/footer
 * do Modal, mas ancorada na borda da tela em vez de centralizada, para
 * consulta de conteúdo secundário sem cobrir a tela inteira. Sempre inicia
 * fechada; quem consome controla `open` via estado próprio.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  side = 'right',
  className,
}) => {
  return (
    <SheetPrimitive open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side={side}
        className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-md', className)}
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
