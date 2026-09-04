import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Users, Briefcase, FileCheck2, UserCheck, Plus } from 'lucide-react';
import { PageHeader, Card, Button, KpiCard, DataTable, StatusChip, Badge } from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';
import type { ColumnDef } from '@tanstack/react-table';

interface Servidor {
  matricula: string; nome: string; cargo: string; secretaria: string; vinculo: string;
}

const servidores: Servidor[] = [
  { matricula: '001234', nome: 'Ana Beatriz Moreira', cargo: 'Professor III', secretaria: 'Educação', vinculo: 'Efetivo' },
  { matricula: '001567', nome: 'Carlos Eduardo Lima', cargo: 'Médico Clínico Geral', secretaria: 'Saúde', vinculo: 'Efetivo' },
  { matricula: '002345', nome: 'Diana Ferreira Santos', cargo: 'Técnico Administrativo', secretaria: 'Administração', vinculo: 'Comissionado' },
  { matricula: '004567', nome: 'Fernando Almeida Neto', cargo: 'Engenheiro Civil', secretaria: 'Obras', vinculo: 'Efetivo' },
];

export const RhModule: React.FC = () => {
  const { tenant } = useTenant();

  const columns: ColumnDef<Servidor, any>[] = [
    { id: 'matricula', header: 'Matrícula', accessorKey: 'matricula', cell: ({ row }) => <span className="font-mono font-bold text-foreground tabular-nums">{row.original.matricula}</span> },
    { id: 'nome', header: 'Nome', accessorKey: 'nome', cell: ({ row }) => <span className="font-medium text-foreground">{row.original.nome}</span> },
    { id: 'cargo', header: 'Cargo', accessorKey: 'cargo', cell: ({ row }) => <span className="text-muted-foreground">{row.original.cargo}</span> },
    { id: 'secretaria', header: 'Secretaria', accessorKey: 'secretaria', cell: ({ row }) => <Badge variant="info">{row.original.secretaria}</Badge> },
    { id: 'vinculo', header: 'Vínculo', cell: ({ row }) => <StatusChip label={row.original.vinculo} variant={row.original.vinculo === 'Efetivo' ? 'success' : 'warning'} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<Users className="h-6 w-6" />} title="Recursos Humanos & Folha de Pagamento" badge="eSocial Homologado"
        subtitle={`${tenant?.name} — Quadro de servidores ativos (conforme eSocial)`}
        actions={<Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Novo Servidor</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total de Servidores" value="1.247" subtitle="Ativos na folha" icon={<Users className="h-5 w-5" />} iconBgColor="bg-primary/10 text-primary" />
        <KpiCard title="Folha Bruta" value={formatCurrencyBRL(8425000)} subtitle="Mensal (R$)" icon={<Briefcase className="h-5 w-5" />} iconBgColor="bg-success/10 text-success" />
        <KpiCard title="Encargos" value={formatCurrencyBRL(2106000)} subtitle="INSS + FGTS mensal" icon={<FileCheck2 className="h-5 w-5" />} iconBgColor="bg-warning/15 text-warning" />
        <KpiCard title="Comissionados" value="43" subtitle="Cargos de livre nomeação" icon={<UserCheck className="h-5 w-5" />} iconBgColor="bg-status-info-bg text-status-info" />
      </div>

      <Card noPadding><div className="p-3"><DataTable columns={columns} data={servidores} emptyText="Nenhum servidor encontrado." pageSize={10} /></div></Card>
    </div>
  );
};

export default RhModule;