import * as React from 'react';
import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label?: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  error?: string;
  className?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'tel' | 'url' | 'date';
  as?: 'input' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number | string;
  max?: number | string;
}

export function Field(props: BaseFieldProps & { value: string | number | boolean; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void }) {
  const { label, name, required, placeholder, help, error, className, type = 'text', as = 'input', options, rows = 3, min, max, value, onChange, ...rest } = props;
  const id = `field-${name}`;

  if (type === 'checkbox') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={value as boolean}
          onChange={onChange}
          required={required}
          className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
          {...rest as React.InputHTMLAttributes<HTMLInputElement>}
        />
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        {help && <p className="text-xs text-muted-foreground ml-6">{help}</p>}
      </div>
    );
  }

  if (as === 'textarea') {
    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label} {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={id}
          name={name}
          value={String(value)}
          onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            error && 'border-rose-500 focus:ring-rose-500'
          )}
          {...rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>}
        />
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
        {help && !error && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
    );
  }

if (as === 'select') {
    const { options: _options, ...selectRest } = rest as Record<string, any>;
    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label} {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <select
          id={id}
          name={name}
          value={String(value)}
          onChange={onChange as (e: React.ChangeEvent<HTMLSelectElement>) => void}
          required={required}
          className={cn(
            'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            error && 'border-rose-500 focus:ring-rose-500'
          )}
          {...selectRest}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
        {help && !error && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
    );
  }

  // Default: input
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label} {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        value={String(value)}
        onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
        required={required}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
        className={cn(
          'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          error && 'border-rose-500 focus:ring-rose-500'
        )}
        {...rest as React.InputHTMLAttributes<HTMLInputElement>}
      />
      {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      {help && !error && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

export default Field;