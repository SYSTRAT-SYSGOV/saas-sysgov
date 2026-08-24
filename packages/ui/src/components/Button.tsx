import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPill?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  isPill = true,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const radiusStyles = isPill ? 'rounded-full' : 'rounded-lg';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-sm px-4 py-2 gap-2 h-10',
    md: 'text-base px-6 py-2.5 gap-2.5 h-11 sm:h-12',
    lg: 'text-lg px-8 py-3.5 gap-3 h-13 sm:h-14',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-gov-primary hover:bg-gov-primary-hover active:bg-gov-primary-active text-white focus-visible:ring-gov-primary shadow-sm',
    secondary: 'bg-white text-gov-primary border-2 border-gov-primary hover:bg-gov-primary-light focus-visible:ring-gov-primary shadow-xs',
    ghost: 'bg-transparent text-gov-primary hover:bg-gov-primary-light focus-visible:ring-gov-primary',
    destructive: 'bg-status-danger hover:bg-[#C81E06] text-white focus-visible:ring-status-danger shadow-sm',
    gold: 'bg-gov-accent-gold hover:bg-[#E09404] text-white focus-visible:ring-gov-accent-gold shadow-sm',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${radiusStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
