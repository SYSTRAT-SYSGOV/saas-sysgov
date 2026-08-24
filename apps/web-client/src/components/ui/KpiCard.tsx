import React from 'react';
import { Card } from './Card';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  statusBadge?: React.ReactNode;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-[#E8F0FE] text-[#0c326f]',
  trend,
  statusBadge,
  className = '',
}) => {
  return (
    <Card className={`hover:shadow-md transition-shadow duration-150 border-t-4 !border-t-[#0c326f] !p-5 sm:!p-6 flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0c326f] leading-snug">
            {title}
          </span>
          {icon && (
            <div className={`p-2.5 rounded-lg ${iconBgColor} shrink-0`}>
              {icon}
            </div>
          )}
        </div>

        <div className="mt-3.5">
          <div
            className="font-mono text-lg sm:text-xl lg:text-[21px] xl:text-[22px] 2xl:text-[24px] font-bold text-[#0c326f] tabular-nums tracking-tight leading-tight break-normal"
          >
            {value}
          </div>
        </div>
      </div>

      {(subtitle || trend || statusBadge) && (
        <div className="mt-4 pt-3 border-t border-gov-border/60 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gov-text-secondary">
          {statusBadge}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs sm:text-sm tabular-nums ${
                trend.isPositive ? 'text-status-success' : 'text-status-danger'
              }`}
            >
              {trend.value}
              {trend.label && <span className="font-normal text-gov-text-secondary"> {trend.label}</span>}
            </span>
          )}
          {subtitle && !trend && <span className="text-xs sm:text-sm font-medium text-gov-text-secondary">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};

export default KpiCard;
