import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export interface StatusChipProps {
  label: string;
  variant?: StatusVariant;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'neutral',
  icon,
  className = '',
}) => {
  const variantStyles: Record<StatusVariant, string> = {
    primary: 'bg-gov-primary-light text-gov-primary border-gov-primary-border',
    success: 'bg-status-success-bg text-status-success border-status-success-border',
    warning: 'bg-status-warning-bg text-status-warning border-status-warning-border',
    danger: 'bg-status-danger-bg text-status-danger border-status-danger-border',
    info: 'bg-status-info-bg text-status-info border-status-info-border',
    neutral: 'bg-[#F0F2F5] text-gov-text-secondary border-gov-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs sm:text-sm font-bold uppercase tracking-wider tabular-nums select-none ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

export default StatusChip;
