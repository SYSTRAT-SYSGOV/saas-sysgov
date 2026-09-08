import React, { useState, useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { useCan } from '@/core/rbac/useCan';
import { useExport } from '@/core/export';
import { Plus, FileCheck, Building2, Download } from 'lucide-react';
import { PageHeader, Card, Badge, Button, StatusChip, DataTable, EmptyState, SearchInput, Accordion } from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';
import type { ColumnDef } from '@tanstack/react-table';

interface Licitacao {
  id: string; numero: string; modalidade: string; objeto: string;
  valorEstimado: number; dataAbertura: string; fase: string;
}

const licitacoes: Licitacao[] = [
  { id: '1', numero: 'PE 034/2026', modalidade: 'Pregão Eletrônico', objeto: 'Aquisição de combustíveis para frota municipal.', valorEstimado: 4250000, dataAbertura: '04/09/2026 09:00', fase: 'Publicado' },
  { id: '2', numero: 'CC 008/2026', modalidade: 'Concorrência Pública', objeto: 'Construção de CMEI no Bairro Costeira.', valorEstimado: 6890150, dataAbertura: '22/09/2026 14:00', fase: 'Em Andamento' },
  { id: '3', numero: 'PE 029/2026', modalidade: 'Pregão Eletrônico', objeto: 'Link dedicado de internet e fibra óptica.', valorEstimado: 890000, dataAbertura: '15/08/2026 10:00', fase: 'Homologado' },
  { id: '4', numero: 'DL 015/2026', modalidade: 'Dispensa de Licitação', objeto: 'Aquisição emergencial de medicamentos.', valorEstimado: 142300, dataAbertura: '10/08/2026 08:30', fase: 'Homologado' },
  { id: '5', numero: 'PE 041/2026', modalidade: 'Pregão Eletrônico', objeto: 'Serviços de vigilância patrimonial 24h.', valorEstimado: 2150000, dataAbertura: '12/10/2026 09:00', fase: 'Em Andamento' },
  { id: '6', numero: 'TP 002/2026', modalidade: 'Tomada de Preços', objeto: 'Pavimentação asfáltica de ruas do bairro Industrial.', valorEstimado: 3780000, dataAbertura: '30/10/2026 10:00', fase: 'Planejamento' },
];

const faseVariant = (fase: string) => {
  if (fase === 'Homologado') return 'success' as const;
  if (fase === 'Em Andamento') return 'warning' as const;
  if (fase === 'Publicado') return 'info' as const;
  return 'neutral' as const;
};

export const ProcurementModule: React.FC = () => {
  const { tenant } = useTenant();
  const { can } = useCan();
  const { exportData } = useExport();
  const [search, setSearch] = useState('');

  const columns = useMemo<ColumnDef<Licitacao, any>[]>(() => [
    { id: 'numero', header: 'Nº Processo', accessorKey: 'numero', cell: ({ row }) => <span className="font-mono font-bold text-foreground">{row.original.numero}</span> },
    { id: 'modalidade', header: 'Modalidade', accessorKey: 'modalidade', cell: ({ row }) => <span className="text-muted-foreground">{row.original.modalidade}</span> },
    { id: 'objeto', header: 'Objeto', accessorKey: 'objeto', cell: ({ row }) => <span className="max-w-xs truncate text-foreground">{row.original.objeto}</span> },
    { id: 'valor', header: 'Valor Estimado', accessorKey: 'valorEstimado', cell: ({ row }) => <span className="font-mono tabular-nums font-bold text-foreground">{formatCurrencyBRL(row.original.valorEstimado)}</span> },
    { id: 'data', header: 'Abertura', accessorKey: 'dataAbertura', cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.dataAbertura}</span> },
    { id: 'fase', header: 'Fase', cell: ({ row }) => <StatusChip label={row.original.fase} variant={faseVariant(row.original.fase)} /> },
  ], []);

  const filtered = useMemo(() => licitacoes.filter((l) =>
    [l.numero, l.objeto, l.modalidade].some((t) => t.toLowerCase().includes(search.toLowerCase()))
  ), [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileCheck className="h-6 w-6" />}
        title="Licitações, Editais & Compras Públicas"
        badge="Lei 14.133/2021"
        subtitle={`${tenant?.name} — Acompanhamento de processos licitatórios`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => exportData(filtered, { filename: `licitacoes-${new Date().toISOString().split('T')[0]}`, format: 'csv', BOM: true })}>
              Exportar
            </Button>
            {can('procurement.create') && (
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Novo Processo</Button>
            )}
          </div>
        }
      />

      <Card className="gap-0 py-0">
        <Accordion
          icon={<Building2 className="h-4 w-4 text-primary" />}
          items={[{
            value: 'filtros',
            title: <span>Filtros e busca</span>,
            children: (
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número, modalidade ou objeto..." />
            ),
          }]}
        />
      </Card>

      <Card className="gap-0 py-0">
        <div className="p-3">
          <DataTable columns={columns} data={filtered} emptyText="Nenhuma licitação encontrada." pageSize={10} />
        </div>
      </Card>
    </div>
  );
};

export default ProcurementModule;