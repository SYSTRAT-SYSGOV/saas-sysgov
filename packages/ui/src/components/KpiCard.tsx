import React from 'react';
import { StatCard } from './StatCard';
import { cn } from '../lib/utils';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Não é mais exibido: o padrão do card (StatCard) não tem ícone. Mantido para não quebrar quem ainda o passa. */
  icon?: React.ReactNode;
  /** Não é mais exibido (ver `icon`). */
  iconBgColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  statusBadge?: React.ReactNode;
  /** Cor da barra à esquerda (classe Tailwind), ex.: "border-l-emerald-500". Padrão: cor primária. */
  accentClassName?: string;
  /** Cor do valor (classe Tailwind), ex.: "text-emerald-600 dark:text-emerald-400". Padrão: cor primária. */
  valueClassName?: string;
  className?: string;
}

/**
 * Card de indicador das telas iniciais dos módulos: é o StatCard (padrão do módulo CAPD) — barra de cor à esquerda,
 * rótulo discreto, valor grande em fonte monoespaçada e legenda embaixo. Mantém a API anterior (título, valor,
 * legenda, tendência, selo) para não alterar quem já o usa.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  statusBadge,
  accentClassName = 'border-l-primary',
  valueClassName = 'text-primary',
  className,
}) => {
  const temLegenda = Boolean(subtitle || trend || statusBadge);
  const legenda = temLegenda ? (
    <span className="flex flex-wrap items-center gap-2">
      {statusBadge}
      {trend && (
        <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums', trend.isPositive ? 'text-status-success' : 'text-status-danger')}>
          {trend.value}
          {trend.label && <span className="font-normal text-muted-foreground"> {trend.label}</span>}
        </span>
      )}
      {subtitle && !trend && <span>{subtitle}</span>}
    </span>
  ) : undefined;

  return (
    <StatCard
      label={title}
      value={value}
      caption={legenda}
      accentClassName={accentClassName}
      valueClassName={valueClassName}
      className={className}
    />
  );
};

export default KpiCard;
