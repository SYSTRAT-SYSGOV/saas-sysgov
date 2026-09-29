import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { Button, Card, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import {
  sysgovApi,
  type CapacitacaoServidor,
  type CapacitacaoServidorDetalhe,
  type Curso,
  type OrdenacaoCapacitacao,
  type UnidadeRelatorio,
} from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { baixarBlob, formatarCargaHoraria, formatarData } from '../utils/formatos';

const POR_PAGINA = 25;

interface Filtros {
  inicio: string;
  fim: string;
  curso_id: string;
  unidade_id: string;
}

const filtrosPadrao = (): Filtros => ({ inicio: '', fim: '', curso_id: 'todos', unidade_id: 'todas' });

const COLUNAS: { chave: OrdenacaoCapacitacao; label: string }[] = [
  { chave: 'nome', label: 'Servidor' },
  { chave: 'horas', label: 'Horas de capacitação' },
  { chave: 'ultima_conclusao', label: 'Última conclusão' },
];

/** Aba Relatórios (visão "Capacitação por servidor") da GestaoCursosPage — tarefa 4.4, D5/D9. */
export const RelatorioCapacitacaoView: React.FC = () => {
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao());
  const [ordenarPor, setOrdenarPor] = useState<OrdenacaoCapacitacao>('nome');
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('asc');
  const [pagina, setPagina] = useState(1);
  const [servidores, setServidores] = useState<CapacitacaoServidor[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [cursosDisponiveis, setCursosDisponiveis] = useState<Curso[]>([]);
  const [unidades, setUnidades] = useState<UnidadeRelatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<CapacitacaoServidorDetalhe | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  useEffect(() => {
    sysgovApi.cursos.listarCursos({ per_page: 200 }).then((r) => setCursosDisponiveis(r.data)).catch(() => undefined);
    sysgovApi.cursos.listarUnidadesRelatorio().then(setUnidades).catch(() => undefined);
  }, []);

  const filtrosApi = useCallback(
    () => ({
      ...(filtros.inicio ? { inicio: filtros.inicio } : {}),
      ...(filtros.fim ? { fim: filtros.fim } : {}),
      ...(filtros.curso_id !== 'todos' ? { curso_id: Number(filtros.curso_id) } : {}),
      ...(filtros.unidade_id !== 'todas' ? { unidade_id: Number(filtros.unidade_id) } : {}),
    }),
    [filtros],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await sysgovApi.cursos.getRelatorioCapacitacao({ ...filtrosApi(), ordenar_por: ordenarPor, direcao, pagina, por_pagina: POR_PAGINA });
      setServidores(r.data);
      setTotalPaginas(r.last_page);
      setTotal(r.total);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar o relatório.'));
    } finally {
      setCarregando(false);
    }
  }, [filtrosApi, ordenarPor, direcao, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Muda o filtro: volta pra primeira página.
  const aplicarFiltro = (novos: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...novos }));
    setPagina(1);
  };

  const ordenarPorColuna = (coluna: OrdenacaoCapacitacao) => {
    if (coluna === ordenarPor) {
      setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenarPor(coluna);
      setDirecao('asc');
    }
    setPagina(1);
  };

  const exportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      baixarBlob(await sysgovApi.cursos.exportarRelatorioCapacitacao(filtrosApi()), 'relatorio-capacitacao.csv');
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível exportar.'));
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => {
    if (detalheId === null) return;
    setDetalhe(null);
    setErroDetalhe(null);
    sysgovApi.cursos.getCapacitacaoServidor(detalheId)
      .then(setDetalhe)
      .catch((e) => setErroDetalhe(getApiErrorMessage(e, 'Não foi possível carregar o detalhe do servidor.')));
  }, [detalheId]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Início" type="date" value={filtros.inicio} onChange={(e) => aplicarFiltro({ inicio: e.target.value })} className="font-mono tabular-nums" />
          <Input label="Fim" type="date" value={filtros.fim} onChange={(e) => aplicarFiltro({ fim: e.target.value })} className="font-mono tabular-nums" />
          <Select
            label="Curso"
            value={filtros.curso_id}
            onChange={(v) => aplicarFiltro({ curso_id: v })}
            options={[{ value: 'todos', label: 'Todos' }, ...cursosDisponiveis.map((c) => ({ value: String(c.id), label: c.titulo }))]}
          />
          <Select
            label="Unidade"
            value={filtros.unidade_id}
            onChange={(v) => aplicarFiltro({ unidade_id: v })}
            options={[{ value: 'todas', label: 'Todas' }, ...unidades.map((u) => ({ value: String(u.id), label: u.nome }))]}
          />
        </div>
      </Card>

      {erro && <p className="text-sm text-status-danger">{erro}</p>}

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Servidores <span className="font-mono tabular-nums text-muted-foreground">({total})</span>
          </h2>
          <Button size="sm" variant="outline" isLoading={exportando} onClick={() => void exportar()}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        {carregando ? (
          <ScreenState type="loading" title="Carregando relatório..." />
        ) : servidores.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum servidor encontrado para os filtros.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUNAS.map((c) => (
                    <TableHead key={c.chave}>
                      <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => ordenarPorColuna(c.chave)}>
                        {c.label}
                        {ordenarPor === c.chave ? (direcao === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>Unidades</TableHead>
                  <TableHead>Cursos concluídos</TableHead>
                  <TableHead>Em andamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servidores.map((s) => (
                  <TableRow key={s.participante_id} className="cursor-pointer" onClick={() => setDetalheId(s.participante_id)}>
                    <TableCell>
                      <span className="block font-medium text-foreground">{s.nome}</span>
                      <span className="block text-xs text-muted-foreground">{s.email}</span>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarCargaHoraria(s.horas_capacitacao_minutos)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{s.ultima_conclusao ? formatarData(s.ultima_conclusao) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.unidades.join(', ') || '—'}</TableCell>
                    <TableCell className="font-mono tabular-nums">{s.cursos_concluidos}</TableCell>
                    <TableCell className="font-mono tabular-nums">{s.cursos_em_andamento}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  Página {pagina} de {totalPaginas}
                </span>
                <Button size="sm" variant="outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={detalheId !== null} onClose={() => setDetalheId(null)} title={detalhe?.nome ?? 'Detalhe do servidor'} size="lg">
        {erroDetalhe && <p className="text-sm text-status-danger">{erroDetalhe}</p>}
        {!erroDetalhe && !detalhe && <ScreenState type="loading" title="Carregando..." />}
        {detalhe && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{detalhe.email}</p>
            {detalhe.cursos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum curso concluído.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Carga horária</TableHead>
                    <TableHead>Concluído em</TableHead>
                    <TableHead>Certificado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhe.cursos.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.curso_titulo}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatarCargaHoraria(c.carga_horaria_minutos)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatarData(c.concluida_em)}</TableCell>
                      <TableCell>
                        {c.certificado_codigo ? (
                          <span className={c.certificado_valido ? 'text-status-success' : 'text-status-danger'}>
                            {c.certificado_codigo}{!c.certificado_valido && ' (revogado)'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RelatorioCapacitacaoView;
