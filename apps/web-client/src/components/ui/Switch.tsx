import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

/**
 * Switch no padrão shadcn/ui, com paleta GOV.BR (via CSS vars hsl).
 * Acessível: role="switch", aria-checked, focus ring azul governamental.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, size = 'md', label, className, ...props }, ref) => {
    const dims =
      size === 'sm'
        ? { track: 'h-5 w-9', thumb: 'h-4 w-4', thumbOn: 'translate-x-4', icon: 'w-2.5 h-2.5' }
        : { track: 'h-6 w-11', thumb: 'h-5 w-5', thumbOn: 'translate-x-5', icon: 'w-3 h-3' };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-input',
          dims.track,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-background shadow-sm ring-0 transition-transform',
            dims.thumb,
            checked ? dims.thumbOn : 'translate-x-0.5'
          )}
        >
          {checked ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={cn('text-primary', dims.icon)}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={cn('text-muted-foreground', dims.icon)}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </span>
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export default Switch;
