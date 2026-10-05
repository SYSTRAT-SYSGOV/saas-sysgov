import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PessoaSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
}

export const PessoaSearchInput: React.FC<PessoaSearchInputProps> = ({
  value,
  onChange,
  onClear,
  debounceMs = 300,
  loading = false,
  placeholder = 'Buscar por nome ou CPF...',
  className,
  ...props
}) => {
  const [internalValue, setInternalValue] = React.useState(value);

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setInternalValue('');
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-3 size-4 text-gov-text-secondary pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-9 py-2 text-sm bg-popover border border-gov-border rounded-lg',
          'text-gov-text-primary placeholder:text-gov-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-gov-primary/30 focus:border-gov-primary transition-all'
        )}
        {...props}
      />
      <div className="absolute right-3 flex items-center gap-1">
        {loading && <Loader2 className="size-4 animate-spin text-gov-primary" />}
        {!loading && internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gov-text-secondary hover:text-gov-text-primary p-0.5 rounded transition-colors"
            title="Limpar busca"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
