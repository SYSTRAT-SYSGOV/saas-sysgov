import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { StatusChip } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import type { Formando } from '../api';
import { situacaoDoFormando } from '../formato';

/** Colunas de `Formando` comuns às grades do módulo (Alunos, Formandos e participantes da turma). */
type Col = ColumnDef<Formando, unknown>;

export const colNumero: Col = {
  id: 'numero',
  header: 'Nº',
  accessorFn: (f) => f.numero ?? '',
  cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.numero ?? '—'}</span>,
  meta: { exportHeader: 'Nº', exportValue: (f) => f.numero ?? '' },
};

export const colNome: Col = {
  id: 'nome',
  header: 'Nome',
  accessorKey: 'nome',
  cell: ({ row }) => (
    <span className="font-medium">
      {row.original.nome}
      {row.original.situacao_aluno === 'transferido' && <StatusChip label="Transferido" variant="danger" className="ml-2" />}
      {row.original.situacao_aluno === 'remanejado' && <StatusChip label="Remanejado" variant="info" className="ml-2" />}
    </span>
  ),
  meta: { exportHeader: 'Nome', exportValue: (f) => f.nome },
};

export const colTurma: Col = {
  id: 'turma',
  header: 'Turma',
  accessorKey: 'turma',
  meta: { exportHeader: 'Turma', exportValue: (f) => f.turma },
};

type CampoCentavos = 'valor_devido_centavos' | 'total_pago_centavos' | 'saldo_devedor_centavos';

/** Valor em reais, alinhado à direita; ordena e exporta pelo valor. */
export const colMoeda = (id: string, header: string, campo: CampoCentavos): Col => ({
  id,
  header,
  accessorFn: (f) => f[campo],
  cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarCentavos(row.original[campo])}</span>,
  meta: { exportHeader: header, exportValue: (f) => formatarCentavos(f[campo]) },
});

export const colSituacao: Col = {
  id: 'situacao',
  header: 'Situação',
  accessorFn: (f) => situacaoDoFormando(f).rotulo,
  cell: ({ row }) => {
    const s = situacaoDoFormando(row.original);
    return <StatusChip label={s.rotulo} variant={s.variante} />;
  },
  meta: { exportHeader: 'Situação', exportValue: (f) => situacaoDoFormando(f).rotulo },
};
