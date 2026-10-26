import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, FilePen, FileText, FolderOpen, Lock, Plus } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, KpiCard, Select, StatusChip } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, type AtaResumo, type Opcoes, type StatusAta } from '../api';
import { NovaAtaModal } from './NovaAtaModal';

/** O Select do Radix não aceita valor vazio: "todas" é o filtro desligado. */
const TODAS = 'todas';

export const VARIANTE_STATUS: Record<StatusAta, 'warning' | 'info' | 'success'> = { em_redacao: 'warning', rascunho: 'info', finalizada: 'success' };

const rotuloStatus = (a: AtaResumo) => (a.status === 'rascunho' ? 'Rascunho' : a.status_rotulo);
const formatarReuniao = (data: string | null) => (data ? new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const formatarAssinaturas = (a: AtaResumo) => (a.assinaturas ? `${a.assinaturas.feitas}/${a.assinaturas.total}` : '—');

export const PainelAtas: React.FC<{ opcoes: Opcoes; avisar: Toast; abrir: (id: number) => void }> = ({ opcoes, avisar, abrir }) => {
  const [status, setStatus] = useState(TODAS);
  const [secretaria, setSecretaria] = useState(TODAS);
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const carga = useCarga(() => ataApi.listar({ status: status === TODAS ? undefined : status, org_unit_id: secretaria === TODAS ? undefined : Number(secretaria), q: busca.trim() || undefined }), [status, secretaria, busca]);
  const ind = carga.dados?.indicadores;

  const colunas = useMemo<ColumnDef<AtaResumo, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações da ata"
            items={row.original.pode_abrir ? [{ key: 'abrir', label: 'Abrir', icon: <FolderOpen className="h-3.5 w-3.5" />, onSelect: () => abrir(row.original.id) }] : []}
          />
        </div>
      ),
    },
    {
      id: 'numero',
      header: 'Nº',
      accessorKey: 'numero',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.numero}</span>,
      meta: { exportHeader: 'Nº', exportValue: (a) => a.numero, sortValue: (a) => a.numero },
    },
    {
      id: 'titulo',
      header: 'Título',
      accessorKey: 'titulo',
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1.5${row.original.pode_abrir ? '' : ' opacity-70'}`}>
          {row.original.sigilosa && <Lock className="h-3.5 w-3.5 text-amber-600" aria-label="Sigilosa" />}{row.original.titulo}
        </span>
      ),
      meta: { exportHeader: 'Título', exportValue: (a) => a.titulo, sortValue: (a) => a.titulo },
    },
    {
      id: 'tipo',
      header: 'Tipo',
      accessorFn: (a) => a.tipo?.nome ?? '',
      cell: ({ row }) => row.original.tipo?.nome ?? '—',
      meta: { exportHeader: 'Tipo', exportValue: (a) => a.tipo?.nome ?? '' },
    },
    {
      id: 'secretaria',
      header: 'Secretaria',
      accessorFn: (a) => a.secretaria.nome,
      meta: { exportHeader: 'Secretaria', exportValue: (a) => a.secretaria.nome },
    },
    {
      id: 'reuniao',
      header: 'Reunião',
      accessorFn: (a) => a.data_reuniao ?? '',
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarReuniao(row.original.data_reuniao)}</span>,
      meta: { exportHeader: 'Reunião', exportValue: (a) => formatarReuniao(a.data_reuniao), sortValue: (a) => a.data_reuniao ?? '' },
    },
    {
      id: 'assinaturas',
      header: 'Assinaturas',
      accessorFn: (a) => (a.assinaturas ? a.assinaturas.feitas : -1),
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarAssinaturas(row.original)}</span>,
      meta: { exportHeader: 'Assinaturas', exportValue: (a) => formatarAssinaturas(a) },
    },
    {
      id: 'status',
      header: 'Situação',
      accessorFn: (a) => rotuloStatus(a),
      cell: ({ row }) => <StatusChip label={rotuloStatus(row.original)} variant={VARIANTE_STATUS[row.original.status]} />,
      meta: { exportHeader: 'Situação', exportValue: (a) => rotuloStatus(a) },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [abrir]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total de atas" value={ind?.total ?? '—'} icon={<FileText className="h-5 w-5" />} />
        <KpiCard title="Em redação / rascunho" value={ind ? ind.em_redacao + ind.rascunhos : '—'} subtitle={ind ? `${ind.rascunhos} aguardando assinaturas` : undefined} icon={<FilePen className="h-5 w-5" />} />
        <KpiCard title="Finalizadas" value={ind?.finalizadas ?? '—'} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Sigilosas" value={ind?.sigilosas ?? '—'} icon={<Lock className="h-5 w-5" />} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1"><Input label="Buscar pelo título" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: conselho escolar" /></div>
            <div className="w-56"><Select label="Situação" value={status} onChange={setStatus} options={[{ value: TODAS, label: 'Todas' }, { value: 'em_redacao', label: 'Em redação' }, { value: 'rascunho', label: 'Rascunho' }, { value: 'finalizada', label: 'Finalizada' }]} /></div>
            <div className="w-64"><Select label="Secretaria" value={secretaria} onChange={setSecretaria} options={[{ value: TODAS, label: 'Todas' }, ...opcoes.secretarias.map((s) => ({ value: s.id, label: s.sigla ? `${s.sigla} — ${s.nome}` : s.nome }))]} /></div>
            {opcoes.permissoes.criar && <Button onClick={() => setNova(true)}><Plus className="mr-1 h-4 w-4" />Nova ata</Button>}
          </div>

          <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
          {carga.dados && (
            <DataTable
              columns={colunas}
              data={carga.dados.data}
              emptyText="Nenhuma ata encontrada."
              onRowClick={(a) => { if (a.pode_abrir) abrir(a.id); }}
              exportable
              exportFileName="atas"
              exportTitle="Atas"
            />
          )}
        </CardContent>
      </Card>

      {nova && (
        <NovaAtaModal
          opcoes={opcoes}
          aoFechar={() => setNova(false)}
          aoCriar={(id) => {
            setNova(false);
            avisar({ type: 'success', title: 'Ata criada', message: 'Agora escreva o texto da ata.' });
            abrir(id);
          }}
        />
      )}
    </div>
  );
};
