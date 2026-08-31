import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  value: string | number | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
  emptyText?: string;
}

/**
 * Select acessível no padrão shadcn/ui (sem dependência externa),
 * com paleta GOV.BR. Usa botão + lista customizada (dropdown nativo-free).
 */
export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onChange, options, placeholder = 'Selecione...', disabled, loading, label, className, emptyText = 'Nenhuma opção' }, ref) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const selected = options.find((o) => String(o.value) === String(value));

    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [open]);

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1.5">{label}</label>
        )}
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open ? 'border-ring ring-1 ring-ring' : 'border-border hover:border-ring/50'
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {loading ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
            ) : selected ? (
              <>
                {selected.icon && <span className="shrink-0 text-primary">{selected.icon}</span>}
                <span className="font-medium text-foreground">{selected.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted-foreground">{emptyText}</li>
            ) : (
              options.map((opt) => {
                const isSel = String(opt.value) === String(value);
                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSel}
                    onClick={() => { onChange(String(opt.value)); setOpen(false); }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                      isSel ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {opt.icon && <span className="shrink-0 text-primary">{opt.icon}</span>}
                      <span className="truncate font-medium">{opt.label}</span>
                      {opt.hint && <span className="ml-1 truncate text-xs text-muted-foreground">{opt.hint}</span>}
                    </span>
                    {isSel && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Select;
