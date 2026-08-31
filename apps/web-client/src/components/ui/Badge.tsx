import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'primary' | 'gold' | 'indigo' | 'cyan' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
  icon,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-gov-primary-light text-gov-primary border border-gov-primary/20',
    gold: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    indigo: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]',
    cyan: 'bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC]',
    neutral: 'bg-[#F0F2F5] text-gov-text-secondary border border-gov-border',
    success: 'bg-success/10 text-success border border-success/30',
    warning: 'bg-warning/15 text-[#8D5B00] border border-warning/40',
    danger: 'bg-destructive/10 text-destructive border border-destructive/30',
    info: 'bg-status-info-bg text-status-info border border-status-info-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none',
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
};

export default Badge;
