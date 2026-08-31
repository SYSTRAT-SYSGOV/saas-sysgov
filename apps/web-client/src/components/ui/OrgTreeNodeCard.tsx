import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Plus,
  Edit3,
  Move,
  UserPlus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgTypeBadge, type OrgType } from './OrgTypeBadge';
import { StatusChip } from './StatusChip';

export interface OrgTreeNodeCardProps {
  id: number;
  name: string;
  code: string;
  acronym?: string | null;
  type: OrgType;
  level: number;
  path: string;
  order: number;
  isActive: boolean;
  usersCount?: number;
  responsibles?: Array<{ id: number; name: string; email: string; role: string; is_primary?: boolean }>;
  hasChildren: boolean;
  childrenCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAddChild?: (parentId: number) => void;
  onEdit?: (id: number) => void;
  onMove?: (id: number) => void;
  onManageUsers?: (id: number) => void;
  onDelete?: (id: number) => void;
  className?: string;
}

export const OrgTreeNodeCard: React.FC<OrgTreeNodeCardProps> = ({
  id,
  name,
  code,
  acronym,
  type,
  level,
  path,
  isActive,
  usersCount = 0,
  responsibles = [],
  hasChildren,
  childrenCount = 0,
  isExpanded = true,
  onToggleExpand,
  onAddChild,
  onEdit,
  onMove,
  onManageUsers,
  onDelete,
  className,
}) => {
  const isRoot = level === 1;
  const isSecretaria = level === 2;

  const levelAccentClass = isRoot
    ? 'border-l-4 border-l-[#0c326f] bg-gradient-to-r from-[#0c326f]/5 via-white to-white'
    : isSecretaria
    ? 'border-l-4 border-l-gov-primary bg-gradient-to-r from-gov-primary-light/60 via-white to-white'
    : level === 3
    ? 'border-l-4 border-l-status-info bg-white'
    : 'border-l-4 border-l-[#06b6d4] bg-white';

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-gov-border/90 shadow-sm hover:shadow-md transition-all duration-200 p-5',
        levelAccentClass,
        !isActive && 'opacity-65 bg-gov-page',
        className
      )}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="mt-0.5 p-2 rounded-xl text-[#0c326f] bg-gov-primary-light hover:bg-[#E8F0FE] hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0c326f]"
              aria-label={isExpanded ? 'Recolher sub-unidades' : 'Expandir sub-unidades'}
              title={isExpanded ? 'Recolher sub-unidades' : 'Expandir sub-unidades'}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gov-page flex items-center justify-center shrink-0 mt-0.5 border border-gov-border/60">
              <span className="w-2.5 h-2.5 rounded-full bg-gov-text-muted" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0c326f] bg-[#0c326f]/10 px-2.5 py-0.5 rounded-md border border-[#0c326f]/20 tabular-nums">
                {code}
              </span>

              {acronym && (
                <span className="font-mono text-xs font-bold text-gov-text-secondary bg-gov-surface px-2 py-0.5 rounded-md border border-gov-border">
                  {acronym}
                </span>
              )}

              <OrgTypeBadge type={type} />

              <span className="text-xs font-mono text-gov-text-secondary bg-gov-page px-2 py-0.5 rounded border border-gov-border tabular-nums font-semibold">
                Nível {level} • Path {path}
              </span>

              <StatusChip label={isActive ? 'Ativo' : 'Inativo'} variant={isActive ? 'success' : 'neutral'} />

              {hasChildren && childrenCount > 0 && (
                <span className="text-xs font-bold font-mono text-status-info bg-status-info-bg px-2.5 py-0.5 rounded-full border border-status-info-border tabular-nums">
                  {childrenCount} {childrenCount === 1 ? 'sub-unidade' : 'sub-unidades'}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#0c326f] tracking-tight leading-snug truncate">
              {name}
            </h3>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 mt-2 text-xs sm:text-sm">
              {responsibles.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-success/10 border border-success/30 text-success font-medium">
                  <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center text-[10px] font-bold font-mono">
                    {responsibles[0].name.charAt(0).toUpperCase()}
                  </div>
                  <span>
                    <strong>Gestor Responsável:</strong> {responsibles.map((r) => r.name).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gov-page text-gov-text-secondary text-xs italic font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sem gestor titular vinculado</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-gov-text-secondary font-mono tabular-nums font-bold text-xs bg-gov-page px-2.5 py-1 rounded-lg border border-gov-border/80">
                <Users className="w-4 h-4" />
                <span>
                  {usersCount} {usersCount === 1 ? 'servidor lotado' : 'servidores lotados'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end xl:self-center pt-3 xl:pt-0 border-t xl:border-t-0 border-gov-border/70 w-full xl:w-auto justify-end">
          {onAddChild && (
            <button
              type="button"
              onClick={() => onAddChild(id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all border border-success/40 cursor-pointer"
              title="Adicionar sub-unidade subordinada"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Subordinar</span>
            </button>
          )}

          {onManageUsers && (
            <button
              type="button"
              onClick={() => onManageUsers(id)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-status-info-bg text-status-info hover:bg-status-info hover:text-white transition-all border border-status-info-border cursor-pointer"
              title="Vincular ou gerenciar servidores lotados"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Servidores</span>
            </button>
          )}

          {onMove && !isRoot && (
            <button
              type="button"
              onClick={() => onMove(id)}
              className="p-2 rounded-xl text-gov-text-secondary hover:text-[#0c326f] hover:bg-gov-primary-light border border-gov-border/90 transition-all cursor-pointer"
              title="Mover hierarquia (RN-ORG-003)"
              aria-label="Mover hierarquia"
            >
              <Move className="w-4 h-4" />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(id)}
              className="p-2 rounded-xl text-gov-text-secondary hover:text-warning hover:bg-warning/10 border border-gov-border/90 transition-all cursor-pointer"
              title="Editar unidade"
              aria-label="Editar unidade"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {onDelete && !isRoot && (
            <button
              type="button"
              onClick={() => onDelete(id)}
              className="p-2 rounded-xl text-gov-text-secondary hover:text-destructive hover:bg-destructive/10 border border-gov-border/90 transition-all cursor-pointer"
              title="Inativar unidade"
              aria-label="Inativar unidade"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};