import React from 'react';
import { Card } from './card';
import { cn } from '../lib/utils';

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

/**
 * Card de indicador das telas iniciais dos módulos. Segue o visual do StatCard (padrão do módulo CAPD):
 * barra de destaque à esquerda, rótulo discreto, valor grande em fonte monoespaçada e legenda embaixo.
 * Mantém a API anterior (ícone, tendência, selo) para não alterar quem já o usa.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-primary/10 text-primary',
  trend,
  statusBadge,
  className,
}) => {
  const temLegenda = Boolean(subtitle || trend || statusBadge);

  return (
    <Card className={cn('gap-1 p-4 border-l-4 border-l-primary shadow-2xs', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {icon && <div className={cn('shrink-0 rounded-lg p-1.5', iconBgColor)}>{icon}</div>}
      </div>
      <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{value}</div>
      {temLegenda && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-medium text-muted-foreground">
          {statusBadge}
          {trend && (
            <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums', trend.isPositive ? 'text-status-success' : 'text-status-danger')}>
              {trend.value}
              {trend.label && <span className="font-normal text-muted-foreground"> {trend.label}</span>}
            </span>
          )}
          {subtitle && !trend && <span>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};

export default KpiCard;
