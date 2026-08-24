import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { GraduationCap, Users, School, Award, Plus, FileSpreadsheet } from 'lucide-react';
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

export const PedagogicoModule: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Gestão Pedagógica & Censo Escolar
              </h1>
              <StatusChip label="Rede Municipal" variant="primary" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Matrículas, IDEB, turmas e lotação docente de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
              Censo Escolar
            </Button>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Nova Matrícula
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Alunos Matriculados"
          value="24.890"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
          trend={{ value: '+4,2%', isPositive: true, label: 'ano letivo' }}
        />
        <KpiCard
          title="Unidades Escolares"
          value="48"
          icon={<School className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          subtitle="32 Escolas e 16 CMEIs"
        />
        <KpiCard
          title="Docentes Ativos"
          value="1.420"
          icon={<GraduationCap className="w-5 h-5" />}
          iconBgColor="bg-status-info-bg text-status-info"
        />
        <KpiCard
          title="IDEB Médio dos Anos Iniciais"
          value="6.4"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-status-warning-bg text-status-warning"
          statusBadge={<StatusChip label="Meta 2026: 6.2" variant="success" />}
        />
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Unidade Escolar / Região</TableHeaderCell>
            <TableHeaderCell className="text-center">Tipo</TableHeaderCell>
            <TableHeaderCell className="text-right">Alunos</TableHeaderCell>
            <TableHeaderCell className="text-right">Turmas</TableHeaderCell>
            <TableHeaderCell className="text-center">IDEB</TableHeaderCell>
            <TableHeaderCell className="text-center">Situação</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <span className="font-bold text-gov-text-primary">Escola Municipal Presidente Kennedy</span>
              <span className="block text-gov-text-muted text-[11px]">Bairro Centro • Código INEP 4104501</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-xs text-gov-text-secondary">Ensino Fundamental</span>
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
              840
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              28
            </TableCell>
            <TableCell isTechnical className="text-center font-bold text-status-success">
              6.8
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="Regular" variant="success" />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="font-bold text-gov-text-primary">CMEI Cantinho Feliz</span>
              <span className="block text-gov-text-muted text-[11px]">Bairro Costeira • Código INEP 4109823</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-xs text-gov-text-secondary">Educação Infantil</span>
            </TableCell>
            <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
              310
            </TableCell>
            <TableCell isTechnical className="text-right text-gov-text-secondary">
              12
            </TableCell>
            <TableCell isTechnical className="text-center text-gov-text-muted">
              -
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="Fila Zerada" variant="success" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default PedagogicoModule;
