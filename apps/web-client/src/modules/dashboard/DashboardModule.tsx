import React, { useMemo, useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import {
  Building,
  DollarSign,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
  Landmark,
  TrendingUp,
  AlertTriangle,
  Handshake,
  CalendarClock,
  PiggyBank,
} from 'lucide-react';
import { Card, Badge, Button, KpiCard, StatusChip, AlertCard, DataTable, Tabs } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { formatCurrencyBRL, formatPercentBRL } from '@/config/theme';

interface ContractRow {
  numero: string;
  objeto: string;
  fornecedor: string;
  cnpj: string;
  valorGlobal: number;
  vigenciaFim: string;
  status: 'Regular' | 'Vencendo' | 'Crítico';
}

const contractData: ContractRow[] = [
  { numero: 'CT-048/2025', objeto: 'Manutenção preventiva da frota escolar', fornecedor: 'Auto Mecânica Paraná Ltda', cnpj: '04.128.940/0001-33', valorGlobal: 1480000, vigenciaFim: '15/12/2026', status: 'Regular' },
  { numero: 'CT-012/2026', objeto: 'Fornecimento de Merenda Escolar', fornecedor: 'Alimentos Sul Distribuidora', cnpj: '19.340.560/0001-98', valorGlobal: 3820500, vigenciaFim: '28/02/2027', status: 'Regular' },
  { numero: 'CT-089/2024', objeto: 'Pavimentação asfáltica bairros norte', fornecedor: 'Construtora Metropolitana S/A', cnpj: '76.890.111/0001-12', valorGlobal: 8940000, vigenciaFim: '18/09/2026', status: 'Vencendo' },
  { numero: 'CT-120/2026', objeto: 'Consultoria de gestão de resíduos', fornecedor: 'Verde Consultoria Ambiental', cnpj: '33.210.456/0001-77', valorGlobal: 456000, vigenciaFim: '30/11/2026', status: 'Vencendo' },
  { numero: 'CT-003/2026', objeto: 'Locação de veículos administrativos', fornecedor: 'Frota Total Locadora', cnpj: '11.450.222/0001-40', valorGlobal: 1890000, vigenciaFim: '31/12/2027', status: 'Regular' },
  { numero: 'CT-155/2023', objeto: 'Obra de reforma do Paço Municipal', fornecedor: 'Engenharia Alfa Construções', cnpj: '52.001.334/0001-90', valorGlobal: 12500000, vigenciaFim: '10/07/2026', status: 'Crítico' },
  { numero: 'CT-067/2026', objeto: 'Sistema de iluminação pública (LED)', fornecedor: 'Luminar Energia S/A', cnpj: '08.777.555/0001-21', valorGlobal: 7400000, vigenciaFim: '20/01/2028', status: 'Regular' },
];

export const DashboardModule: React.FC = () => {
  const { tenant } = useTenant();
  const [view, setView] = useState<'contratos' | 'empenhos'>('contratos');

  const receitaArrecadada = 348912450.2;
  const despesaLiquidada = 295140800.0;
  const limiteLRFPessoal = 46.82;

  const contractColumns = useMemo<ColumnDef<ContractRow, any>[]>(() => [
    {
      id: 'numero',
      header: 'Nº / Objeto',
      cell: ({ row }) => (
        <div className="text-left">
          <span className="block font-mono font-bold text-sm text-foreground">{row.original.numero}</span>
          <span className="block max-w-[240px] truncate text-xs text-muted-foreground">{row.original.objeto}</span>
        </div>
      ),
    },
    {
      id: 'fornecedor',
      header: 'Fornecedor / CNPJ',
      cell: ({ row }) => (
        <div className="text-left">
          <span className="block text-sm font-medium text-foreground">{row.original.fornecedor}</span>
          <span className="block font-mono text-xs text-muted-foreground tabular-nums">{row.original.cnpj}</span>
        </div>
      ),
    },
    {
      id: 'valor',
      header: 'Valor Global',
      accessorKey: 'valorGlobal',
      cell: ({ row }) => <span className="font-mono text-sm font-bold text-foreground tabular-nums">{formatCurrencyBRL(row.original.valorGlobal)}</span>,
    },
    {
      id: 'vigencia',
      header: 'Vigência',
      accessorKey: 'vigenciaFim',
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground tabular-nums">{row.original.vigenciaFim}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const variant = row.original.status === 'Regular' ? 'success' : row.original.status === 'Vencendo' ? 'warning' : 'danger';
        return <StatusChip label={row.original.status} variant={variant} />;
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="!p-6 sm:!p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-6 w-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Painel de Gestão Municipal</h1>
              <Badge variant="success" className="gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Ambiente Homologado
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Visão consolidada de execução orçamentária, contratos e conformidade fiscal de{' '}
              <strong className="text-foreground">{tenant?.name}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/contratos'}
              className="inline-flex items-center gap-2"
            >
              Contratos <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => window.location.href = '/financeiro'}
              className="inline-flex items-center gap-2"
            >
              Execução Financeira <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita Arrecadada"
          value={formatCurrencyBRL(receitaArrecadada)}
          icon={<DollarSign className="h-5 w-5" />}
          iconBgColor="bg-success/10 text-success"
          trend={{ value: '+12,4%', isPositive: true, label: 'vs. meta prevista' }}
        />
        <KpiCard
          title="Despesa Liquidada"
          value={formatCurrencyBRL(despesaLiquidada)}
          icon={<FileCheck className="h-5 w-5" />}
          iconBgColor="bg-status-info-bg text-status-info"
          subtitle="84,5% do limite empenhado"
        />
        <KpiCard
          title="Contratos Vigentes"
          value="142"
          icon={<Building className="h-5 w-5" />}
          iconBgColor="bg-warning/15 text-warning"
          statusBadge={<StatusChip label="6 vencem em < 30 dias" variant="warning" />}
        />
        <KpiCard
          title="Gasto com Pessoal (LRF)"
          value={formatPercentBRL(limiteLRFPessoal)}
          icon={<PiggyBank className="h-5 w-5" />}
          iconBgColor="bg-success/10 text-success"
          statusBadge={<StatusChip label="Regular (Teto: 54,0%)" variant="success" />}
        />
      </div>

      {/* Seção principal: DataTable de contratos + Alertas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3.5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold uppercase tracking-wide text-foreground sm:text-lg">
              Contratos Administrativos em Monitoramento
            </h2>
            <a href="/contratos" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Ver todos <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <Tabs
            items={[
              { key: 'contratos', label: 'Contratos', icon: <Handshake className="h-4 w-4" /> },
              { key: 'empenhos', label: 'Empenhos', icon: <FileCheck className="h-4 w-4" /> },
            ]}
            value={view}
            onChange={setView}
          />

          {view === 'contratos' && (
            <Card noPadding>
              <div className="p-3">
                <DataTable
                  columns={contractColumns}
                  data={contractData}
                  emptyText="Nenhum contrato em monitoramento."
                  searchable
                  searchPlaceholder="Buscar contrato ou fornecedor..."
                  pageSize={5}
                />
              </div>
            </Card>
          )}

          {view === 'empenhos' && (
            <Card className="p-8 text-center text-muted-foreground">
              <FileCheck className="mx-auto mb-3 h-12 w-12 text-border" />
              <p className="text-sm">Os empenhos serão carregados a partir do módulo de Execução Financeira.</p>
            </Card>
          )}
        </div>

        {/* Alertas & Semáforo Fiscal */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-foreground sm:text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" /> Alertas & Semáforo Fiscal
          </h2>

          <AlertCard
            priority="danger"
            title="Saldo de Empenho Crítico"
            tag="Ação 2045"
            description="Dotação orçamentária da Secretaria de Obras atingiu 98,2% da reserva autorizada na LOA."
            actionLabel="Ver Empenho"
            onAction={() => window.location.href = '/financeiro'}
          />

          <AlertCard
            priority="warning"
            title="TCE-PR: Prestação Bimestral"
            tag="D-5"
            description="Remessa do 4º bimestre do SIM-AM pendente de validação e transmissão eletrônica."
            actionLabel="Validar Remessa"
            onAction={() => window.location.href = '/financeiro'}
          />

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Próximos vencimentos</h3>
            </div>
            <div className="space-y-2">
              {contractData.filter((c) => c.status !== 'Regular').map((c) => (
                <div key={c.numero} className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2">
                  <span className="font-mono text-xs font-semibold text-foreground">{c.numero}</span>
                  <StatusChip label={c.status} variant={c.status === 'Vencendo' ? 'warning' : 'danger'} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Rodapé de contexto */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-success" />
            Indicadores atualizados com dados da execução orçamentária do município.
          </span>
          <CheckCircle2 className="h-4 w-4 text-success" />
        </div>
      </Card>
    </div>
  );
};

export default DashboardModule;
