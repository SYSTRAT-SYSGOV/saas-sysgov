import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge, Card, CardContent, DataTable, KpiCard } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { transporteApi, type Alerta } from '../api';
import { data, prazo, ROTULO_ALERTA, rotuloDe } from '../formato';

/** Tabela de alertas de vencimento, com os críticos primeiro (a ordem vem do servidor). */
export const TabelaAlertas: React.FC<{ alertas: Alerta[] }> = ({ alertas }) => {
  const colunas = useMemo<ColumnDef<Alerta, unknown>[]>(() => [
    {
      id: 'gravidade',
      header: 'Situação',
      accessorKey: 'gravidade',
      cell: ({ row }) => row.original.gravidade === 'critico'
        ? <Badge variant="destructive">Vencido</Badge>
        : <Badge variant="outline">A vencer</Badge>,
      meta: { exportHeader: 'Situação', exportValue: (a) => (a.gravidade === 'critico' ? 'Vencido' : 'A vencer') },
    },
    { id: 'tipo', header: 'Documento', accessorFn: (a) => rotuloDe(ROTULO_ALERTA, a.tipo), meta: { exportHeader: 'Documento', exportValue: (a) => rotuloDe(ROTULO_ALERTA, a.tipo) } },
    {
      id: 'item',
      header: 'Item',
      accessorKey: 'item',
      cell: ({ row }) => <span className={row.original.item_tipo === 'veiculo' ? 'font-mono tabular-nums' : 'font-medium'}>{row.original.item}</span>,
      meta: { exportHeader: 'Item', exportValue: (a) => a.item },
    },
    {
      id: 'data',
      header: 'Vencimento',
      accessorKey: 'data',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.data)}</span>,
      meta: { exportHeader: 'Vencimento', exportValue: (a) => data(a.data) },
    },
    { id: 'dias', header: 'Prazo', accessorFn: (a) => prazo(a.dias), meta: { exportHeader: 'Prazo', exportValue: (a) => prazo(a.dias) } },
  ], []);

  return (
    <DataTable
      columns={colunas}
      data={alertas}
      emptyText="Nenhum documento vencido ou a vencer em 30 dias."
      exportable
      exportFileName="transporte-alertas"
      exportTitle="Transporte Escolar — Alertas de vencimento"
    />
  );
};

/** Visão geral: documentos vencidos (críticos) e a vencer em 30 dias (atenção), com os críticos primeiro. */
export const VisaoGeral: React.FC = () => {
  const carga = useCarga(() => transporteApi.alertas(), []);
  const resumo = carga.dados?.resumo;

  return (
    <div className="space-y-4">
      <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
      {resumo && (
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard title="Documentos vencidos" value={resumo.criticos} icon={<ShieldAlert className="h-5 w-5" />} />
          <KpiCard title="A vencer em 30 dias" value={resumo.atencao} icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
      )}
      {carga.dados && (
        <Card>
          <CardContent className="p-4">
            <TabelaAlertas alertas={carga.dados.data} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
