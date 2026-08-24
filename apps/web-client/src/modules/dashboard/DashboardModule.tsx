import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { 
  Building, 
  DollarSign, 
  FileCheck, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  Card, 
  Button, 
  KpiCard, 
  StatusChip, 
  AlertCard, 
  Table, 
  TableHead, 
  TableHeaderCell, 
  TableBody, 
  TableRow, 
  TableCell 
} from '@/components/ui';
import { formatCurrencyBRL, formatPercentBRL } from '@/config/theme';

export const DashboardModule: React.FC = () => {
  const { tenant } = useTenant();

  // Fixture metrics conforming to the municipality profile
  const receitaArrecadada = 348912450.20;
  const despesaLiquidada = 295140800.00;
  const limiteLRFPessoal = 46.82;

  return (
    <div className="space-y-8">
      {/* Top Header Card DS Gov.br */}
      <Card className="!p-6 sm:!p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Painel de Gestão Municipal
              </h1>
              <StatusChip
                label="Ambiente Homologado"
                variant="success"
                icon={<ShieldCheck className="w-4 h-4" />}
              />
            </div>
            <p className="text-sm sm:text-base text-gov-text-secondary mt-2">
              Visão consolidada de execução orçamentária, contratos e conformidade fiscal de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Receita Arrecadada */}
        <KpiCard
          title="Receita Arrecadada"
          value={formatCurrencyBRL(receitaArrecadada)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          trend={{
            value: '+12,4%',
            isPositive: true,
            label: 'vs. meta prevista',
          }}
        />

        {/* Card 2: Despesa Liquidada */}
        <KpiCard
          title="Despesa Liquidada"
          value={formatCurrencyBRL(despesaLiquidada)}
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
          subtitle="84,5% do limite empenhado"
        />

        {/* Card 3: Contratos Vigentes */}
        <KpiCard
          title="Contratos Vigentes"
          value="142"
          icon={<Building className="w-5 h-5" />}
          iconBgColor="bg-status-warning-bg text-status-warning"
          statusBadge={
            <StatusChip
              label="6 vencem em < 30 dias"
              variant="warning"
            />
          }
        />

        {/* Card 4: Gasto com Pessoal (LRF) */}
        <KpiCard
          title="Gasto com Pessoal (LRF)"
          value={formatPercentBRL(limiteLRFPessoal)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          statusBadge={
            <StatusChip
              label="Regular (Teto: 54,0%)"
              variant="success"
            />
          }
        />
      </div>

      {/* 2-Column Responsive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table: Contratos Administrativos */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#0c326f] uppercase tracking-wide">
              Contratos Administrativos em Monitoramento
            </h2>
            <a
              href="/contratos"
              className="text-sm font-bold text-gov-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Nº / Objeto</TableHeaderCell>
                <TableHeaderCell>Fornecedor / CNPJ</TableHeaderCell>
                <TableHeaderCell className="text-right">Valor Global</TableHeaderCell>
                <TableHeaderCell className="text-center">Vigência</TableHeaderCell>
                <TableHeaderCell className="text-center">Status</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <span className="font-mono font-bold text-sm sm:text-base text-gov-text-primary block">CT-048/2025</span>
                  <span className="block text-gov-text-secondary text-xs sm:text-sm truncate max-w-[220px]">
                    Manutenção preventiva da frota escolar
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm sm:text-base text-gov-text-primary block">Auto Mecânica Paraná Ltda</span>
                  <span className="block font-mono text-xs text-gov-text-secondary tabular-nums">
                    04.128.940/0001-33
                  </span>
                </TableCell>
                <TableCell isTechnical className="text-right font-bold text-sm sm:text-base text-gov-text-primary">
                  {formatCurrencyBRL(1480000)}
                </TableCell>
                <TableCell isTechnical className="text-center text-sm sm:text-base text-gov-text-secondary">
                  15/12/2026
                </TableCell>
                <TableCell className="text-center">
                  <StatusChip label="Regular" variant="success" />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <span className="font-mono font-bold text-sm sm:text-base text-gov-text-primary block">CT-012/2026</span>
                  <span className="block text-gov-text-secondary text-xs sm:text-sm truncate max-w-[220px]">
                    Fornecimento de Merenda Escolar
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm sm:text-base text-gov-text-primary block">Alimentos Sul Distribuidora</span>
                  <span className="block font-mono text-xs text-gov-text-secondary tabular-nums">
                    19.340.560/0001-98
                  </span>
                </TableCell>
                <TableCell isTechnical className="text-right font-bold text-sm sm:text-base text-gov-text-primary">
                  {formatCurrencyBRL(3820500)}
                </TableCell>
                <TableCell isTechnical className="text-center text-sm sm:text-base text-gov-text-secondary">
                  28/02/2027
                </TableCell>
                <TableCell className="text-center">
                  <StatusChip label="Regular" variant="success" />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <span className="font-mono font-bold text-sm sm:text-base text-gov-text-primary block">CT-089/2024</span>
                  <span className="block text-gov-text-secondary text-xs sm:text-sm truncate max-w-[220px]">
                    Pavimentação asfáltica bairros norte
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm sm:text-base text-gov-text-primary block">Construtora Metropolitana S/A</span>
                  <span className="block font-mono text-xs text-gov-text-secondary tabular-nums">
                    76.890.111/0001-12
                  </span>
                </TableCell>
                <TableCell isTechnical className="text-right font-bold text-sm sm:text-base text-gov-text-primary">
                  {formatCurrencyBRL(8940000)}
                </TableCell>
                <TableCell isTechnical className="text-center text-sm sm:text-base text-gov-text-secondary">
                  18/09/2026
                </TableCell>
                <TableCell className="text-center">
                  <StatusChip label="Vencendo" variant="warning" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Column: Alertas & Semáforo Fiscal */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-[#0c326f] uppercase tracking-wide">
            Alertas & Semáforo Fiscal
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
            onAction={() => alert('Abrir módulo de transmissão TCE')}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
