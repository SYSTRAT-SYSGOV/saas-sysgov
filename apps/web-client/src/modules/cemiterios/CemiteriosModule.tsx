import React, { useState, useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Cross, MapPin, Search, Plus, Calendar } from 'lucide-react';
import { PageHeader, Card, Button, KpiCard, StatusChip, DataTable, SearchInput } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';

interface Registro {
  id: string;
  cemetery: string;
  lote: string;
  falecido: string;
  dataSepultamento: string;
  responsavel: string;
  concessao: string;
}

const registros: Registro[] = [
  { id: '1', cemetery: 'Cemitério Municipal Central', lote: 'Quadra B • Lote 142', falecido: 'Antônio Carlos da Costa', dataSepultamento: '12/04/2024', responsavel: 'Família Costa', concessao: 'Perpétua' },
  { id: '2', cemetery: 'Cemitério Municipal Central', lote: 'Quadra C • Lote 087', falecido: 'Maria Aparecida Santos', dataSepultamento: '28/05/2024', responsavel: 'Carlos Santos', concessao: 'Temporária' },
  { id: '3', cemetery: 'Cemitério São José', lote: 'Bloco A • Nicho 234', falecido: 'João Paulo Oliveira', dataSepultamento: '03/07/2024', responsavel: 'Família Oliveira', concessao: 'Perpétua' },
  { id: '4', cemetery: 'Cemitério Nossa Senhora Aparecida', lote: 'Quadra D • Lote 015', falecido: 'Ana Rodrigues Lima', dataSepultamento: '15/08/2024', responsavel: 'Roberto Lima', concessao: 'Temporária' },
];

const concessaoVariant = (c: string): 'success' | 'warning' | 'neutral' => {
  if (c === 'Perpétua') return 'success';
  if (c === 'Temporária') return 'warning';
  return 'neutral';
};

export const CemiteriosModule: React.FC = () => {
  const { tenant } = useTenant();
  const [search, setSearch] = useState('');

  const columns = useMemo<ColumnDef<Registro, any>[]>(() => [
    {
      id: 'cemiterio',
      header: 'Cemitério / Jazigo',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground">{row.original.cemetery}</span>
          <span className="block font-mono text-xs text-muted-foreground">{row.original.lote}</span>
        </div>
      ),
    },
    {
      id: 'falecido',
      header: 'Nome do Falecido',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.falecido}</span>,
    },
    {
      id: 'data',
      header: 'Data Sepultamento',
      cell: ({ row }) => <span className="font-mono text-muted-foreground text-center block">{row.original.dataSepultamento}</span>,
    },
    {
      id: 'responsavel',
      header: 'Concessionário / Responsável',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.responsavel}</span>,
    },
    {
      id: 'concessao',
      header: 'Status da Concessão',
      cell: ({ row }) => <StatusChip label={row.original.concessao} variant={concessaoVariant(row.original.concessao)} />,
    },
  ], []);

  const filtered = useMemo(() => registros.filter((r) =>
    [r.falecido, r.cemetery, r.responsavel].some((t) => t.toLowerCase().includes(search.toLowerCase()))
  ), [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Cross className="h-6 w-6" />}
        title="Gestão de Cemitérios Municipais & Jazigos"
        badge="Serviços Funerários"
        subtitle={`${tenant?.name} — Sepultamentos, concessões de jazigos e certidões`}
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Novo Registro</Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cemitérios Municipais"
          value="4"
          icon={<Cross className="w-5 h-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Jazigos Ocupados"
          value="8.420"
          subtitle="Taxa de ocupação: 82%"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-warning/10 text-warning"
        />
        <KpiCard
          title="Concessões Vigentes"
          value="6.110"
          icon={<Calendar className="w-5 h-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Sepultamentos no Mês"
          value="42"
          icon={<Cross className="w-5 h-5" />}
          iconBgColor="bg-success/10 text-success"
        />
      </div>

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar falecido, jazigo ou responsável..." />
        </div>
        <div className="p-3">
          <DataTable columns={columns} data={filtered} emptyText="Nenhum registro encontrado." pageSize={10} />
        </div>
      </Card>
    </div>
  );
};

export default CemiteriosModule;
