import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Turma } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { MODALIDADE, STATUS_TURMA, formatarData } from '../utils/formatos';

interface Props {
  onAbrirTurma: (id: number) => void;
}

/** Turmas em que o usuário é instrutor designado. */
export const MinhasTurmasPage: React.FC<Props> = ({ onAbrirTurma }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setTurmas(await sysgovApi.cursos.minhasTurmas());
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar suas turmas.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const colunas = useMemo<ColumnDef<Turma>[]>(
    () => [
      { id: 'curso', header: 'Curso', size: 280, meta: { exportValue: (t) => t.curso?.titulo ?? '' }, cell: ({ row }) => <span className="block truncate text-left font-medium">{row.original.curso?.titulo}</span> },
      { id: 'turma', header: 'Turma', size: 160, meta: { exportValue: (t) => t.nome }, cell: ({ row }) => <span className="block truncate text-left">{row.original.nome}</span> },
      {
        id: 'periodo',
        header: 'Período',
        size: 200,
        meta: { exportValue: (t) => `${formatarData(t.data_inicio)} a ${formatarData(t.data_fim)}`, sortValue: (t) => t.data_inicio },
        cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatarData(row.original.data_inicio)} a {formatarData(row.original.data_fim)}</span>,
      },
      { id: 'modalidade', header: 'Modalidade', size: 110, meta: { exportValue: (t) => MODALIDADE[t.modalidade] }, cell: ({ row }) => MODALIDADE[row.original.modalidade] },
      {
        id: 'inscritos',
        header: 'Vagas ocupadas',
        size: 120,
        meta: { exportValue: (t) => `${t.vagas_ocupadas ?? 0}/${t.vagas}` },
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.vagas_ocupadas ?? 0}/{row.original.vagas}</span>,
      },
      { id: 'status', header: 'Status', size: 110, meta: { exportValue: (t) => STATUS_TURMA[t.status].label }, cell: ({ row }) => <StatusChip label={STATUS_TURMA[row.original.status].label} variant={STATUS_TURMA[row.original.status].variant} /> },
    ],
    [],
  );

  if (carregando && turmas.length === 0) return <ScreenState type="loading" title="Carregando suas turmas..." />;
  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;

  return <DataTable columns={colunas} data={turmas} emptyText="Você não é instrutor de nenhuma turma." onRowClick={(t) => onAbrirTurma(t.id)} />;
};

export default MinhasTurmasPage;
