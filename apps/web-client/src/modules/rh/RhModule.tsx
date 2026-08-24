import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Users, Briefcase, FileCheck2, UserCheck, Plus, FileSpreadsheet } from 'lucide-react';
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

export const RhModule: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Recursos Humanos & Folha de Pagamento
              </h1>
              <StatusChip label="eSocial Homologado" variant="success" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Quadro funcional, remunerações, previdência e eSocial de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
              Remessa eSocial
            </Button>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Admitir Servidor
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Servidores Ativos"
          value="4.820"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
        />
        <KpiCard
          title="Folha Mensal Bruta"
          value={formatCurrencyBRL(21450800)}
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
        />
        <KpiCard
          title="Concursados / Efetivos"
          value="88,4%"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-status-info-bg text-status-info"
        />
        <KpiCard
          title="Status Fechamento"
          value="08/2026 Fechada"
          icon={<FileCheck2 className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          statusBadge={<StatusChip label="Enviado eSocial" variant="success" />}
        />
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Matrícula / Servidor</TableHeaderCell>
            <TableHeaderCell>Cargo / Função</TableHeaderCell>
            <TableHeaderCell>Secretaria / Lotação</TableHeaderCell>
            <TableHeaderCell className="text-center">Regime</TableHeaderCell>
            <TableHeaderCell className="text-right">Vencimento Base</TableHeaderCell>
            <TableHeaderCell className="text-center">Situação</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <span className="font-mono font-bold text-gov-text-primary">MAT-10482</span>
              <span className="block text-xs text-gov-text-secondary">Maria Helena Ribeiro</span>
            </TableCell>
            <TableCell>
              <span className="font-medium text-gov-text-primary">Professor de Ensino Fundamental II</span>
            </TableCell>
            <TableCell>
              <span className="text-xs text-gov-text-secondary">Secretaria de Educação</span>
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="Estatutário" variant="primary" />
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
              {formatCurrencyBRL(5820.40)}
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="Ativo" variant="success" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default RhModule;
