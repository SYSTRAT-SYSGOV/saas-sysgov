import React from 'react';
import { Card } from './card';
import { cn } from '../lib/utils';

export interface StatCardProps {
  /** Rótulo curto do indicador (ex.: "Recursos Interpostos"). */
  label: string;
  /** Valor principal em destaque (ex.: 12, "R$ 1.200,00"). */
  value: React.ReactNode;
  /** Linha auxiliar abaixo do valor (ex.: "35% do total"). */
  caption?: React.ReactNode;
  /** Classe Tailwind da barra de destaque à esquerda (ex.: "border-l-emerald-500"). */
  accentClassName?: string;
  /** Classe Tailwind aplicada ao valor principal (ex.: "text-emerald-600 dark:text-emerald-400"). */
  valueClassName?: string;
  /** Classe Tailwind aplicada à legenda/caption. */
  captionClassName?: string;
  className?: string;
}

/**
 * Card compacto de indicador com barra de destaque à esquerda — padrão visual
 * consolidado a partir do Portal do Avaliador (Chefia Imediata) e adotado como
 * componente único de KPI compacto em todos os portais do módulo CAPD.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  caption,
  accentClassName = 'border-l-primary',
  valueClassName = 'text-foreground',
  captionClassName = 'text-muted-foreground',
  className,
}) => {
  return (
    <Card className={cn('gap-1 p-4 border-l-4 shadow-2xs', accentClassName, className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-bold font-mono tabular-nums', valueClassName)}>{value}</div>
      {caption && (
        <div className={cn('text-[11px] font-mono font-medium', captionClassName)}>{caption}</div>
      )}
    </Card>
  );
};

export default StatCard;
