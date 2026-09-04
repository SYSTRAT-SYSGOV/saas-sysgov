import React, { useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { GraduationCap, Users, School, Award, Plus, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Card, Button, KpiCard, DataTable, StatusChip, Badge } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';

interface Escola {
  id: string;
  nome: string;
  tipo: string;
  bairro: string;
  inep: string;
  alunos: number;
  turmas: number;
  ideb: number | null;
  situacao: string;
}

const escolas: Escola[] = [
  { id: '1', nome: 'Escola Municipal Presidente Kennedy', tipo: 'Ensino Fundamental', bairro: 'Centro', inep: '4104501', alunos: 840, turmas: 28, ideb: 6.8, situacao: 'Regular' },
  { id: '2', nome: 'CMEI Cantinho Feliz', tipo: 'Educação Infantil', bairro: 'Costeira', inep: '4109823', alunos: 310, turmas: 12, ideb: null, situacao: 'Fila Zerada' },
  { id: '3', nome: 'Escola Municipal Vila Nova', tipo: 'Ensino Fundamental', bairro: 'Vila Nova', inep: '4105672', alunos: 620, turmas: 22, ideb: 5.9, situacao: 'Em Monitoramento' },
  { id: '4', nome: 'CMEI Arco-Íris', tipo: 'Educação Infantil', bairro: 'Jardim das Acácias', inep: '4103456', alunos: 180, turmas: 8, ideb: null, situacao: 'Regular' },
];

const situacaoVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'Regular' || s === 'Fila Zerada') return 'success';
  if (s === 'Em Monitoramento') return 'warning';
  if (s === 'Crítico') return 'danger';
  return 'neutral';
};

export const PedagogicoModule: React.FC = () => {
  const { tenant } = useTenant();

  const columns = useMemo<ColumnDef<Escola, any>[]>(() => [
    {
      id: 'nome',
      header: 'Unidade Escolar / Região',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground">{row.original.nome}</span>
          <span className="block text-[11px] text-muted-foreground">{row.original.bairro} • Código INEP {row.original.inep}</span>
        </div>
      ),
    },
    {
      id: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.tipo}</span>,
    },
    {
      id: 'alunos',
      header: 'Alunos',
      cell: ({ row }) => <span className="font-mono tabular-nums font-bold text-foreground text-right block">{row.original.alunos}</span>,
    },
    {
      id: 'turmas',
      header: 'Turmas',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-right block">{row.original.turmas}</span>,
    },
    {
      id: 'ideb',
      header: 'IDEB',
      cell: ({ row }) => row.original.ideb
        ? <span className="font-mono tabular-nums font-bold text-success text-center block">{row.original.ideb}</span>
        : <span className="text-muted-foreground text-center block">—</span>,
    },
    {
      id: 'situacao',
      header: 'Situação',
      cell: ({ row }) => <StatusChip label={row.original.situacao} variant={situacaoVariant(row.original.situacao)} />,
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        title="Gestão Pedagógica & Censo Escolar"
        badge="Rede Municipal"
        subtitle={`${tenant?.name} — Matrículas, IDEB, turmas e lotação docente`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>Censo Escolar</Button>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Nova Matrícula</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Alunos Matriculados"
          value="24.890"
          subtitle="Ativos na rede"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Unidades Escolares"
          value="48"
          subtitle="32 Escolas e 16 CMEIs"
          icon={<School className="w-5 h-5" />}
          iconBgColor="bg-success/10 text-success"
        />
        <KpiCard
          title="Docentes Ativos"
          value="1.420"
          icon={<GraduationCap className="w-5 h-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="IDEB Médio (Anos Iniciais)"
          value="6.4"
          subtitle="Meta 2026: 6.2"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-success/10 text-success"
        />
      </div>

      <Card noPadding>
        <div className="p-3">
          <DataTable columns={columns} data={escolas} emptyText="Nenhuma unidade escolar encontrada." pageSize={10} />
        </div>
      </Card>
    </div>
  );
};

export default PedagogicoModule;
