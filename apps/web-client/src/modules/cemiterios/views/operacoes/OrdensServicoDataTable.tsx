import React, { useMemo } from 'react';
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
        header: 'Túmulo / Jazigo',
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
      {
        id: 'acoes',
        header: 'Ações',
        size: 160,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelecionarOrdem(o)}
                className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10"
                title="Ver detalhes da OS"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Detalhes</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void cemiteriosApi.pdfOrdem(o)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Emitir PDF"
              >
                <FileDown className="h-3.5 w-3.5" />
              </Button>

              {canExecutar && o.situacao === 'emitida' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTransicao(o, 'iniciar')}
                  className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                  title="Iniciar Execução"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}

              {canExecutar && (o.situacao === 'emitida' || o.situacao === 'em_execucao') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTransicao(o, 'concluir')}
                  className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10"
                  title="Concluir Ordem"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
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
