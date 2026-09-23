import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarData, type ProcessoAbandono, type Vistoria } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados, type CampoForm } from './comum';

const RISCO: Record<string, 'success' | 'warning' | 'danger'> = { baixo: 'success', medio: 'warning', alto: 'danger' };
const ESTADO_CONSERVACAO: Record<string, string> = {
  bom: 'Bom', regular: 'Regular', ruim: 'Ruim', em_ruina: 'Em ruína', indicio_abandono: 'Indício de abandono',
};
const SITUACAO_PROCESSO: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  instaurado: 'info', em_edital: 'warning', arquivado: 'success', decidido: 'danger',
};

const CAMPOS_VISTORIA: CampoForm[] = [
  { nome: 'plot_id', rotulo: 'ID do jazigo', tipo: 'number', obrigatorio: true },
  { nome: 'data', rotulo: 'Data da vistoria', tipo: 'date', dica: 'Em branco usa a data de hoje' },
  {
    nome: 'estado_conservacao', rotulo: 'Estado de conservação', tipo: 'select', obrigatorio: true,
    opcoes: Object.entries(ESTADO_CONSERVACAO).map(([value, label]) => ({ value, label })),
  },
  {
    nome: 'risco', rotulo: 'Risco', tipo: 'select', obrigatorio: true,
    opcoes: [{ value: 'baixo', label: 'Baixo' }, { value: 'medio', label: 'Médio' }, { value: 'alto', label: 'Alto' }],
  },
  { nome: 'mover_para_manutencao', rotulo: 'Mover jazigo para Em Ruína/Manutenção', tipo: 'switch', dica: 'Só permitido com estado "Em ruína"' },
  { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
  { nome: 'fotos', rotulo: 'Fotos (obrigatório, ao menos uma)', tipo: 'file', obrigatorio: true, multiplo: true, aceitar: 'image/*' },
];

/** Vistorias com fotos e processo de abandono (spec: vistoria-abandono; RF-33..RF-36). Responsivo para celular. */
export const VistoriaView: React.FC = () => {
  const { can } = useCan();
  const [aba, setAba] = useState<'vistorias' | 'processos'>('vistorias');
  const [modal, setModal] = useState<{ tipo: 'vistoria' | 'instaurar' | 'edital' | 'manifestacao' | 'decisao'; alvo?: ProcessoAbandono } | null>(null);

  const vistorias = useDados(() => cemiteriosApi.vistorias(), []);
  const processos = useDados(() => cemiteriosApi.processos(), []);
  const { erro, executar } = useAcao();
  const recarregar = () => Promise.all([vistorias.recarregar(), processos.recarregar()]);

  const colVistorias = useMemo<ColumnDef<Vistoria, unknown>[]>(() => [
    { id: 'jazigo', header: 'Jazigo (ID)', cell: ({ row }) => <Mono>{row.original.plot_id}</Mono> },
    { id: 'data', header: 'Data', cell: ({ row }) => <Mono>{formatarData(row.original.data)}</Mono> },
    { id: 'estado', header: 'Estado', cell: ({ row }) => ESTADO_CONSERVACAO[row.original.estado_conservacao] ?? row.original.estado_conservacao },
    { id: 'risco', header: 'Risco', cell: ({ row }) => <StatusChip label={row.original.risco} variant={RISCO[row.original.risco]} /> },
    { id: 'fotos', header: 'Fotos', cell: ({ row }) => <Mono>{row.original.fotos.length}</Mono> },
  ], []);

  const colProcessos = useMemo<ColumnDef<ProcessoAbandono, unknown>[]>(() => [
    { id: 'jazigo', header: 'Jazigo', cell: ({ row }) => <Mono>{row.original.jazigo?.codigo ?? row.original.plot_id}</Mono> },
    { id: 'concessao', header: 'Concessão', cell: ({ row }) => row.original.concessao?.numero ?? '—' },
    { id: 'situacao', header: 'Situação', cell: ({ row }) => <StatusChip label={row.original.situacao} variant={SITUACAO_PROCESSO[row.original.situacao]} /> },
    { id: 'prazo', header: 'Prazo do edital', cell: ({ row }) => <Mono>{formatarData(row.original.prazo_fim)}</Mono> },
    {
      id: 'remocao', header: '', cell: ({ row }) => row.original.remocao_pendente ? <StatusChip label="remoção pendente" variant="danger" /> : null,
    },
    {
      id: 'acoes', header: '', cell: ({ row }) => {
        const p = row.original;
        if (!can('cemiterios.abandono.manage')) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {p.situacao === 'instaurado' && <Button size="xs" variant="outline" onClick={() => setModal({ tipo: 'edital', alvo: p })}>Publicar edital</Button>}
            {(p.situacao === 'instaurado' || p.situacao === 'em_edital') && <Button size="xs" variant="outline" onClick={() => setModal({ tipo: 'manifestacao', alvo: p })}>Manifestação</Button>}
            {p.situacao === 'em_edital' && <Button size="xs" onClick={() => setModal({ tipo: 'decisao', alvo: p })}>Decidir</Button>}
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [can]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={[{ key: 'vistorias', label: 'Vistorias' }, { key: 'processos', label: 'Processos de abandono' }]} value={aba} onChange={setAba} />
        <div className="flex flex-wrap gap-2">
          {can('cemiterios.vistoria.create') && <Button onClick={() => setModal({ tipo: 'vistoria' })}>Nova vistoria</Button>}
          {can('cemiterios.abandono.manage') && <Button variant="outline" onClick={() => setModal({ tipo: 'instaurar' })}>Instaurar processo</Button>}
        </div>
      </div>
      <ErroBox erro={erro ?? vistorias.erro ?? processos.erro} />

      {aba === 'vistorias'
        ? <DataTable columns={colVistorias} data={vistorias.dados?.data ?? []} loading={vistorias.carregando} emptyText="Nenhuma vistoria registrada." />
        : <DataTable columns={colProcessos} data={processos.dados?.data ?? []} loading={processos.carregando} emptyText="Nenhum processo de abandono." />}

      <FormModal aberto={modal?.tipo === 'vistoria'} titulo="Nova vistoria" campos={CAMPOS_VISTORIA} onFechar={() => setModal(null)}
        onEnviar={async (v) => { await cemiteriosApi.registrarVistoria({ ...v, plot_id: Number(v.plot_id) }); await recarregar(); }} />

      <FormModal aberto={modal?.tipo === 'instaurar'} titulo="Instaurar processo de abandono" onFechar={() => setModal(null)}
        campos={[{ nome: 'plot_id', rotulo: 'ID do jazigo', tipo: 'number', obrigatorio: true, dica: 'Última vistoria precisa registrar "em ruína" ou "indício de abandono"' }]}
        onEnviar={async (v) => { await cemiteriosApi.instaurar(Number(v.plot_id)); await recarregar(); }} />

      <FormModal aberto={modal?.tipo === 'edital'} titulo={`Publicar edital — jazigo ${modal?.alvo?.jazigo?.codigo ?? ''}`} onFechar={() => setModal(null)}
        campos={[{ nome: 'publicado_em', rotulo: 'Data de publicação', tipo: 'date', obrigatorio: true }]}
        onEnviar={async (v) => { await cemiteriosApi.etapaProcesso(Number(modal?.alvo?.id), 'edital', v); await recarregar(); }} />

      <FormModal aberto={modal?.tipo === 'manifestacao'} titulo={`Manifestação — jazigo ${modal?.alvo?.jazigo?.codigo ?? ''}`} onFechar={() => setModal(null)}
        campos={[
          { nome: 'texto', rotulo: 'Manifestação do concessionário', tipo: 'textarea', obrigatorio: true },
          { nome: 'arquivar', rotulo: 'Regularizado — arquivar processo', tipo: 'switch' },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.etapaProcesso(Number(modal?.alvo?.id), 'manifestacao', v); await recarregar(); }} />

      <FormModal aberto={modal?.tipo === 'decisao'} titulo={`Decisão final — jazigo ${modal?.alvo?.jazigo?.codigo ?? ''}`} onFechar={() => setModal(null)}
        campos={[{ nome: 'decisao', rotulo: 'Decisão (concessão será Extinta e OS de demolição emitida)', tipo: 'textarea', obrigatorio: true }]}
        onEnviar={async (v) => { await cemiteriosApi.etapaProcesso(Number(modal?.alvo?.id), 'decisao', v); await recarregar(); }} />
    </div>
  );
};
