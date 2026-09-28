import React, { useMemo } from 'react';
import { DataTable, Button, StatusChip } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Scale, Users } from 'lucide-react';
import type { Sucessao, SucessaoPaginado, EstadoSucessao, ViaSucessao } from '../api';
import { formatarData } from '../api';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../hooks/useSucessaoTransicoes';
import { VIA_LABELS } from './sucessao.utils';
import { Mono } from '../views/comum';

interface SucessaoListProps {
  dados: SucessaoPaginado | null;
  carregando: boolean;
  onDetalhar: (p: Sucessao) => void;
  onAutuar?: () => void;
  podeAutuar?: boolean;
}

const colunasBase = [
  { key: 'processo_referencia', label: 'Processo' },
  { key: 'via', label: 'Via' },
  { key: 'estado', label: 'Situação' },
  { key: 'concessao', label: 'Concessão' },
  { key: 'data_falecimento', label: 'Data do Falecimento' },
  { key: 'herdeiros', label: 'Herdeiros' },
  { key: 'documentos', label: 'Documentos' },
];

export const SucessaoList: React.FC<SucessaoListProps> = ({
  dados,
  carregando,
  onDetalhar,
  onAutuar,
  podeAutuar = true,
}) => {
  const colunas = useMemo<ColumnDef<Sucessao, unknown>[]>(
    () => [
      {
        id: 'processo_referencia',
        header: 'Processo',
        accessorFn: (row) => row.processo_referencia ?? '—',
        cell: ({ row }) => (
          <Mono className="font-bold text-foreground">
            {row.original.processo_referencia ?? '—'}
          </Mono>
        ),
      },
      {
        id: 'via',
        header: 'Via',
        accessorFn: (row) => row.via,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-foreground capitalize">
            {VIA_LABELS[row.original.via] ?? row.original.via.replace('_', ' ')}
          </span>
        ),
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
        accessorFn: (row) => row.concessao?.numero ?? '—',
        cell: ({ row }) => (
          <div>
            <Mono className="font-semibold text-foreground">
              {row.original.concessao?.numero ?? '—'}
            </Mono>
            <div className="text-xs text-muted-foreground">
              Jazigo: <Mono>{row.original.concessao?.jazigo?.codigo ?? '—'}</Mono>
            </div>
          </div>
        ),
      },
      {
        id: 'titular',
        header: 'Titular Falecido',
        accessorFn: (row) => row.titularFalecido?.nome ?? row.concessao?.concessionario?.nome ?? '—',
        cell: ({ row }) => (
          <div>
            <span className="text-sm text-foreground">
              {row.original.titularFalecido?.nome ?? row.original.concessao?.concessionario?.nome ?? '—'}
            </span>
            <div className="text-xs text-muted-foreground font-mono">
              {row.original.titularFalecido?.documento ?? row.original.concessao?.concessionario?.documento ?? ''}
            </div>
          </div>
        ),
      },
      {
        id: 'data_falecimento',
        header: 'Data Falecimento',
        accessorFn: (row) => row.data_falecimento ?? '',
        cell: ({ row }) => (
          <Mono className="text-xs tabular-nums">
            {formatarData(row.original.data_falecimento)}
          </Mono>
        ),
      },
      {
        id: 'herdeiros',
        header: 'Herdeiros',
        accessorFn: (row) => row.herdeiros?.length ?? 0,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-center">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <Mono className="tabular-nums">{row.original.herdeiros?.length ?? 0}</Mono>
          </div>
        ),
      },
      {
        id: 'documentos',
        header: 'Documentos',
        accessorFn: (row) => row.documentos?.length ?? 0,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-center">
            <span className="text-xs font-mono tabular-nums">
              {row.original.documentos?.length ?? 0}
            </span>
          </div>
        ),
      },
      {
        id: 'acoes',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="xs"
              variant="outline"
              onClick={() => onDetalhar(row.original)}
              title="Ver detalhes"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onDetalhar]
  );

  return (
    <div className="space-y-4">
      {podeAutuar && onAutuar && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onAutuar}>
            <Scale className="h-4 w-4 mr-2" />
            Abrir Processo de Sucessão
          </Button>
        </div>
      )}

      <DataTable
        columns={colunas}
        data={dados?.data ?? []}
        loading={carregando}
        searchable
        searchPlaceholder="Buscar por processo, herdeiro ou concessão..."
        emptyText="Nenhum processo de sucessão encontrado."
        pagination={false}
      />
    </div>
  );
};

export default SucessaoList;
