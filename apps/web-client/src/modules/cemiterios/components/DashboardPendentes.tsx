import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusChip } from '@/components/ui';
import type { DashboardPendentes, DashboardPendentesProcesso } from '../api';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../hooks/useSucessaoTransicoes';
import { Mono } from '../views/comum';

interface DashboardPendentesProps {
  dados: DashboardPendentes | null;
  carregando: boolean;
  onSelectProcesso?: (p: DashboardPendentesProcesso) => void;
  parkId?: number | null;
}

export const DashboardPendentesComponent: React.FC<DashboardPendentesProps> = ({
  dados,
  carregando,
  onSelectProcesso,
}) => {
  const processos = dados?.processos ?? [];

  const colunas = useMemo<ColumnDef<DashboardPendentesProcesso, unknown>[]>(
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
        id: 'titular',
        header: 'Titular Falecido',
        accessorFn: (row) => row.titular_falecido?.nome ?? '',
        cell: ({ row }) => <span className="text-sm text-foreground">{row.original.titular_falecido?.nome ?? '—'}</span>,
      },
      {
        id: 'cemiterio',
        header: 'Necrópole',
        accessorFn: (row) => row.cemiterio?.nome ?? '',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.cemiterio?.nome ?? '—'}</span>,
      },
      {
        id: 'dias',
        header: 'Dias em Análise',
        accessorFn: (row) => row.dias_em_analise,
        cell: ({ row }) => <Mono className="font-mono tabular-nums text-center block">{row.original.dias_em_analise}</Mono>,
      },
      {
        id: 'documentos',
        header: 'Documentos',
        accessorFn: (row) => row.documentos_count,
        cell: ({ row }) => (
          <span className="text-xs font-mono tabular-nums">
            {row.original.documentos_count}/{row.original.documentos_count + (row.original.documentos_pendentes?.length ?? 0)}
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
      emptyText="Nenhum processo pendente de análise nesta necrópole."
      pagination={false}
    />
  );
};

export default DashboardPendentesComponent;
