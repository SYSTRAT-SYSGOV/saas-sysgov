import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, ConfirmDialog, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarCentavos, formatarData, type Concessao, type Concessionario } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';

const SITUACAO: Record<string, 'success' | 'warning' | 'danger'> = { vigente: 'success', expirada: 'warning', extinta: 'danger' };

/** Concessionários (CPF mascarado) e concessões temporárias/perpétuas (RF-11..RF-14). */
export const ConcessoesView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const gerencia = can('cemiterios.concessoes.manage');
  const [aba, setAba] = useState<'concessoes' | 'titulares'>('concessoes');
  const [modal, setModal] = useState<'concessao' | 'titular' | null>(null);
  const [renovar, setRenovar] = useState<Concessao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const concessoes = useDados(
    () => cemiteriosApi.concessoes({ park_id: cemiterioAtivoId ?? undefined, per_page: 100 }),
    [cemiterioAtivoId]
  );
  const titulares = useDados(() => (gerencia ? cemiteriosApi.titulares() : Promise.resolve(null)), [gerencia]);
  const { erro, executar } = useAcao();

  const colunasConcessoes = useMemo<ColumnDef<Concessao, unknown>[]>(() => [
    { id: 'numero', header: 'Número', accessorKey: 'numero', cell: ({ row }) => <Mono className="font-bold">{row.original.numero}</Mono> },
    {
      id: 'processo',
      header: 'Proc. Adm.',
      accessorKey: 'processo_administrativo',
      cell: ({ row }) => row.original.processo_administrativo ? <Mono className="text-xs">{row.original.processo_administrativo}</Mono> : <span className="text-muted-foreground">—</span>,
    },
    { id: 'jazigo', header: 'Jazigo', accessorFn: (r) => r.jazigo?.codigo ?? '', cell: ({ row }) => <Mono>{row.original.jazigo?.codigo}</Mono> },
    {
      id: 'titular',
      header: 'Concessionário',
      accessorFn: (r) => r.concessionario?.nome ?? '',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.concessionario?.nome ?? '—'}</span>
          {row.original.concessionario?.titular_falecido && (
            <span className="ml-2 inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              ⚠️ Titular Falecido
            </span>
          )}
        </div>
      ),
    },
    { id: 'modalidade', header: 'Modalidade', accessorKey: 'modalidade' },
    { id: 'termino', header: 'Término', cell: ({ row }) => <Mono>{row.original.termino ? formatarData(row.original.termino) : 'Perpétua'}</Mono> },
    {
      id: 'situacao', header: 'Situação', cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusChip label={row.original.situacao} variant={SITUACAO[row.original.situacao] ?? 'neutral'} />
          {row.original.pendencia_regularizacao && <StatusChip label="regularizar" variant="danger" />}
        </div>
      ),
    },
    {
      id: 'acoes', header: '', cell: ({ row }) => gerencia && row.original.modalidade === 'temporaria' && row.original.situacao === 'vigente'
        ? <Button size="xs" variant="outline" onClick={() => setRenovar(row.original)}>Renovar</Button> : null,
    },
  ], [gerencia]);

  const colunasTitulares = useMemo<ColumnDef<Concessionario, unknown>[]>(() => [
    { id: 'nome', header: 'Nome', accessorKey: 'nome' },
    { id: 'doc', header: 'CPF/CNPJ', accessorKey: 'documento_mascarado', cell: ({ row }) => <Mono>{row.original.documento_mascarado}</Mono> },
    {
      id: 'situacao_titular',
      header: 'Sucessão / Status',
      cell: ({ row }) => row.original.titular_falecido ? (
        <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
          Falecido {row.original.data_falecimento_titular ? `(${formatarData(row.original.data_falecimento_titular)})` : ''}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Vivo / Regular</span>
      ),
    },
    { id: 'base', header: 'Base legal (LGPD)', accessorKey: 'base_legal' },
  ], []);

  const confirmarRenovacao = async () => {
    const alvo = renovar;
    setRenovar(null);
    if (!alvo) return;
    const r = await executar(() => cemiteriosApi.renovar(alvo.id));
    if (r) {
      setAviso(`Concessão ${r.concessao.numero} renovada até ${formatarData(r.concessao.termino)}. Guia ${r.guia.numero} de ${formatarCentavos(r.guia.valor_centavos)} emitida.`);
      await concessoes.recarregar();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={[{ key: 'concessoes', label: 'Concessões' }, ...(gerencia ? [{ key: 'titulares' as const, label: 'Concessionários' }] : [])]} value={aba} onChange={setAba} />
        {gerencia && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal('titular')}>Novo concessionário</Button>
            <Button onClick={() => setModal('concessao')}>Nova concessão</Button>
          </div>
        )}
      </div>
      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? concessoes.erro} />
      {aba === 'concessoes'
        ? <DataTable columns={colunasConcessoes} data={concessoes.dados?.data ?? []} loading={concessoes.carregando} searchable emptyText="Nenhuma concessão." />
        : <DataTable columns={colunasTitulares} data={titulares.dados?.data ?? []} loading={titulares.carregando} searchable emptyText="Nenhum concessionário." />}

      <FormModal aberto={modal === 'titular'} titulo="Novo concessionário" onFechar={() => setModal(null)} iniciais={{ base_legal: 'execucao_contrato' }}
        campos={[
          { nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true },
          { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true, dica: 'Armazenado cifrado; exibido mascarado.' },
          { nome: 'email', rotulo: 'E-mail' }, { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'endereco', rotulo: 'Endereço' },
          { nome: 'base_legal', rotulo: 'Base legal', tipo: 'select', opcoes: [
            { value: 'execucao_contrato', label: 'Execução de contrato' }, { value: 'obrigacao_legal', label: 'Obrigação legal' }, { value: 'consentimento', label: 'Consentimento' },
          ] },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarTitular(v as Partial<Concessionario> & { documento: string }); await titulares.recarregar(); }} />
      <FormModal aberto={modal === 'concessao'} titulo="Nova concessão" onFechar={() => setModal(null)} iniciais={{ modalidade: 'temporaria' }}
        campos={[
          { nome: 'plot_id', rotulo: 'ID do jazigo (Disponível)', tipo: 'number', obrigatorio: true },
          { nome: 'holder_id', rotulo: 'Concessionário', tipo: 'select', obrigatorio: true,
            opcoes: (titulares.dados?.data ?? []).map((t) => ({ value: String(t.id), label: `${t.nome} — ${t.documento_mascarado}` })) },
          { nome: 'modalidade', rotulo: 'Modalidade', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'temporaria', label: 'Temporária' }, { value: 'perpetua', label: 'Perpétua' }] },
          { nome: 'processo_administrativo', rotulo: 'Processo Administrativo', dica: 'Ex.: Proc. 1024/2026' },
          { nome: 'inicio', rotulo: 'Início', tipo: 'date' },
        ]}
        onEnviar={async (v) => {
          // A versão lida do jazigo segue na requisição: concessão simultânea recebe 409 (RNF-06).
          const jazigo = await cemiteriosApi.jazigo(Number(v.plot_id));
          await cemiteriosApi.conceder({
            plot_id: jazigo.id,
            holder_id: Number(v.holder_id),
            modalidade: String(v.modalidade),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
            inicio: (v.inicio as string) || undefined,
            lock_version: jazigo.lock_version,
          });
          await concessoes.recarregar();
        }} />
      <ConfirmDialog open={renovar !== null} onClose={() => setRenovar(null)} onConfirm={() => void confirmarRenovacao()}
        title={`Renovar concessão ${renovar?.numero ?? ''}`} description="A renovação estende o término pelo prazo vigente e emite a guia pelo preço atual." confirmLabel="Renovar" />
    </div>
  );
};
