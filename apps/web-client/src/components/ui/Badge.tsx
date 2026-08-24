import React from 'react';

export type BadgeVariant = 'primary' | 'gold' | 'indigo' | 'cyan' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-gov-primary-light text-gov-primary border border-gov-primary/20',
    gold: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    indigo: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]',
    cyan: 'bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC]',
    neutral: 'bg-[#F0F2F5] text-gov-text-secondary border border-gov-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
