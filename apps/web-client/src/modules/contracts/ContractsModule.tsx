import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Plus, Download } from 'lucide-react';
import { 
  Card, 
  Button, 
  StatusChip, 
  StatusVariant,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';

interface Contrato {
  id: string;
  numero: string;
  objeto: string;
  fornecedor: string;
  cnpj: string;
  valorGlobal: number;
  valorExecutado: number;
  vigencia: string;
  status: string;
  statusVariant: StatusVariant;
}

export const ContractsModule: React.FC = () => {
  const { tenant } = useTenant();

  const contracts: Contrato[] = [
    {
      id: '1',
      numero: 'CT-048/2025',
      objeto: 'Prestação de serviços contínuos de manutenção preventiva e corretiva da frota escolar.',
      fornecedor: 'Auto Mecânica Paraná Ltda',
      cnpj: '04.128.940/0001-33',
      valorGlobal: 1480000.00,
      valorExecutado: 620000.00,
      vigencia: '15/12/2026',
      status: 'Regular',
      statusVariant: 'success',
    },
    {
      id: '2',
      numero: 'CT-012/2026',
      objeto: 'Fornecimento parcelado de gêneros alimentícios perecíveis e não perecíveis para a Merenda Escolar.',
      fornecedor: 'Alimentos Sul Distribuidora S/A',
      cnpj: '19.340.560/0001-98',
      valorGlobal: 3820500.00,
      valorExecutado: 1150000.00,
      vigencia: '28/02/2027',
      status: 'Regular',
      statusVariant: 'success',
    },
    {
      id: '3',
      numero: 'CT-089/2024',
      objeto: 'Obras de pavimentação em CBUQ, drenagem pluvial e sinalização viária no Bairro Iguaçu.',
      fornecedor: 'Construtora Metropolitana S/A',
      cnpj: '76.890.111/0001-12',
      valorGlobal: 8940000.00,
      valorExecutado: 7890000.00,
      vigencia: '18/09/2026',
      status: 'Vencendo',
      statusVariant: 'warning',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Contratos Administrativos & Aditivos
              </h1>
              <StatusChip label="Fiscalização Ativa" variant="success" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Fiscalização, aditivos, reajustes e cronogramas financeiros de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
              Exportar
            </Button>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Novo Contrato
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Contrato / Objeto</TableHeaderCell>
            <TableHeaderCell>Contratada / CNPJ</TableHeaderCell>
            <TableHeaderCell className="text-right">Valor Global</TableHeaderCell>
            <TableHeaderCell className="text-right">Executado</TableHeaderCell>
            <TableHeaderCell className="text-center">Término Vigência</TableHeaderCell>
            <TableHeaderCell className="text-center">Status</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {contracts.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <span className="font-mono font-bold text-gov-text-primary">{c.numero}</span>
                <span className="block text-gov-text-muted text-[11px] truncate max-w-[280px]">{c.objeto}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-gov-text-primary">{c.fornecedor}</span>
                <span className="block font-mono text-[11px] text-gov-text-muted tabular-nums">{c.cnpj}</span>
              </TableCell>
              <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
                {formatCurrencyBRL(c.valorGlobal)}
              </TableCell>
              <TableCell isTechnical className="text-right text-gov-text-secondary">
                {formatCurrencyBRL(c.valorExecutado)}
              </TableCell>
              <TableCell isTechnical className="text-center text-gov-text-secondary">
                {c.vigencia}
              </TableCell>
              <TableCell className="text-center">
                <StatusChip label={c.status} variant={c.statusVariant} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContractsModule;
