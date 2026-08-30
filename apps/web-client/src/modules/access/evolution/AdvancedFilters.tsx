import React from 'react';
import { Filter, X } from 'lucide-react';
import { AccessModule, OrgUnitNode, AccessGroup, AccessCategory, Cargo } from '../AccessApi';

export interface UserFilters {
  q?: string;
  module?: string;
  org_unit_id?: number;
  group_id?: number;
  category_id?: number;
  cargo_id?: number;
}

interface AdvancedFiltersProps {
  modules: AccessModule[];
  units: OrgUnitNode[];
  groups: AccessGroup[];
  categories: AccessCategory[];
  cargos: Cargo[];
  filters: UserFilters;
  onChange: (f: UserFilters) => void;
}

function flattenUnits(nodes: OrgUnitNode[], depth = 0): { node: OrgUnitNode; depth: number }[] {
  const out: { node: OrgUnitNode; depth: number }[] = [];
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    if (n.children?.length) out.push(...flattenUnits(n.children, depth + 1));
  });
  return out;
}

/**
 * Filtros avançados da lista de usuários: por módulo, secretaria/departamento, grupo,
 * categoria e cargo. Dispara a consulta à API (filtros server-side).
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ modules, units, groups, categories, cargos, filters, onChange }) => {
  const active = Number(Boolean(filters.module)) + Number(Boolean(filters.org_unit_id)) + Number(Boolean(filters.group_id)) + Number(Boolean(filters.category_id)) + Number(Boolean(filters.cargo_id));

  const selectCls = 'w-full px-2.5 py-2 text-xs border border-gov-border rounded-lg bg-slate-50 dark:bg-slate-800 text-gov-text-primary focus:outline-none focus:ring-2 focus:ring-gov-primary/30';
  const labelCls = 'block text-[10px] font-semibold uppercase tracking-wider text-gov-text-secondary mb-1';

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gov-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-text-secondary">
          <Filter className="w-3.5 h-3.5" /> Filtros avançados {active > 0 && <span className="px-1.5 py-0.5 rounded-full bg-gov-primary text-white text-[10px]">{active}</span>}
        </span>
        {active > 0 && (
          <button onClick={() => onChange({})} className="inline-flex items-center gap-1 text-[11px] text-gov-text-muted hover:text-gov-text-primary">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className={labelCls}>Módulo</label>
          <select value={filters.module ?? ''} onChange={(e) => onChange({ ...filters, module: e.target.value || undefined })} className={selectCls}>
            <option value="">Todos</option>
            {modules.map((m) => <option key={m.alias} value={m.alias}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Secretaria / Departamento</label>
          <select value={filters.org_unit_id ?? ''} onChange={(e) => onChange({ ...filters, org_unit_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todas</option>
            {flattenUnits(units).map(({ node, depth }) => (
              <option key={node.id} value={node.id}>{'\u00A0'.repeat(depth * 2)}{node.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <select value={filters.category_id ?? ''} onChange={(e) => onChange({ ...filters, category_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Grupo</label>
          <select value={filters.group_id ?? ''} onChange={(e) => onChange({ ...filters, group_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todos</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Cargo</label>
          <select value={filters.cargo_id ?? ''} onChange={(e) => onChange({ ...filters, cargo_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todos</option>
            {cargos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};