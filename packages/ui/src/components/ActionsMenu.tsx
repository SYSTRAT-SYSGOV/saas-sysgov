import * as React from 'react';
import { Loader2, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './button';
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu-primitive';

export interface ActionsMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ActionsMenuProps {
  items: ActionsMenuItem[];
  triggerLabel?: string;
  className?: string;
}

/**
 * Ações de uma linha de grid (ex.: editar, baixar PDFs). Com mais de uma ação vira um
 * dropdown (DropdownMenu real do Radix: teclado/foco/ARIA nativos); com uma só, o botão
 * da ação fica direto na linha, sem menu.
 */
export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  items,
  triggerLabel = 'Ações',
  className,
}) => {
  if (items.length === 0) return null;

  if (items.length === 1) {
    const [item] = items;
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className={className}
        title={item.label}
        disabled={item.disabled || item.loading}
        onClick={(e) => {
          e.stopPropagation();
          item.onSelect();
        }}
      >
        {item.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.icon}
        <span>{item.label}</span>
      </Button>
    );
  }

  return (
    <DropdownMenuPrimitive>
      <DropdownMenuTrigger
        title={triggerLabel}
        aria-label={triggerLabel}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), className)}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={item.disabled || item.loading}
            onClick={(e) => e.stopPropagation()}
            onSelect={() => item.onSelect()}
          >
            {item.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              item.icon
            )}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuPrimitive>
  );
};

ActionsMenu.displayName = 'ActionsMenu';

export default ActionsMenu;
