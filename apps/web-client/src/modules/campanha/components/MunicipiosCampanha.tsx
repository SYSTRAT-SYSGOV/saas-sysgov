import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPinned, Search } from 'lucide-react';
import { ActionsMenu, AlertCard, Button, Card, CardContent, DataTable, Input, Select, Skeleton, StatusChip } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Situacao } from '../api';
import { ROTULO_RELACAO, ROTULO_SITUACAO, SITUACOES, VARIANTE_RELACAO, VARIANTE_SITUACAO, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';

/** Municípios da UF da campanha com filtros; a linha abre a ficha (spec: Municípios na campanha). */
export const MunicipiosCampanha: React.FC<PropsAba> = ({ campanha, abrirMunicipio, versao }) => {
  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas');
  const [regiao, setRegiao] = useState('todas');
  const [coordenador, setCoordenador] = useState<number | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const dados = useCarga(async () => {
    const [municipios, coordenadores] = await Promise.all([campanhaApi.municipios(), campanhaApi.coordenadores()]);
    return { municipios, coordenadores };
  }, [campanha.id, versao]);

  const regioes = useMemo(() => [...new Set((dados.dados?.municipios ?? []).map((m) => m.regiao_intermediaria ?? ''))].filter(Boolean).sort(), [dados.dados]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (dados.dados?.municipios ?? []).filter((m) => (situacao === 'todas' || m.situacao === situacao)
      && (regiao === 'todas' || m.regiao_intermediaria === regiao)
      && (coordenador === 'todos' || m.coordenador?.id === coordenador)
      && (!termo || m.nome.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(termo)));
  }, [dados.dados, situacao, regiao, coordenador, busca]);

  // Colunas estáveis; abrirMunicipio atual vem por ref.
  type LinhaMunicipio = Awaited<ReturnType<typeof campanhaApi.municipios>>[number];
  const ctx = useRef({} as { abrirMunicipio: PropsAba['abrirMunicipio'] });
  const colunas = useMemo<ColumnDef<LinhaMunicipio, unknown>[]>(() => [
    {
      id: 'municipio', header: 'Município', accessorKey: 'nome',
      cell: ({ row }) => <Button variant="link" className="h-auto p-0 font-medium" onClick={() => ctx.current.abrirMunicipio(row.original.codigo_ibge)} aria-label={`Abrir ficha de ${row.original.nome}`}>{row.original.nome}</Button>,
      meta: { exportHeader: 'Município', exportValue: (m) => m.nome },
    },
    { id: 'regiao', header: 'Região', accessorFn: (m) => m.regiao_intermediaria ?? '—', meta: { exportHeader: 'Região', exportValue: (m) => m.regiao_intermediaria ?? '' } },
    {
      id: 'eleitores', header: 'Eleitores', accessorKey: 'eleitores',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarNumero(row.original.eleitores)}</span>,
      meta: { exportHeader: 'Eleitores', exportValue: (m) => m.eleitores },
    },
    {
      id: 'situacao', header: 'Situação', accessorFn: (m) => ROTULO_SITUACAO[m.situacao],
      cell: ({ row }) => <StatusChip label={ROTULO_SITUACAO[row.original.situacao]} variant={VARIANTE_SITUACAO[row.original.situacao]} />,
      meta: { exportHeader: 'Situação', exportValue: (m) => ROTULO_SITUACAO[m.situacao] },
    },
    {
      id: 'meta', header: 'Meta', accessorKey: 'meta_votos',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarNumero(row.original.meta_votos)}</span>,
      meta: { exportHeader: 'Meta de votos', exportValue: (m) => m.meta_votos },
    },
    { id: 'coordenador', header: 'Coordenador', accessorFn: (m) => m.coordenador?.nome ?? '—', meta: { exportHeader: 'Coordenador', exportValue: (m) => m.coordenador?.nome ?? '' } },
    {
      id: 'prefeito', header: 'Prefeito', accessorFn: (m) => `${m.prefeito.nome ?? '—'}${m.prefeito.partido ? ` (${m.prefeito.partido})` : ''}`,
      cell: ({ row }) => {
        const p = row.original.prefeito;
        return (
          <span className="text-sm">
            {p.nome ?? '—'}{p.partido ? <span className="text-muted-foreground"> ({p.partido})</span> : null}
            {p.relacao !== 'sem_informacao' && <StatusChip label={ROTULO_RELACAO[p.relacao]} variant={VARIANTE_RELACAO[p.relacao]} className="ml-2" />}
          </span>
        );
      },
      meta: { exportHeader: 'Prefeito', exportValue: (m) => `${m.prefeito.nome ?? ''}${m.prefeito.partido ? ` (${m.prefeito.partido})` : ''}` },
    },
  ], []);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os municípios" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-96 w-full" />;

  ctx.current = { abrirMunicipio };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid gap-2 md:grid-cols-[1fr_12rem_14rem_14rem]">
          <Input label="Buscar" placeholder="Nome do município" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <Select label="Situação" value={situacao} onChange={(v) => setSituacao(v as Situacao | 'todas')} options={[{ value: 'todas', label: 'Todas' }, ...SITUACOES.map((s) => ({ value: s, label: ROTULO_SITUACAO[s] }))]} />
          <Select label="Região" value={regiao} onChange={setRegiao} options={[{ value: 'todas', label: 'Todas' }, ...regioes.map((r) => ({ value: r, label: r }))]} />
          <Select label="Coordenador" value={coordenador} onChange={(v) => setCoordenador(v === 'todos' ? 'todos' : Number(v))} options={[{ value: 'todos', label: 'Todos' }, ...dados.dados.coordenadores.map((c) => ({ value: c.id, label: c.nome }))]} />
        </div>
        <p className="text-sm text-muted-foreground"><span className="font-mono tabular-nums">{visiveis.length}</span> de <span className="font-mono tabular-nums">{dados.dados.municipios.length}</span> municípios</p>
        {visiveis.length === 0 ? (
          <EmptyState icon={<MapPinned className="h-8 w-8" />} title="Nenhum município encontrado" description={dados.dados.municipios.length === 0 ? `A base pública de ${campanha.uf} ainda não foi importada.` : 'Ajuste os filtros.'} />
        ) : (
          <DataTable
            columns={colunas}
            data={visiveis}
            emptyText="Nenhum município encontrado."
            exportable
            exportFileName="campanha-municipios"
            exportTitle="Campanha — Municípios"
          />
        )}
      </CardContent>
    </Card>
  );
};
