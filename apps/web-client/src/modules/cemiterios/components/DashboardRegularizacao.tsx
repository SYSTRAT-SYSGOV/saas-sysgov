import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusChip } from '@/components/ui';
import type { DashboardRegularizacao, DashboardRegularizacaoProcesso } from '../api';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../hooks/useSucessaoTransicoes';
import { formatarData } from '../api';
import { Mono } from '../views/comum';

interface DashboardRegularizacaoProps {
  dados: DashboardRegularizacao | null;
  carregando: boolean;
  onSelectProcesso?: (p: DashboardRegularizacaoProcesso) => void;
}

export const DashboardRegularizacaoComponent: React.FC<DashboardRegularizacaoProps> = ({
  dados,
  carregando,
  onSelectProcesso,
}) => {
  const processos = dados?.processos ?? [];

  const colunas = useMemo<ColumnDef<DashboardRegularizacaoProcesso, unknown>[]>(
    () => [
      {
        id: 'processo',
        header: 'Processo',
        accessorFn: (row) => row.processo_referencia ?? '',
        cell: ({ row }) => <Mono className="font-bold text-foreground">{row.original.processo_referencia ?? '—'}</Mono>,
      },
      {
        id: 'estado',
        header: 'Situação',
        accessorFn: (row) => row.estado,
        cell: ({ row }) => (
          <StatusChip
            label={ESTADO_LABELS[row.original.estado] ?? row.original.estado}
            variant={ESTADO_BADGE_VARIANT[row.original.estado] ?? 'neutral'}
          />
        ),
      },
      {
        id: 'concessao',
        header: 'Concessão / Jazigo',
        accessorFn: (row) => row.concessao?.numero ?? '',
        cell: ({ row }) => (
          <div>
            <Mono className="font-semibold text-foreground">{row.original.concessao?.numero ?? '—'}</Mono>
            <div className="text-xs text-muted-foreground">
              Jazigo: <Mono>{row.original.jazigo?.codigo ?? '—'}</Mono>
            </div>
          </div>
        ),
      },
      {
        id: 'titular_indicado',
        header: 'Novo Titular Indicado',
        accessorFn: (row) => row.titular_indicado?.nome ?? '',
        cell: ({ row }) => <span className="text-sm text-foreground">{row.original.titular_indicado?.nome ?? '—'}</span>,
      },
      {
        id: 'falecimento',
        header: 'Falecimento',
        accessorFn: (row) => row.data_falecimento ?? '',
        cell: ({ row }) => (
          <div>
            <span className="text-sm text-foreground font-mono tabular-nums">{formatarData(row.original.data_falecimento)}</span>
            <div className="text-xs text-muted-foreground">{row.original.dias_desde_falecimento} dias</div>
          </div>
        ),
      },
      {
        id: 'prazo',
        header: 'Prazo Restante',
        accessorFn: (row) => (row.prazo_vencido ? -1 : row.dias_restantes_regularizacao),
        cell: ({ row }) => (
          <span
            className={`text-xs font-mono tabular-nums font-bold ${
              row.original.prazo_vencido ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {row.original.prazo_vencido ? 'Vencido' : `${row.original.dias_restantes_regularizacao} dias`}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: '',
        cell: ({ row }) =>
          onSelectProcesso ? (
            <button onClick={() => onSelectProcesso(row.original)} className="text-xs font-medium text-primary hover:underline">
              Ver detalhes
            </button>
          ) : null,
      },
    ],
    [onSelectProcesso]
  );

  return (
    <DataTable
      columns={colunas}
      data={processos}
      loading={carregando}
      searchable
      searchPlaceholder="Buscar por processo, titular ou concessão..."
      emptyText="Nenhum processo de regularização pendente."
      pagination={false}
    />
  );
};

export default DashboardRegularizacaoComponent;
