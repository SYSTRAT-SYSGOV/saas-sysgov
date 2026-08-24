import React from 'react';
import {
  Landmark,
  Building2,
  FolderTree,
  GitBranch,
  Layers,
  ShieldAlert,
  Award,
} from 'lucide-react';

export type OrgType = 'raiz' | 'secretaria' | 'departamento' | 'divisao' | 'setor' | 'autarquia' | 'fundacao' | string;

interface OrgTypeBadgeProps {
  type: OrgType;
  className?: string;
  showIcon?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }> = {
  raiz: {
    label: 'Gabinete / Raiz',
    bg: 'bg-[#0c326f]/10',
    text: 'text-[#0c326f]',
    border: 'border-[#0c326f]/30',
    icon: Landmark,
  },
  secretaria: {
    label: 'Secretaria Municipal',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: Building2,
  },
  departamento: {
    label: 'Departamento',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    icon: FolderTree,
  },
  divisao: {
    label: 'Divisão',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: GitBranch,
  },
  setor: {
    label: 'Setor / Seção',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: Layers,
  },
  autarquia: {
    label: 'Autarquia',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: Award,
  },
  fundacao: {
    label: 'Fundação Pública',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: ShieldAlert,
  },
};

export const OrgTypeBadge: React.FC<OrgTypeBadgeProps> = ({ type, className = '', showIcon = true }) => {
  const config = TYPE_CONFIG[type] ?? {
    label: type.toUpperCase(),
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Building2,
  };

  const IconComp = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-2xs ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <IconComp className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />}
      <span>{config.label}</span>
    </span>
  );
};
