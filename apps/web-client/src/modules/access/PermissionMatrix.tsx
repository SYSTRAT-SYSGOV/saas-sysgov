import React, { useEffect, useState, useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { useExport } from '@/core/export';
import { accessApi, AccessMatrixRow, OrgUnitNode } from './AccessApi';
import { PageHeader, Card, DataTable, ScreenState, Button, Badge, SearchInput } from '@/components/ui';
import { Download, LayoutGrid } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const AccessBadge: React.FC<{ status: string; expiring?: boolean; validTo?: string | null }> = ({ status, expiring, validTo }) => {
  if (expiring) return <Badge variant="warning">Expirando</Badge>;
  if (status === 'active') return <Badge variant="success">Ativo</Badge>;
  if (status === 'revoked') return <Badge variant="danger">Revogado</Badge>;
  if (status === 'expired') return <Badge variant="neutral">Expirado</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
};

interface PermissionMatrixProps {}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = () => {
  const { tenant } = useTenant();
  const { exportData } = useExport();
  const [matrix, setMatrix] = useState<AccessMatrixRow[]>([]);
  const [units, setUnits] = useState<OrgUnitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([accessApi.matrix(), accessApi.orgUnits()])
      .then(([m, u]) => {
        setMatrix(m);
        setUnits(u);
      })
      .catch(() => setError('Erro ao carregar matriz de permissões.'))
      .finally(() => setLoading(false));
  }, []);

  const flatUnits: OrgUnitNode[] = useMemo(() => {
    const flat: OrgUnitNode[] = [];
    const buildFlat = (nodes: OrgUnitNode[]) => {
      nodes.forEach((n) => {
        flat.push(n);
        if (n.children?.length) buildFlat(n.children);
      });
    };
    buildFlat(units);
    return flat;
  }, [units]);

  const unitName = (id: number) => flatUnits.find((u) => u.id === id)?.name ?? `#${id}`;
  const scopeDisplay = (row: AccessMatrixRow) =>
    row.all_org_units ? 'Todas' : row.org_unit_ids.length === 0 ? '—' : row.org_unit_ids.map(unitName).join(', ');

  const columns: ColumnDef<AccessMatrixRow, any>[] = useMemo(() => [
    { id: 'user_name', header: 'Usuário', accessorKey: 'user_name', cell: ({ row }) => <span className="font-medium text-foreground">{row.original.user_name}</span> },
    { id: 'user_email', header: 'E-mail', accessorKey: 'user_email', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.user_email}</span> },
    { id: 'module', header: 'Módulo', accessorKey: 'module', cell: ({ row }) => <span className="font-mono font-bold text-foreground">{row.original.module}</span> },
    { id: 'role', header: 'Papel', accessorKey: 'role', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.role}</span> },
    { id: 'scope', header: 'Secretarias', cell: ({ row }) => <span className="max-w-[160px] truncate block" title={scopeDisplay(row.original)}>{scopeDisplay(row.original)}</span> },
    { id: 'can_manage_users', header: 'Admin', cell: ({ row }) => row.original.can_manage_users ? <Badge variant="warning">Sim</Badge> : <span className="text-muted-foreground text-xs">Não</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <AccessBadge status={row.original.status} expiring={row.original.expiring} validTo={row.original.valid_to} /> },
    { id: 'valid_to', header: 'Vigência', accessorKey: 'valid_to', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{formatDate(row.original.valid_to)}</span> },
    { id: 'granted_by', header: 'Concedido por', accessorKey: 'granted_by', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.granted_by ?? '—'}</span> },
  ], [flatUnits]);

  const filtered = useMemo(() => {
    if (!search.trim()) return matrix;
    const q = search.toLowerCase();
    return matrix.filter((r) =>
      [r.user_name, r.user_email, r.module, r.role, r.granted_by].some((v) => v?.toLowerCase().includes(q))
    );
  }, [matrix, search]);

  const exportMatrix = () => {
    const rows = filtered.map((r) => ({
      Usuario: r.user_name,
      Email: r.user_email,
      Modulo: r.module,
      Papel: r.role,
      Secretarias: scopeDisplay(r),
      Admin: r.can_manage_users ? 'Sim' : 'Não',
      Status: r.status,
      Vigencia: formatDate(r.valid_to),
      ConcedidoPor: r.granted_by ?? '',
    }));
    exportData(rows, { filename: `matriz-acessos-${new Date().toISOString().split('T')[0]}`, format: 'csv', BOM: true });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<LayoutGrid className="h-6 w-6" />} title="Matriz de Permissões" subtitle={`${tenant?.name} — Visão consolidada de acessos por usuário e módulo`} />
        <ScreenState type="loading" title="Carregando matriz..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<LayoutGrid className="h-6 w-6" />} title="Matriz de Permissões" subtitle={`${tenant?.name} — Visão consolidada de acessos por usuário e módulo`} />
        <ScreenState type="error" title="Erro ao carregar" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutGrid className="h-6 w-6" />}
        title="Matriz de Permissões"
        subtitle={`${tenant?.name} — Visão consolidada de acessos por usuário e módulo`}
        actions={<Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportMatrix}>Exportar CSV</Button>}
      />

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por usuário, módulo ou papel..." />
        </div>
        <div className="p-3">
          <DataTable columns={columns} data={filtered} emptyText="Nenhum acesso encontrado." pageSize={15} />
        </div>
      </Card>
    </div>
  );
};

export default PermissionMatrix;
