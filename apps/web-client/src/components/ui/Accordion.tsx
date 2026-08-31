import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionItemProps {
  value: string;
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItemProps[];
  className?: string;
  multiple?: boolean;
  icon?: React.ReactNode;
}

/**
 * Accordion no padrão shadcn/ui, paleta GOV.BR.
 * Acessível: role="button", aria-expanded, animação suave.
 */
export const Accordion: React.FC<AccordionProps> = ({ items, className, multiple = false, icon }) => {
  const [openValues, setOpenValues] = React.useState<Set<string>>(new Set(items.filter((i) => i.defaultOpen).map((i) => i.value)));

  const toggle = (value: string) => {
    setOpenValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (!multiple) next.clear();
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div className={cn('divide-y divide-border rounded-xl border border-border bg-card', className)}>
      {items.map((item) => {
        const isOpen = openValues.has(item.value);
        return (
          <div key={item.value}>
            <button
              type="button"
              onClick={() => toggle(item.value)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-0', !isOpen && '-rotate-90')} />
              {icon}
              <span className="flex-1">{item.title}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1">
                {item.children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;