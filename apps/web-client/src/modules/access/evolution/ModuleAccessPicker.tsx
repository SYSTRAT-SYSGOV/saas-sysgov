import React from 'react';
import { OrgUnitNode } from '../AccessApi';
import { formatDate } from './AccessBadge';

interface ModuleAccessPickerProps {
  units: OrgUnitNode[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  canManageUsers: boolean;
  onToggleManageUsers: (v: boolean) => void;
  role: string;
  onRoleChange: (role: string) => void;
  validTo?: string;
  onValidToChange?: (v: string) => void;
  disabled?: boolean;
}

/**
 * Seletor de acesso a um módulo: papel, secretarias (árvore com herança por path)
 * e vigência opcional. Reutiliza a árvore de OrgUnit.
 */
export const ModuleAccessPicker: React.FC<ModuleAccessPickerProps> = ({
  units,
  selectedIds,
  onChange,
  allSelected,
  onToggleAll,
  canManageUsers,
  onToggleManageUsers,
  role,
  onRoleChange,
  validTo,
  onValidToChange,
  disabled,
}) => {
  const toggleNode = (node: OrgUnitNode) => {
    const nodeAndDesc = [node.id, ...collectDescendants(node)];
    const all = nodeAndDesc.every((id) => selectedIds.includes(id));
    const next = all
      ? selectedIds.filter((id) => !nodeAndDesc.includes(id))
      : [...selectedIds, ...nodeAndDesc.filter((id) => !selectedIds.includes(id))];
    onChange(next);
  };

  const renderNode = (node: OrgUnitNode, depth: number): React.ReactNode => {
    const hasDesc = (node.children?.length ?? 0) > 0;
    const nodeAndDesc = [node.id, ...collectDescendants(node)];
    const checked = nodeAndDesc.every((id) => selectedIds.includes(id));
    const partial = nodeAndDesc.some((id) => selectedIds.includes(id)) && !checked;

    return (
      <div key={node.id} style={{ paddingLeft: depth * 16 }}>
        <label className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-gov-primary/5 rounded px-1">
          <input
            type="checkbox"
            checked={checked}
            ref={(el) => {
              if (el) el.indeterminate = partial;
            }}
            disabled={disabled}
            onChange={() => toggleNode(node)}
            className="accent-gov-primary"
          />
          <span className={hasDesc ? 'font-semibold text-gov-text-primary' : 'text-gov-text-secondary'}>
            {node.name}
          </span>
          <span className="text-[10px] font-mono text-gov-text-muted">{node.code}</span>
        </label>
        {node.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Papel no módulo</label>
          <select
            value={role}
            disabled={disabled}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-xs text-gov-text-primary focus:outline-none focus:ring-2 focus:ring-gov-primary/30"
          >
            <option value="admin">Administrador</option>
            <option value="editor">Editor</option>
            <option value="viewer">Somente leitura</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Vigência (opcional)</label>
          <input
            type="date"
            value={validTo ?? ''}
            disabled={disabled || !onValidToChange}
            onChange={(e) => onValidToChange?.(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-xs text-gov-text-primary focus:outline-none focus:ring-2 focus:ring-gov-primary/30"
          />
          {validTo && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
              Expira em {formatDate(validTo)} — o acesso será revogado automaticamente.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gov-text-secondary">Secretarias (escopo de dados)</span>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={allSelected} disabled={disabled} onChange={onToggleAll} className="accent-gov-primary" />
            Todas as secretarias
          </label>
        </div>
        {!allSelected && (
          <div className="max-h-56 overflow-y-auto border border-gov-border rounded-lg p-2 bg-slate-50/50 dark:bg-slate-800/50">
            {units.length === 0 ? (
              <p className="text-xs text-gov-text-muted p-2">
                Nenhuma secretaria cadastrada. Inicialize o Organograma primeiro.
              </p>
            ) : (
              units.map((n) => renderNode(n, 0))
            )}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={canManageUsers}
          disabled={disabled}
          onChange={(e) => onToggleManageUsers(e.target.checked)}
          className="accent-gov-primary"
        />
        <span className="text-gov-text-primary">Administrador do módulo (pode gerenciar usuários deste módulo)</span>
      </label>
    </div>
  );
};

function collectDescendants(node: OrgUnitNode): number[] {
  const out: number[] = [];
  node.children?.forEach((c) => {
    out.push(c.id);
    out.push(...collectDescendants(c));
  });
  return out;
}
