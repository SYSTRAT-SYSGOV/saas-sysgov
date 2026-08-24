import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Receipt, 
  FileText, 
  PieChart 
} from 'lucide-react';
import { 
  Card, 
  Button, 
  KpiCard, 
  StatusChip, 
  Table, 
  TableHead, 
  TableHeaderCell, 
  TableBody, 
  TableRow, 
  TableCell 
} from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';

export const FinanceModule: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Execução Financeira & Orçamentária
              </h1>
              <StatusChip label="Exercício 2026" variant="primary" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Controle orçamentário de receitas, empenhos, liquidações e repasses de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<PieChart className="w-4 h-4" />}>
              Balanço RGF
            </Button>
            <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
              Novo Empenho
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Prevista"
          value={formatCurrencyBRL(380000000)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
        />
        <KpiCard
          title="Receita Realizada"
          value={formatCurrencyBRL(348912450.20)}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          trend={{ value: '91,8%', isPositive: true, label: 'arrecadado' }}
        />
        <KpiCard
          title="Despesa Empenhada"
          value={formatCurrencyBRL(310450000)}
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-status-warning-bg text-status-warning"
        />
        <KpiCard
          title="Despesa Paga"
          value={formatCurrencyBRL(281900000)}
          icon={<CreditCard className="w-5 h-5" />}
          iconBgColor="bg-status-info-bg text-status-info"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Unidade Gestora / Dotação</TableHeaderCell>
            <TableHeaderCell className="text-right">Dotação Atual</TableHeaderCell>
            <TableHeaderCell className="text-right">Empenhado</TableHeaderCell>
            <TableHeaderCell className="text-right">Liquidado</TableHeaderCell>
            <TableHeaderCell className="text-right">Saldo Disponível</TableHeaderCell>
            <TableHeaderCell className="text-center">Execução</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <span className="font-bold text-gov-text-primary">02.01 — Secretaria Municipal de Educação</span>
              <span className="block font-mono text-[11px] text-gov-text-muted">12.361.0004.2015</span>
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
              {formatCurrencyBRL(95000000)}
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              {formatCurrencyBRL(82400000)}
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              {formatCurrencyBRL(76100000)}
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-status-success">
              {formatCurrencyBRL(12600000)}
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="86,7%" variant="success" />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="font-bold text-gov-text-primary">03.01 — Secretaria Municipal de Saúde</span>
              <span className="block font-mono text-[11px] text-gov-text-muted">10.301.0008.2030</span>
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
              {formatCurrencyBRL(110000000)}
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              {formatCurrencyBRL(98500000)}
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              {formatCurrencyBRL(91200000)}
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-status-warning">
              {formatCurrencyBRL(11500000)}
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="89,5%" variant="warning" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FinanceModule;
