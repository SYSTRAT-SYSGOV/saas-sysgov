import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { Button, Card, Input, Select } from '@sysgov/ui';
import { DataTable, ScreenState } from '@/components/ui';
import { sysgovApi, type Curso, type CursoRelatorio, type RelatorioCursosFiltros } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_CURSO, baixarBlob, formatarCargaHoraria, formatarNota, formatarPercentual } from '../utils/formatos';

const anoAtual = new Date().getFullYear();

const filtrosPadrao = (): { inicio: string; fim: string; tipo: string; curso_id: string } => ({
  inicio: `${anoAtual}-01-01`,
  fim: `${anoAtual}-12-31`,
  tipo: 'todos',
  curso_id: 'todos',
});

/** Aba Relatórios (visão "Cursos por período") da GestaoCursosPage — tarefa 4.3, D9. */
export const RelatorioCursosView: React.FC = () => {
  const [filtros, setFiltros] = useState(filtrosPadrao());
  const [cursosDisponiveis, setCursosDisponiveis] = useState<Curso[]>([]);
  const [cursos, setCursos] = useState<CursoRelatorio[]>([]);
  const [totais, setTotais] = useState<{ turmas: number; inscricoes: number; concluidos: number; taxa_conclusao: number | null } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    sysgovApi.cursos.listarCursos({ per_page: 200 }).then((r) => setCursosDisponiveis(r.data)).catch(() => undefined);
  }, []);

  const filtrosApi = useCallback((): RelatorioCursosFiltros => ({
    inicio: filtros.inicio,
    fim: filtros.fim,
    ...(filtros.tipo !== 'todos' ? { tipo: filtros.tipo as RelatorioCursosFiltros['tipo'] } : {}),
    ...(filtros.curso_id !== 'todos' ? { curso_id: Number(filtros.curso_id) } : {}),
  }), [filtros]);

  const carregar = useCallback(async () => {
    if (!filtros.inicio || !filtros.fim) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await sysgovApi.cursos.getRelatorioCursos(filtrosApi());
      setCursos(r.cursos);
      setTotais(r.totais);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar o relatório.'));
    } finally {
      setCarregando(false);
    }
  }, [filtros.inicio, filtros.fim, filtrosApi]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const exportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      baixarBlob(await sysgovApi.cursos.exportarRelatorioCursos(filtrosApi()), `relatorio-cursos-${filtros.inicio}-a-${filtros.fim}.csv`);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível exportar.'));
    } finally {
      setExportando(false);
    }
  };

  const colunas = useMemo<ColumnDef<CursoRelatorio>[]>(
    () => [
      { id: 'titulo', header: 'Curso', size: 260, meta: { exportValue: (c) => c.titulo, sortValue: (c) => c.titulo }, cell: ({ row }) => <span className="block truncate text-left font-medium text-foreground">{row.original.titulo}</span> },
      { id: 'tipo', header: 'Tipo', size: 90, meta: { exportValue: (c) => TIPO_CURSO[c.tipo] }, cell: ({ row }) => <span>{TIPO_CURSO[row.original.tipo]}</span> },
      { id: 'turmas', header: 'Turmas', size: 80, meta: { exportValue: (c) => c.turmas, sortValue: (c) => c.turmas }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.turmas}</span> },
      { id: 'inscricoes', header: 'Inscrições', size: 90, meta: { exportValue: (c) => c.inscricoes, sortValue: (c) => c.inscricoes }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.inscricoes}</span> },
      { id: 'concluidos', header: 'Concluídos', size: 90, meta: { exportValue: (c) => c.concluidos, sortValue: (c) => c.concluidos }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.concluidos}</span> },
      { id: 'taxa', header: 'Taxa de conclusão', size: 130, meta: { exportValue: (c) => c.taxa_conclusao ?? '', sortValue: (c) => c.taxa_conclusao ?? -1 }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatarPercentual(row.original.taxa_conclusao)}</span> },
      { id: 'frequencia', header: 'Frequência média', size: 130, meta: { exportValue: (c) => c.frequencia_media ?? '', sortValue: (c) => c.frequencia_media ?? -1 }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatarPercentual(row.original.frequencia_media)}</span> },
      { id: 'nota', header: 'Nota média', size: 110, meta: { exportValue: (c) => c.nota_media ?? '', sortValue: (c) => c.nota_media ?? -1 }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatarNota(row.original.nota_media)}</span> },
      { id: 'horas', header: 'Horas certificadas', size: 130, meta: { exportValue: (c) => formatarCargaHoraria(c.horas_certificadas_minutos), sortValue: (c) => c.horas_certificadas_minutos }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatarCargaHoraria(row.original.horas_certificadas_minutos)}</span> },
      { id: 'certificados', header: 'Certificados', size: 100, meta: { exportValue: (c) => c.certificados_emitidos, sortValue: (c) => c.certificados_emitidos }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.certificados_emitidos}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Início" type="date" value={filtros.inicio} onChange={(e) => setFiltros((f) => ({ ...f, inicio: e.target.value }))} className="font-mono tabular-nums" />
          <Input label="Fim" type="date" value={filtros.fim} onChange={(e) => setFiltros((f) => ({ ...f, fim: e.target.value }))} className="font-mono tabular-nums" />
          <Select
            label="Tipo"
            value={filtros.tipo}
            onChange={(v) => setFiltros((f) => ({ ...f, tipo: v }))}
            options={[{ value: 'todos', label: 'Todos' }, { value: 'curso', label: 'Curso' }, { value: 'evento', label: 'Evento' }]}
          />
          <Select
            label="Curso"
            value={filtros.curso_id}
            onChange={(v) => setFiltros((f) => ({ ...f, curso_id: v }))}
            options={[{ value: 'todos', label: 'Todos' }, ...cursosDisponiveis.map((c) => ({ value: String(c.id), label: c.titulo }))]}
          />
        </div>
      </Card>

      {erro && <p className="text-sm text-status-danger">{erro}</p>}

      {carregando ? (
        <ScreenState type="loading" title="Carregando relatório..." />
      ) : (
        <>
          {totais && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Turmas no período</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{totais.turmas}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Inscrições</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{totais.inscricoes}</p>
                <p className="text-xs text-muted-foreground">o número de inscrições ao lado das médias evita ler tamanhos diferentes como iguais</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{totais.concluidos}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatarPercentual(totais.taxa_conclusao)}</p>
              </Card>
            </div>
          )}

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Cursos do período</h2>
              <Button size="sm" variant="outline" isLoading={exportando} onClick={() => void exportar()}>
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
            <DataTable
              columns={colunas}
              data={cursos}
              searchable
              searchPlaceholder="Buscar curso..."
              emptyText="Nenhum curso com turma no período."
              exportable
              exportFileName="cursos-periodo-tela"
            />
            <p className="text-xs text-muted-foreground">
              O menu de exportação da tabela exporta só as linhas carregadas; “Exportar CSV” acima traz o resultado completo do período, direto da API.
            </p>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioCursosView;
