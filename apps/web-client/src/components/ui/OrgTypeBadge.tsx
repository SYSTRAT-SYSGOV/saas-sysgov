import React from 'react';
import { cn } from '@/lib/utils';

export type OrgType = 'raiz' | 'secretaria' | 'departamento' | 'divisao' | 'setor' | 'autarquia' | 'fundacao' | string;

interface OrgTypeBadgeProps {
  type: OrgType;
  className?: string;
  showIcon?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  raiz: { label: 'Gabinete / Raiz', bg: 'bg-gov-primary-light', text: 'text-gov-primary', border: 'border-gov-primary/30' },
  secretaria: { label: 'Secretaria', bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  departamento: { label: 'Departamento', bg: 'bg-status-info-bg', text: 'text-status-info', border: 'border-status-info-border' },
  divisao: { label: 'Divisão', bg: 'bg-status-warning-bg', text: 'text-[#8D5B00]', border: 'border-status-warning-border' },
  setor: { label: 'Setor', bg: 'bg-gov-primary-light', text: 'text-gov-primary', border: 'border-gov-primary/30' },
  autarquia: { label: 'Autarquia', bg: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', border: 'border-[#D8B4FE]' },
  fundacao: { label: 'Fundação', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FDE68A]' },
};

export const OrgTypeBadge: React.FC<OrgTypeBadgeProps> = ({ type, className, showIcon = true }) => {
  const config = TYPE_CONFIG[type] || { label: type, bg: 'bg-gov-surface', text: 'text-gov-text-secondary', border: 'border-gov-border' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', config.bg, config.text, config.border, className)}>
      {showIcon && <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: 'currentColor', opacity: 0.3 }} />}
      {config.label}
    </span>
  );
};