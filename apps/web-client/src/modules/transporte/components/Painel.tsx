import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Gauge, Route, Truck, Users } from 'lucide-react';
import { Card, CardContent, DataTable, KpiCard, Select } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { transporteApi, type Opcoes, type Painel as PainelDados } from '../api';
import { textoOcupacao } from '../formato';
import { SeloOcupacao } from './AlunosDaRota';
import { TabelaAlertas } from './VisaoGeral';

const TODOS = 'todos';

type LinhaRota = PainelDados['rotas'][number];

/** Painel do módulo: indicadores, lotação por rota (vermelhas primeiro, com rótulo de texto) e alertas de vencimento. */
export const Painel: React.FC<{ opcoes: Opcoes }> = ({ opcoes }) => {
  const [ano, setAno] = useState(String(opcoes.anos_letivos[0] ?? TODOS));
  const carga = useCarga(() => transporteApi.painel(ano === TODOS ? undefined : Number(ano)), [ano]);

  const colunas = useMemo<ColumnDef<LinhaRota, unknown>[]>(() => [
    { id: 'nome', header: 'Rota', accessorKey: 'nome', meta: { exportHeader: 'Rota', exportValue: (r) => r.nome } },
    { id: 'escola', header: 'Escola', accessorFn: (r) => r.escola ?? '', meta: { exportHeader: 'Escola', exportValue: (r) => r.escola ?? '' } },
    { id: 'turno', header: 'Turno', accessorKey: 'turno', meta: { exportHeader: 'Turno', exportValue: (r) => r.turno } },
    { id: 'placa', header: 'Veículo', accessorFn: (r) => r.placa ?? '—', cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.placa ?? '—'}</span>, meta: { exportHeader: 'Veículo', exportValue: (r) => r.placa ?? '' } },
    {
      id: 'ocupacao',
      header: 'Ocupação',
      accessorFn: (r) => r.ocupacao.percentual ?? -1,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tabular-nums">{textoOcupacao(row.original.ocupacao)}</span>
          <SeloOcupacao ocupacao={row.original.ocupacao} />
        </span>
      ),
      meta: { exportHeader: 'Ocupação', exportValue: (r) => textoOcupacao(r.ocupacao) },
    },
  ], []);

  const p = carga.dados;

  return (
    <div className="space-y-4">
      <div className="w-56">
        <Select label="Ano letivo" value={ano} onChange={setAno} options={[{ value: TODOS, label: 'Todos' }, ...opcoes.anos_letivos.map((a) => ({ value: String(a), label: String(a) }))]} />
      </div>
      <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
      {p && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="Rotas ativas" value={p.indicadores.rotas_ativas} icon={<Route className="h-5 w-5" />} />
            <KpiCard title="Veículos ativos" value={p.indicadores.veiculos_ativos} icon={<Truck className="h-5 w-5" />} />
            <KpiCard title="Alunos transportados" value={p.indicadores.alunos_transportados} icon={<Users className="h-5 w-5" />} />
            <KpiCard title="Ocupação média" value={p.indicadores.ocupacao_media === null ? '—' : `${p.indicadores.ocupacao_media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} icon={<Gauge className="h-5 w-5" />} />
            <KpiCard title="Rotas superlotadas" value={p.indicadores.rotas_superlotadas} subtitle={p.indicadores.rotas_sem_veiculo > 0 ? `${p.indicadores.rotas_sem_veiculo} rota(s) sem veículo` : undefined} icon={<AlertTriangle className="h-5 w-5" />} />
          </div>
          <Card>
            <CardContent className="space-y-2 p-4">
              <h2 className="text-sm font-semibold">Lotação por rota</h2>
              <DataTable columns={colunas} data={p.rotas} emptyText="Nenhuma rota ativa cadastrada." exportable exportFileName="transporte-lotacao" exportTitle="Transporte Escolar — Lotação por rota" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-4">
              <h2 className="text-sm font-semibold">Alertas de vencimento</h2>
              <p className="text-xs text-muted-foreground">{p.alertas.resumo.criticos} vencido(s) e {p.alertas.resumo.atencao} a vencer em 30 dias.</p>
              <TabelaAlertas alertas={p.alertas.data} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
