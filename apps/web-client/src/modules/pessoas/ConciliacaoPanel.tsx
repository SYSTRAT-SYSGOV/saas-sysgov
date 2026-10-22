import React, { useState } from 'react';
import { ActionsMenu } from '@sysgov/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { GitMerge } from 'lucide-react';
import { Button, DataTable, PageHeader, Select, StatusChip } from '@/components/ui';
import { pessoasApi, type AdocaoModulo, type DecisaoDivergencia, type PessoaDivergencia } from './api';
import { ErroBox, useAcao, useDados } from './views/comum';

const ROTULO_CAMPO: Record<string, string> = {
  nome: 'Nome',
  nome_social: 'Nome social',
  data_nascimento: 'Data de nascimento',
  nome_mae: 'Nome da mãe',
  nome_pai: 'Nome do pai',
};

/** Adoção do cadastro central pelos módulos e revisão das divergências entre o dado de cada módulo e o da pessoa. */
export const ConciliacaoPanel: React.FC = () => {
  const [modulo, setModulo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [resolvendo, setResolvendo] = useState<number | null>(null);
  const { erro, executar } = useAcao();

  const adocao = useDados(() => pessoasApi.adocao(), []);
  const divergencias = useDados(() => pessoasApi.listarDivergencias({ modulo: modulo || undefined, per_page: 50 }), [modulo]);

  const resolver = async (d: PessoaDivergencia, decisao: DecisaoDivergencia) => {
    setResolvendo(d.id);
    await executar(() => pessoasApi.resolverDivergencia(d.id, decisao));
    setConfirmando(null);
    setResolvendo(null);
    await Promise.all([divergencias.recarregar(), adocao.recarregar()]);
  };

  const colunasAdocao: ColumnDef<AdocaoModulo, unknown>[] = [
    { id: 'modulo', header: 'Módulo', accessorKey: 'modulo' },
    { id: 'total', header: 'Registros', meta: { exportValue: (r) => r.total }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.total}</span> },
    { id: 'vinculados', header: 'Com pessoa', meta: { exportValue: (r) => r.vinculados }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.vinculados}</span> },
    {
      id: 'sem_vinculo', header: 'Sem pessoa', meta: { exportValue: (r) => r.sem_vinculo }, cell: ({ row }) => (
        <StatusChip label={String(row.original.sem_vinculo)} variant={row.original.sem_vinculo > 0 ? 'warning' : 'success'} />
      ),
    },
    { id: 'documento_pendente', header: 'Documento pendente', meta: { exportValue: (r) => r.documento_pendente }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.documento_pendente}</span> },
    {
      id: 'divergencias_abertas', header: 'Divergências abertas', meta: { exportValue: (r) => r.divergencias_abertas }, cell: ({ row }) => (
        <StatusChip label={String(row.original.divergencias_abertas)} variant={row.original.divergencias_abertas > 0 ? 'danger' : 'success'} />
      ),
    },
  ];

  const colunasDivergencias: ColumnDef<PessoaDivergencia, unknown>[] = [
    {
      id: 'acoes', header: '', cell: ({ row }) => {
        const d = row.original;
        const ocupado = resolvendo === d.id;
        if (confirmando === d.id) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Atualizar a pessoa com o valor do módulo?</span>
              <Button size="xs" onClick={() => void resolver(d, 'modulo')} disabled={ocupado}>Confirmar</Button>
              <Button size="xs" variant="outline" onClick={() => setConfirmando(null)} disabled={ocupado}>Cancelar</Button>
            </div>
          );
        }
        return (
          <div className="flex justify-center">
            <ActionsMenu
              triggerLabel="Ações da divergência"
              items={[
                { key: 'manter', label: 'Manter cadastro central', disabled: ocupado, onSelect: () => void resolver(d, 'mdm') },
                { key: 'usar-modulo', label: 'Usar valor do módulo', disabled: ocupado, onSelect: () => setConfirmando(d.id) },
              ]}
            />
          </div>
        );
      },
    },
    { id: 'pessoa', header: 'Pessoa', meta: { exportValue: (r) => r.pessoa_nome ?? `#${r.pessoa_id}` }, cell: ({ row }) => row.original.pessoa_nome ?? `#${row.original.pessoa_id}` },
    { id: 'modulo', header: 'Módulo', accessorKey: 'modulo' },
    { id: 'campo', header: 'Campo', meta: { exportValue: (r) => ROTULO_CAMPO[r.campo] ?? r.campo }, cell: ({ row }) => ROTULO_CAMPO[row.original.campo] ?? row.original.campo },
    { id: 'valor_modulo', header: 'No módulo', meta: { exportValue: (r) => r.valor_modulo }, cell: ({ row }) => <span className="text-sm">{row.original.valor_modulo ?? '—'}</span> },
    { id: 'valor_mdm', header: 'No cadastro central', meta: { exportValue: (r) => r.valor_mdm }, cell: ({ row }) => <span className="text-sm">{row.original.valor_mdm ?? '—'}</span> },
  ];

  const opcoesModulo = (adocao.dados?.modulos ?? []).map((m) => ({ value: m.modulo, label: m.modulo }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliação de dados civis"
        subtitle="Acompanhe quanto de cada módulo já usa o cadastro central de pessoas e decida as divergências encontradas."
        icon={<GitMerge className="h-6 w-6" />}
      />

      <ErroBox erro={erro ?? adocao.erro ?? divergencias.erro} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Adoção por módulo</h3>
        <DataTable exportable exportFileName="pessoas-conciliacao-1" exportTitle="Pessoas — Conciliacao 1" columns={colunasAdocao} data={adocao.dados?.modulos ?? []} loading={adocao.carregando} emptyText="Nenhum módulo registrou conciliação ainda." />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Divergências abertas</h3>
          <Select value={modulo} onChange={(v) => setModulo(v)} options={opcoesModulo} placeholder="Todos os módulos" />
        </div>
        <DataTable exportable exportFileName="pessoas-conciliacao-2" exportTitle="Pessoas — Conciliacao 2" columns={colunasDivergencias} data={divergencias.dados?.data ?? []} loading={divergencias.carregando} emptyText="Nenhuma divergência aberta." />
      </div>
    </div>
  );
};

export default ConciliacaoPanel;
