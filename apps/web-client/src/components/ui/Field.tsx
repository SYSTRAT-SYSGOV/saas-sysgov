import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper de formulário no padrão shadcn/ui (label + hint + error).
 * Centraliza a tipografia dos labels do DS GOV.BR.
 */
export const Field: React.FC<FieldProps> = ({ label, required, hint, error, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs font-medium text-destructive">{error}</p>}
  </div>
);

export default Field;
