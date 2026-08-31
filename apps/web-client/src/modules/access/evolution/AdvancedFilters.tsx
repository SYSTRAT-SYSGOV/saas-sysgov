import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { AccessModule, OrgUnitNode, AccessGroup, AccessCategory, Cargo } from '../AccessApi';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

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
 * Filtros avançados da lista de usuários (server-side).
 * Usa <select> nativo (não customizado) para máxima estabilidade — paleta GOV.BR.
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ modules, units, groups, categories, cargos, filters, onChange }) => {
  const active = Number(Boolean(filters.module)) + Number(Boolean(filters.org_unit_id)) + Number(Boolean(filters.group_id)) + Number(Boolean(filters.category_id)) + Number(Boolean(filters.cargo_id));
  const flatUnits = flattenUnits(units);

  const selectCls = 'w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-foreground/70 mb-1';

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Filter className="h-3.5 w-3.5 text-primary" /> Filtros avançados
          {active > 0 && <Badge variant="primary">{active}</Badge>}
        </span>
        {active > 0 && (
          <button
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className={labelCls}>Módulo</label>
          <select value={filters.module ?? ''} onChange={(e) => onChange({ ...filters, module: e.target.value || undefined })} className={selectCls}>
            <option value="">Todos os módulos</option>
            {modules.map((m) => <option key={m.alias} value={m.alias}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Secretaria / Departamento</label>
          <select value={filters.org_unit_id ?? ''} onChange={(e) => onChange({ ...filters, org_unit_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todas as unidades</option>
            {flatUnits.map(({ node, depth }) => (
              <option key={node.id} value={node.id}>{'\u00A0'.repeat(depth * 2)}{node.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <select value={filters.category_id ?? ''} onChange={(e) => onChange({ ...filters, category_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Grupo</label>
          <select value={filters.group_id ?? ''} onChange={(e) => onChange({ ...filters, group_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todos os grupos</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Cargo</label>
          <select value={filters.cargo_id ?? ''} onChange={(e) => onChange({ ...filters, cargo_id: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
            <option value="">Todos os cargos</option>
            {cargos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </Card>
  );
};