import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { StatusChip, StatusVariant } from './StatusChip';

export type AlertPriority = 'danger' | 'warning' | 'info' | 'success';

export interface AlertCardProps {
  title: string;
  description: string;
  priority: AlertPriority;
  statusLabel?: string;
  tag?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  title,
  description,
  priority = 'warning',
  statusLabel,
  tag,
  actionLabel = 'Ver Alerta',
  onAction,
  className = '',
}) => {
  const priorityConfig: Record<
    AlertPriority,
    {
      bg: string;
      border: string;
      titleColor: string;
      iconColor: string;
      icon: React.ReactNode;
      statusVariant: StatusVariant;
    }
  > = {
    danger: {
      bg: 'bg-status-danger-bg',
      border: 'border-status-danger-border',
      titleColor: 'text-status-danger',
      iconColor: 'text-status-danger',
      icon: <AlertCircle className="w-5 h-5" />,
      statusVariant: 'danger',
    },
    warning: {
      bg: 'bg-status-warning-bg',
      border: 'border-status-warning-border',
      titleColor: 'text-[#8D5B00]',
      iconColor: 'text-status-warning',
      icon: <AlertTriangle className="w-5 h-5" />,
      statusVariant: 'warning',
    },
    info: {
      bg: 'bg-status-info-bg',
      border: 'border-status-info-border',
      titleColor: 'text-status-info',
      iconColor: 'text-status-info',
      icon: <Info className="w-5 h-5" />,
      statusVariant: 'info',
    },
    success: {
      bg: 'bg-status-success-bg',
      border: 'border-status-success-border',
      titleColor: 'text-status-success',
      iconColor: 'text-status-success',
      icon: <CheckCircle2 className="w-5 h-5" />,
      statusVariant: 'success',
    },
  };

  const current = priorityConfig[priority];

  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 flex flex-col justify-between transition-shadow hover:shadow-md ${current.bg} ${current.border} ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={current.iconColor}>{current.icon}</span>
            <h4 className={`text-sm sm:text-base font-bold uppercase tracking-wide ${current.titleColor}`}>
              {title}
            </h4>
          </div>
          {(statusLabel || tag) && (
            <StatusChip
              label={statusLabel || tag || ''}
              variant={current.statusVariant}
            />
          )}
        </div>

        <p className="mt-3 text-sm sm:text-base text-gov-text-secondary leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {actionLabel && (
        <div className="mt-5 pt-3.5 border-t border-black/5 flex items-center justify-end">
          <button
            type="button"
            onClick={onAction}
            className={`inline-flex items-center gap-1.5 text-sm sm:text-base font-bold ${current.titleColor} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded px-2 py-1`}
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertCard;
