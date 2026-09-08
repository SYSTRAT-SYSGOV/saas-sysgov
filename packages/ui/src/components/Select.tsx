import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select-primitive';

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
 * Select "flat" (value/onChange/options[]) usado no painel do cliente.
 * Por baixo, usa o Select real do shadcn/ui (Radix — teclado/typeahead/ARIA
 * nativos) em vez do dropdown hand-rolled anterior (que já cuidava disso na
 * mão: mousedown fora, Esc, aria-expanded...).
 */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  loading,
  label,
  className,
  emptyText = 'Nenhuma opção',
}) => {
  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/70">
          {label}
        </label>
      )}
      <SelectPrimitive
        value={value !== null && value !== undefined ? String(value) : undefined}
        onValueChange={onChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-full">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : (
            <SelectValue placeholder={placeholder}>
              {selected && (
                <span className="flex items-center gap-2">
                  {selected.icon && <span className="shrink-0 text-primary">{selected.icon}</span>}
                  <span className="font-medium">{selected.label}</span>
                </span>
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                <span className="flex min-w-0 items-center gap-2">
                  {opt.icon && <span className="shrink-0 text-primary">{opt.icon}</span>}
                  <span className="truncate font-medium">{opt.label}</span>
                  {opt.hint && <span className="ml-1 truncate text-xs text-muted-foreground">{opt.hint}</span>}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </SelectPrimitive>
    </div>
  );
};

Select.displayName = 'Select';

export default Select;
