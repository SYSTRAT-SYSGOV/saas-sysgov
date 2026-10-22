import React, { useMemo } from 'react';
import { ActionsMenu } from '@sysgov/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileDown, Play, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { Button, DataTable, StatusChip } from '@/components/ui';
import { cemiteriosApi, formatarData, type OrdemServico } from '../../api';

interface OrdensServicoDataTableProps {
  ordens: OrdemServico[];
  carregando?: boolean;
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicao: (ordem: OrdemServico, acao: 'iniciar' | 'concluir' | 'suspender' | 'cancelar') => void;
  canExecutar?: boolean;
  canGerenciar?: boolean;
}

const SITUACAO_OS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  emitida: 'info',
  em_execucao: 'warning',
  concluida: 'success',
  suspensa: 'danger',
  cancelada: 'neutral',
};

export const OrdensServicoDataTable: React.FC<OrdensServicoDataTableProps> = ({
  ordens,
  carregando = false,
  onSelecionarOrdem,
  onTransicao,
  canExecutar = false,
  canGerenciar = false,
}) => {
  const colunas = useMemo<ColumnDef<OrdemServico, unknown>[]>(
    () => [
      {
        id: 'acoes',
        header: '',
        size: 56,
        enableSorting: false,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="flex justify-center">
              <ActionsMenu
                triggerLabel="Ações da ordem de serviço"
                items={[
                  { key: 'detalhes', label: 'Detalhes da OS', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => onSelecionarOrdem(o) },
                  { key: 'pdf', label: 'Emitir PDF', icon: <FileDown className="h-3.5 w-3.5" />, onSelect: () => void cemiteriosApi.pdfOrdem(o) },
                  ...(canExecutar && o.situacao === 'emitida' ? [{ key: 'iniciar', label: 'Iniciar execução', icon: <Play className="h-3.5 w-3.5" />, onSelect: () => onTransicao(o, 'iniciar') }] : []),
                  ...(canExecutar && (o.situacao === 'emitida' || o.situacao === 'em_execucao') ? [{ key: 'concluir', label: 'Concluir ordem', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onSelect: () => onTransicao(o, 'concluir') }] : []),
                ]}
              />
            </div>
          );
        },
      },
      {
        id: 'numero',
        header: 'Número OS',
        size: 110,
        accessorFn: (r) => `OS ${r.numero}/${r.ano}`,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {row.original.numero}/{row.original.ano}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo de Serviço',
        size: 130,
        accessorKey: 'tipo',
        cell: ({ row }) => (
          <span className="text-xs font-medium capitalize text-foreground">
            {row.original.tipo}
          </span>
        ),
      },
      {
        id: 'jazigo',
        header: 'Túmulo / Jazigo', meta: { exportValue: (r) => [r.jazigo?.codigo, r.jazigo?.cemiterio?.nome].filter(Boolean).join(' — ') },
        size: 140,
        cell: ({ row }) => (
          <div>
            <span className="font-mono text-xs font-bold text-primary block">
              {row.original.jazigo?.codigo ?? '—'}
            </span>
            {row.original.jazigo?.cemiterio?.nome && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[130px] block">
                {row.original.jazigo.cemiterio.nome}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'falecido',
        header: 'Falecido',
        accessorFn: (r) => r.falecido ?? '',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">
            {row.original.falecido || <span className="text-muted-foreground italic">Não vinculado</span>}
          </span>
        ),
      },
      {
        id: 'agendada_para',
        header: 'Agendada para',
        size: 140,
        accessorFn: (r) => r.agendada_para ?? '',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {row.original.agendada_para ? formatarData(row.original.agendada_para) : '—'}
          </span>
        ),
      },
      {
        id: 'equipe',
        header: 'Equipe',
        size: 130,
        accessorFn: (r) => r.equipe ?? '',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.equipe || '—'}
          </span>
        ),
      },
      {
        id: 'situacao',
        header: 'Situação',
        size: 130,
        accessorKey: 'situacao',
        cell: ({ row }) => (
          <StatusChip
            label={row.original.situacao.replace('_', ' ')}
            variant={SITUACAO_OS[row.original.situacao] ?? 'neutral'}
          />
        ),
      },
    ],
    [canExecutar, canGerenciar, onSelecionarOrdem, onTransicao]
  );

  return (
    <DataTable
      columns={colunas}
      data={ordens}
      loading={carregando}
      searchable={false}
      exportable
      pagination
      pageSize={10}
      pageSizeOptions={[10, 25, 50, 100]}
      pageSizeSelector={true}
      fixedLayout
      onRowClick={onSelecionarOrdem}
      emptyText="Nenhuma ordem de serviço encontrada para os filtros aplicados."
    />
  );
};
