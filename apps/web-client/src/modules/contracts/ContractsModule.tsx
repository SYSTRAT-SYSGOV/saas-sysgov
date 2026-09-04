import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Plus, Download, FileText, Search } from 'lucide-react';
import { PageHeader, Card, Button, StatusChip, DataTable, EmptyState, SearchInput, Badge, ScreenState } from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';
import { apiClient } from '@/core/api/client';
import type { ColumnDef } from '@tanstack/react-table';

interface ContractApiResponse {
  id: number;
  number: string;
  title: string;
  contract_type: string;
  supplier_name: string;
  supplier_cnpj: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  total_addenda_amount_cents: number;
  status: string;
}

interface ContractsResponse {
  data: ContractApiResponse[];
  total: number;
  current_page: number;
  per_page: number;
}

const statusVariantMap: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  draft: 'info',
  active: 'success',
  in_renewal: 'warning',
  suspended: 'warning',
  ended: 'neutral',
  cancelled: 'danger',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Regular',
  in_renewal: 'Em Renovação',
  suspended: 'Suspenso',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
};

export const ContractsModule: React.FC = () => {
  const { tenant } = useTenant();
  const [contracts, setContracts] = useState<ContractApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ContractsResponse>('/contracts');
      setContracts(res.data?.data ?? []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao carregar contratos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const columns = useMemo<ColumnDef<ContractApiResponse, any>[]>(() => [
    {
      id: 'number',
      header: 'Contrato / Objeto',
      accessorKey: 'number',
      cell: ({ row }) => (
        <div>
          <span className="font-mono font-bold text-foreground">{row.original.number}</span>
          <span className="block text-[11px] text-muted-foreground truncate max-w-[280px]">{row.original.title}</span>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Contratada / CNPJ',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.supplier_name ?? '-'}</span>
          <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">
            {row.original.supplier_cnpj ?? '-'}
          </span>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Valor Global',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums font-bold text-foreground text-right block">
          {formatCurrencyBRL(row.original.amount_cents / 100)}
        </span>
      ),
    },
    {
      id: 'executed',
      header: 'Executado',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-muted-foreground text-right block">
          {formatCurrencyBRL((row.original.amount_cents + row.original.total_addenda_amount_cents) / 100)}
        </span>
      ),
    },
    {
      id: 'ends_at',
      header: 'Término Vigência',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-center block">
          {formatDate(row.original.ends_at)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusChip
          label={statusLabelMap[row.original.status] ?? row.original.status}
          variant={statusVariantMap[row.original.status] ?? 'neutral'}
        />
      ),
    },
  ], []);

  const filtered = useMemo(() => contracts.filter((c) =>
    [c.number, c.title, c.supplier_name].some((t) => t?.toLowerCase().includes(search.toLowerCase()))
  ), [contracts, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<FileText className="h-6 w-6" />}
          title="Contratos Administrativos & Aditivos"
          badge="Fiscalização Ativa"
          subtitle={`${tenant?.name} — Fiscalização, aditivos, reajustes e cronogramas financeiros`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>Exportar</Button>
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Novo Contrato</Button>
            </div>
          }
        />
        <ScreenState type="loading" title="Carregando contratos..." />
      </div>
    );
  }

  if (error && contracts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<FileText className="h-6 w-6" />}
          title="Contratos Administrativos & Aditivos"
          badge="Fiscalização Ativa"
          subtitle={`${tenant?.name} — Fiscalização, aditivos, reajustes e cronogramas financeiros`}
        />
        <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title="Contratos Administrativos & Aditivos"
        badge="Fiscalização Ativa"
        subtitle={`${tenant?.name} — Fiscalização, aditivos, reajustes e cronogramas financeiros`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>Exportar</Button>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Novo Contrato</Button>
          </div>
        }
      />

      <Card noPadding>
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número, objeto ou contratada..." />
        </div>
        <div className="p-3">
          <DataTable columns={columns} data={filtered} emptyText="Nenhum contrato encontrado." pageSize={10} />
        </div>
      </Card>
    </div>
  );
};

export default ContractsModule;
