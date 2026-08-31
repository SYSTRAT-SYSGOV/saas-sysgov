import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { AccessModule, OrgUnitNode, AccessGroup, AccessCategory, Cargo } from '../AccessApi';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
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
 * Filtros avançados da lista de usuários (server-side) — redesenhado com shadcn/GOV.BR.
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ modules, units, groups, categories, cargos, filters, onChange }) => {
  const active = Number(Boolean(filters.module)) + Number(Boolean(filters.org_unit_id)) + Number(Boolean(filters.group_id)) + Number(Boolean(filters.category_id)) + Number(Boolean(filters.cargo_id));
  const flatUnits = flattenUnits(units);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
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
        <Select
          label="Módulo"
          value={filters.module ?? ''}
          onChange={(v) => onChange({ ...filters, module: v || undefined })}
          options={[
            { value: '', label: 'Todos os módulos' },
            ...modules.map((m) => ({ value: m.alias, label: m.name })),
          ]}
          placeholder="Todos"
        />
        <Select
          label="Secretaria / Departamento"
          value={filters.org_unit_id ?? ''}
          onChange={(v) => onChange({ ...filters, org_unit_id: v ? Number(v) : undefined })}
          options={[
            { value: '', label: 'Todas as unidades' },
            ...flatUnits.map(({ node, depth }) => ({ value: node.id, label: `${'\u00A0'.repeat(depth * 2)}${node.name}` })),
          ]}
          placeholder="Todas"
        />
        <Select
          label="Categoria"
          value={filters.category_id ?? ''}
          onChange={(v) => onChange({ ...filters, category_id: v ? Number(v) : undefined })}
          options={[
            { value: '', label: 'Todas as categorias' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          placeholder="Todas"
        />
        <Select
          label="Grupo"
          value={filters.group_id ?? ''}
          onChange={(v) => onChange({ ...filters, group_id: v ? Number(v) : undefined })}
          options={[
            { value: '', label: 'Todos os grupos' },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
          ]}
          placeholder="Todos"
        />
        <Select
          label="Cargo"
          value={filters.cargo_id ?? ''}
          onChange={(v) => onChange({ ...filters, cargo_id: v ? Number(v) : undefined })}
          options={[
            { value: '', label: 'Todos os cargos' },
            ...cargos.map((c) => ({ value: c.id, label: c.name })),
          ]}
          placeholder="Todos"
        />
      </div>
    </Card>
  );
};