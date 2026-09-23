import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, DataTable, StatusChip, Tabs } from '@/components/ui';
import { cemiteriosApi, formatarData, type AlvaraObra, type Empreiteiro } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';

const SITUACAO: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = { apto: 'success', inapto: 'warning', suspenso: 'danger', cancelado: 'neutral' };

/** Empreiteiros com alvará anual, alvarás de obra e penalidades (RF-29..RF-32). */
export const EmpreiteirosView: React.FC = () => {
  const [aba, setAba] = useState<'empreiteiros' | 'obras'>('empreiteiros');
  const [modal, setModal] = useState<{ tipo: 'novo' | 'alvara' | 'penalidade' | 'obra'; alvo?: Empreiteiro } | null>(null);
  const empreiteiros = useDados(() => cemiteriosApi.empreiteiros(), []);
  const obras = useDados(() => cemiteriosApi.obras({ per_page: 100 }), []);
  const { erro, executar } = useAcao();
  const recarregar = () => Promise.all([empreiteiros.recarregar(), obras.recarregar()]);

  const colEmpreiteiros = useMemo<ColumnDef<Empreiteiro, unknown>[]>(() => [
    { id: 'nome', header: 'Nome', accessorKey: 'nome' },
    { id: 'doc', header: 'CPF/CNPJ', cell: ({ row }) => <Mono>{row.original.documento_mascarado}</Mono> },
    { id: 'rt', header: 'Responsável técnico', accessorFn: (r) => r.responsavel_tecnico ?? '—' },
    { id: 'situacao', header: 'Situação', cell: ({ row }) => <StatusChip label={row.original.situacao} variant={SITUACAO[row.original.situacao]} /> },
    {
      id: 'acoes', header: '', cell: ({ row }) => row.original.situacao === 'cancelado' ? null : (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => setModal({ tipo: 'alvara', alvo: row.original })}>Alvará anual</Button>
          <Button size="xs" variant="outline" onClick={() => setModal({ tipo: 'penalidade', alvo: row.original })}>Penalidade</Button>
        </div>
      ),
    },
  ], []);

  const colObras = useMemo<ColumnDef<AlvaraObra, unknown>[]>(() => [
    { id: 'id', header: 'Alvará', cell: ({ row }) => <Mono>#{row.original.id}</Mono> },
    { id: 'jazigo', header: 'Jazigo (ID)', cell: ({ row }) => <Mono>{row.original.plot_id}</Mono> },
    { id: 'descricao', header: 'Descrição', accessorKey: 'descricao' },
    { id: 'dim', header: 'Projeto (m)', cell: ({ row }) => <Mono>{row.original.comprimento_m} × {row.original.largura_m}</Mono> },
    { id: 'prazo', header: 'Prazo', cell: ({ row }) => <Mono>{formatarData(row.original.prazo_fim)}</Mono> },
    {
      id: 'situacao', header: 'Situação', cell: ({ row }) => (
        <div className="flex gap-1">
          <StatusChip label={row.original.situacao} variant={row.original.situacao === 'pendente' ? 'info' : 'neutral'} />
          {row.original.sinalizada && <StatusChip label="providência" variant="danger" />}
        </div>
      ),
    },
    {
      id: 'acoes', header: '', cell: ({ row }) => row.original.situacao !== 'pendente' ? null : (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={async () => { if (await executar(() => cemiteriosApi.encerrarObra(row.original.id, 'concluida'))) await recarregar(); }}>Concluir</Button>
          <Button size="xs" variant="ghost" onClick={async () => { if (await executar(() => cemiteriosApi.encerrarObra(row.original.id, 'cancelada'))) await recarregar(); }}>Cancelar</Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [executar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={[{ key: 'empreiteiros', label: 'Empreiteiros' }, { key: 'obras', label: 'Alvarás de obra' }]} value={aba} onChange={setAba} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModal({ tipo: 'novo' })}>Novo empreiteiro</Button>
          <Button onClick={() => setModal({ tipo: 'obra' })}>Novo alvará de obra</Button>
        </div>
      </div>
      <ErroBox erro={erro ?? empreiteiros.erro ?? obras.erro} />
      {aba === 'empreiteiros'
        ? <DataTable columns={colEmpreiteiros} data={empreiteiros.dados?.data ?? []} loading={empreiteiros.carregando} searchable emptyText="Nenhum empreiteiro." />
        : <DataTable columns={colObras} data={obras.dados?.data ?? []} loading={obras.carregando} emptyText="Nenhuma obra." />}

      <FormModal aberto={modal?.tipo === 'novo'} titulo="Novo empreiteiro" onFechar={() => setModal(null)}
        campos={[{ nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true }, { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true }, { nome: 'responsavel_tecnico', rotulo: 'Responsável técnico' }]}
        onEnviar={async (v) => { await cemiteriosApi.criarEmpreiteiro(v as { nome: string; documento: string }); await recarregar(); }} />
      <FormModal aberto={modal?.tipo === 'alvara'} titulo={`Alvará anual — ${modal?.alvo?.nome ?? ''}`} onFechar={() => setModal(null)}
        campos={[{ nome: 'numero', rotulo: 'Número', obrigatorio: true }, { nome: 'validade', rotulo: 'Validade', tipo: 'date', obrigatorio: true }]}
        onEnviar={async (v) => { await cemiteriosApi.alvaraAnual(Number(modal?.alvo?.id), v as { numero: string; validade: string }); await recarregar(); }} />
      <FormModal aberto={modal?.tipo === 'penalidade'} titulo={`Penalidade — ${modal?.alvo?.nome ?? ''}`} onFechar={() => setModal(null)} iniciais={{ tipo: 'advertencia' }}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'advertencia', label: 'Advertência' }, { value: 'suspensao', label: 'Suspensão' }] },
          { nome: 'inicio', rotulo: 'Início (suspensão)', tipo: 'date' }, { nome: 'fim', rotulo: 'Fim (suspensão)', tipo: 'date' },
          { nome: 'motivo', rotulo: 'Motivo', tipo: 'textarea', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.penalidade(Number(modal?.alvo?.id), v); await recarregar(); }} />
      <FormModal aberto={modal?.tipo === 'obra'} titulo="Novo alvará de obra" onFechar={() => setModal(null)}
        campos={[
          { nome: 'contractor_id', rotulo: 'Empreiteiro', tipo: 'select', obrigatorio: true,
            opcoes: (empreiteiros.dados?.data ?? []).filter((e) => e.situacao === 'apto').map((e) => ({ value: String(e.id), label: e.nome })) },
          { nome: 'plot_id', rotulo: 'ID do jazigo (com concessão vigente)', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento do projeto (m)', tipo: 'number', obrigatorio: true },
          { nome: 'largura_m', rotulo: 'Largura do projeto (m)', tipo: 'number', obrigatorio: true },
          { nome: 'prazo_fim', rotulo: 'Prazo de execução', tipo: 'date', obrigatorio: true },
          { nome: 'descricao', rotulo: 'Descrição da obra', tipo: 'textarea', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarObra({ ...v, contractor_id: Number(v.contractor_id), plot_id: Number(v.plot_id) }); await recarregar(); }} />
    </div>
  );
};
