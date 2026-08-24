import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Cross, MapPin, Search, Plus, Calendar } from 'lucide-react';
import { 
  Card, 
  Button, 
  KpiCard, 
  StatusChip, 
  Input, 
  Table, 
  TableHead, 
  TableHeaderCell, 
  TableBody, 
  TableRow, 
  TableCell 
} from '@/components/ui';

export const CemiteriosModule: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Gestão de Cemitérios Municipais & Jazigos
              </h1>
              <StatusChip label="Serviços Funerários" variant="neutral" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Sepultamentos, concessões de jazigos e certidões de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Novo Registro
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cemitérios Municipais"
          value="4"
          icon={<Cross className="w-5 h-5" />}
          iconBgColor="bg-[#E8F0FE] text-[#1351B4]"
        />
        <KpiCard
          title="Jazigos Ocupados"
          value="8.420"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-status-warning-bg text-status-warning"
          subtitle="Taxa de ocupação: 82%"
        />
        <KpiCard
          title="Concessões Vigentes"
          value="6.110"
          icon={<Calendar className="w-5 h-5" />}
          iconBgColor="bg-status-info-bg text-status-info"
        />
        <KpiCard
          title="Sepultamentos no Mês"
          value="42"
          icon={<Cross className="w-5 h-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
          statusBadge={<StatusChip label="Regular" variant="success" />}
        />
      </div>

      <div className="w-full sm:w-96">
        <Input
          placeholder="Buscar falecido, jazigo ou número da certidão..."
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Cemitério / Jazigo</TableHeaderCell>
            <TableHeaderCell>Nome do Falecido</TableHeaderCell>
            <TableHeaderCell className="text-center">Data Sepultamento</TableHeaderCell>
            <TableHeaderCell>Concessionário / Responsável</TableHeaderCell>
            <TableHeaderCell className="text-center">Status da Concessão</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <span className="font-bold text-gov-text-primary">Cemitério Municipal Central</span>
              <span className="block font-mono text-xs text-gov-text-muted">Quadra B • Lote 142</span>
            </TableCell>
            <TableCell>
              <span className="font-medium text-gov-text-primary">Antônio Carlos da Costa</span>
            </TableCell>
            <TableCell isTechnical className="text-center text-gov-text-secondary">
              12/04/2024
            </TableCell>
            <TableCell>
              <span className="text-xs text-gov-text-secondary">Família Costa</span>
            </TableCell>
            <TableCell className="text-center">
              <StatusChip label="Perpétua" variant="success" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default CemiteriosModule;
