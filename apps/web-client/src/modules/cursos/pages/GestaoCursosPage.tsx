import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { DataTable, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Curso } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { CursoFormModal } from '../components/CursoFormModal';
import { STATUS_CURSO, TIPO_CURSO, formatarCargaHoraria } from '../utils/formatos';

interface Props {
  onAbrirCurso: (id: number) => void;
}

export const GestaoCursosPage: React.FC<Props> = ({ onAbrirCurso }) => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setCursos((await sysgovApi.cursos.listarCursos({ per_page: 200 })).data);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os cursos.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const colunas = useMemo<ColumnDef<Curso>[]>(
    () => [
      {
        id: 'titulo',
        header: 'Título',
        size: 360,
        meta: { exportValue: (c) => c.titulo, sortValue: (c) => c.titulo },
        cell: ({ row }) => <span className="block truncate text-left font-medium text-foreground">{row.original.titulo}</span>,
      },
      {
        id: 'tipo',
        header: 'Tipo',
        size: 100,
        meta: { exportValue: (c) => TIPO_CURSO[c.tipo] },
        cell: ({ row }) => <StatusChip label={TIPO_CURSO[row.original.tipo]} variant={row.original.tipo === 'evento' ? 'info' : 'primary'} />,
      },
      {
        id: 'carga',
        header: 'Carga horária',
        size: 120,
        meta: { exportValue: (c) => formatarCargaHoraria(c.carga_horaria_minutos), sortValue: (c) => c.carga_horaria_minutos },
        cell: ({ row }) => <span className="font-mono tabular-nums">{formatarCargaHoraria(row.original.carga_horaria_minutos)}</span>,
      },
      {
        id: 'turmas',
        header: 'Turmas',
        size: 90,
        meta: { exportValue: (c) => c.turmas_count ?? 0, sortValue: (c) => c.turmas_count ?? 0 },
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.turmas_count ?? 0}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        size: 120,
        meta: { exportValue: (c) => STATUS_CURSO[c.status].label },
        cell: ({ row }) => <StatusChip label={STATUS_CURSO[row.original.status].label} variant={STATUS_CURSO[row.original.status].variant} />,
      },
    ],
    [],
  );

  if (carregando && cursos.length === 0) return <ScreenState type="loading" title="Carregando cursos..." />;
  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNovo(true)}>
          <Plus className="h-4 w-4" /> Novo curso ou evento
        </Button>
      </div>
      <DataTable
        columns={colunas}
        data={cursos}
        searchable
        searchPlaceholder="Buscar curso..."
        emptyText="Nenhum curso cadastrado."
        onRowClick={(c) => onAbrirCurso(c.id)}
        exportable
        exportFileName="cursos"
      />
      <CursoFormModal
        open={novo}
        onClose={() => setNovo(false)}
        onSalvo={(curso) => {
          setNovo(false);
          onAbrirCurso(curso.id);
        }}
      />
    </div>
  );
};

export default GestaoCursosPage;
