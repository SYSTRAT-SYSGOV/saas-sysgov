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
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';
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
  className = '',
}) => {
  const isRoot = level === 1;
  const isSecretaria = level === 2;

  // Estilo de borda lateral e gradiente sutil conforme o nível hierárquico
  const levelAccentClass = isRoot
    ? 'border-l-6 border-l-[#0c326f] bg-gradient-to-r from-[#0c326f]/5 via-white to-white'
    : isSecretaria
    ? 'border-l-6 border-l-[#10b981] bg-gradient-to-r from-emerald-50/40 via-white to-white'
    : level === 3
    ? 'border-l-4 border-l-[#6366f1] bg-white'
    : 'border-l-4 border-l-[#06b6d4] bg-white';

  return (
    <div
      className={`group relative rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-5 ${levelAccentClass} ${
        !isActive ? 'opacity-65 bg-slate-50' : ''
      } ${className}`}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Bloco 1: Expansão + Identificação da Unidade */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Botão Expansor / Indicador de Folha */}
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="mt-0.5 p-2 rounded-xl text-[#0c326f] bg-[#F0F4FA] hover:bg-[#E8F0FE] hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0c326f]"
              aria-label={isExpanded ? 'Recolher sub-unidades' : 'Expandir sub-unidades'}
              title={isExpanded ? 'Recolher sub-unidades' : 'Expandir sub-unidades'}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            </div>
          )}

          {/* Dados Textuais e Tags Técnicas */}
          <div className="flex-1 min-w-0">
            {/* Linha 1: Badges de Identificação Técnica */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Código Técnico */}
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0c326f] bg-[#0c326f]/10 px-2.5 py-0.5 rounded-md border border-[#0c326f]/20 tabular-nums">
                {code}
              </span>

              {/* Sigla Oficial */}
              {acronym && (
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {acronym}
                </span>
              )}

              {/* Tipo da Unidade com Ícone */}
              <OrgTypeBadge type={type} />

              {/* Nível e Path Materializado */}
              <span className="text-xs font-mono text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200 tabular-nums font-semibold">
                Nível {level} • Path {path}
              </span>

              {/* Status Ativo / Inativo */}
              <StatusChip label={isActive ? 'Ativo' : 'Inativo'} variant={isActive ? 'success' : 'neutral'} />

              {/* Badge de quantidade de sub-unidades se tiver filhos */}
              {hasChildren && childrenCount > 0 && (
                <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 tabular-nums">
                  {childrenCount} {childrenCount === 1 ? 'sub-unidade' : 'sub-unidades'}
                </span>
              )}
            </div>

            {/* Linha 2: Nome da Unidade em #0c326f BOLD */}
            <h3 className="text-lg sm:text-xl font-bold text-[#0c326f] tracking-tight leading-snug truncate">
              {name}
            </h3>

            {/* Linha 3: Gestores Responsáveis e Contagem de Servidores */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 mt-2 text-xs sm:text-sm">
              {responsibles.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">
                    {responsibles[0].name.charAt(0).toUpperCase()}
                  </div>
                  <span>
                    <strong className="text-emerald-800">Gestor Responsável:</strong>{' '}
                    {responsibles.map((r) => r.name).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs italic font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sem gestor titular vinculado</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-slate-700 font-mono tabular-nums font-bold text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                <Users className="w-4 h-4 text-slate-600" />
                <span>
                  {usersCount} {usersCount === 1 ? 'servidor lotado' : 'servidores lotados'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Ações de Gestão (Subordinar, Servidores, Mover, Editar, Inativar) */}
        <div className="flex items-center gap-2 shrink-0 self-end xl:self-center pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200/70 w-full xl:w-auto justify-end">
          {onAddChild && (
            <button
              type="button"
              onClick={() => onAddChild(id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-300 shadow-2xs cursor-pointer"
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
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200 shadow-2xs cursor-pointer"
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
              className="p-2 rounded-xl text-slate-700 hover:text-[#0c326f] hover:bg-[#E8F0FE] border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
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
              className="p-2 rounded-xl text-slate-700 hover:text-amber-700 hover:bg-amber-50 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
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
              className="p-2 rounded-xl text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
              title="Inativar ou excluir unidade"
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
