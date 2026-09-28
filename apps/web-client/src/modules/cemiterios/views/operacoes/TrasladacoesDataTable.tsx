import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusChip } from '@/components/ui';
import { formatarData, type Trasladacao } from '../../api';

interface TrasladacoesDataTableProps {
  trasladacoes: Trasladacao[];
  carregando?: boolean;
}

export const TrasladacoesDataTable: React.FC<TrasladacoesDataTableProps> = ({
  trasladacoes,
  carregando = false,
}) => {
  const colunas = useMemo<ColumnDef<Trasladacao, unknown>[]>(
    () => [
      {
        id: 'falecido',
        header: 'Falecido',
        accessorFn: (r) => r.inumacao?.falecido?.nome ?? '',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground">
            {row.original.inumacao?.falecido?.nome ?? 'Falecido não identificado'}
          </span>
        ),
      },
      {
        id: 'origem',
        header: 'Túmulo de Origem',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">
            {row.original.jazigoOrigem?.codigo ?? '—'}
          </span>
        ),
      },
      {
        id: 'destino',
        header: 'Destino da Trasladação',
        cell: ({ row }) => {
          const t = row.original;
          if (t.jazigoDestino?.codigo) {
            return (
              <span className="text-xs font-medium text-foreground">
                Túmulo interno: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{t.jazigoDestino.codigo}</strong>
              </span>
            );
          }
          if (t.destino_externo) {
            return (
              <div>
                <span className="text-xs font-medium text-foreground block">
                  Externo: {t.destino_externo}
                </span>
                {t.documento_destino && (
                  <span className="text-[10px] text-muted-foreground block">
                    Doc: {t.documento_destino}
                  </span>
                )}
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        id: 'data',
        header: 'Data da Solicitação',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {row.original.created_at ? formatarData(row.original.created_at) : '—'}
          </span>
        ),
      },
      {
        id: 'situacao',
        header: 'Situação',
        cell: ({ row }) => (
          <StatusChip
            label={row.original.situacao || 'registrada'}
            variant={row.original.situacao === 'concluida' ? 'success' : 'info'}
          />
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={colunas}
      data={trasladacoes}
      loading={carregando}
      searchable
      exportable
      pagination
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      pageSizeSelector={true}
      emptyText="Nenhuma trasladação registrada."
    />
  );
};
