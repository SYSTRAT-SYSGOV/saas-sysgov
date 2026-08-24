import React, { useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { useCan } from '@/core/rbac/useCan';
import { Plus, Search, Filter, Download, Eye } from 'lucide-react';
import { 
  Card, 
  Button, 
  Input, 
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

interface Licitacao {
  id: string;
  numero: string;
  modalidade: string;
  objeto: string;
  valorEstimado: number;
  dataAbertura: string;
  fase: string;
  statusVariant: StatusVariant;
}

export const ProcurementModule: React.FC = () => {
  const { tenant } = useTenant();
  const { can } = useCan();
  const [searchTerm, setSearchTerm] = useState('');

  const licitacoes: Licitacao[] = [
    {
      id: '1',
      numero: 'PE 034/2026',
      modalidade: 'Pregão Eletrônico',
      objeto: 'Aquisição de combustíveis (gasolina comum e óleo diesel S10) para abastecimento da frota municipal.',
      valorEstimado: 4250000.00,
      dataAbertura: '04/09/2026 09:00',
      fase: 'Publicado',
      statusVariant: 'info',
    },
    {
      id: '2',
      numero: 'CC 008/2026',
      modalidade: 'Concorrência Pública',
      objeto: 'Contratação de empresa especializada de engenharia para construção de CMEI no Bairro Costeira.',
      valorEstimado: 6890150.00,
      dataAbertura: '22/09/2026 14:00',
      fase: 'Em Andamento',
      statusVariant: 'warning',
    },
    {
      id: '3',
      numero: 'PE 029/2026',
      modalidade: 'Pregão Eletrônico',
      objeto: 'Registro de preços para contratação de serviços de link dedicado de internet e fibra óptica.',
      valorEstimado: 890000.00,
      dataAbertura: '15/08/2026 10:00',
      fase: 'Homologado',
      statusVariant: 'success',
    },
    {
      id: '4',
      numero: 'DL 015/2026',
      modalidade: 'Dispensa de Licitação',
      objeto: 'Aquisição emergencial de medicamentos de alta complexidade para atendimento à ordem judicial.',
      valorEstimado: 142300.00,
      dataAbertura: '10/08/2026 08:30',
      fase: 'Homologado',
      statusVariant: 'success',
    },
  ];

  const filtered = licitacoes.filter(item => 
    item.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.modalidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header DS Gov.br */}
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Licitações, Editais & Compras Públicas
              </h1>
              <StatusChip
                label="Lei 14.133/2021"
                variant="neutral"
              />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Editais, pregões eletrônicos, concorrências e homologações de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          {can('procurement.create') && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Novo Processo Licitatório
            </Button>
          )}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-96">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por edital, modalidade ou objeto..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Filter className="w-3.5 h-3.5" />}
          >
            Filtros Avançados
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Exportar Planilha
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Processo / Edital</TableHeaderCell>
            <TableHeaderCell>Modalidade</TableHeaderCell>
            <TableHeaderCell>Objeto do Edital</TableHeaderCell>
            <TableHeaderCell className="text-right">Valor Estimado</TableHeaderCell>
            <TableHeaderCell className="text-center">Abertura</TableHeaderCell>
            <TableHeaderCell className="text-center">Fase / Status</TableHeaderCell>
            <TableHeaderCell className="text-center">Ações</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell isTechnical className="font-bold text-gov-text-primary">
                {item.numero}
              </TableCell>
              <TableCell className="font-medium text-gov-text-secondary">
                {item.modalidade}
              </TableCell>
              <TableCell className="text-gov-text-secondary max-w-sm">
                <p className="line-clamp-2">{item.objeto}</p>
              </TableCell>
              <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
                {formatCurrencyBRL(item.valorEstimado)}
              </TableCell>
              <TableCell isTechnical className="text-center text-gov-text-secondary">
                {item.dataAbertura}
              </TableCell>
              <TableCell className="text-center">
                <StatusChip
                  label={item.fase}
                  variant={item.statusVariant}
                />
              </TableCell>
              <TableCell className="text-center">
                <button
                  type="button"
                  className="p-1.5 rounded text-gov-text-secondary hover:bg-gov-page hover:text-gov-primary transition focus-visible:ring-1 focus-visible:ring-gov-primary"
                  title="Visualizar detalhes do processo"
                  aria-label={`Visualizar detalhes de ${item.numero}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProcurementModule;
