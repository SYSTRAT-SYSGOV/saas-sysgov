import React, { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plug, Plus, RefreshCw } from 'lucide-react';
import { Button, DataTable, PageHeader, Select, StatusChip } from '@/components/ui';
import {
  pessoasApi, STATUS_SYNC_LOG,
  type PessoaIntegracao, type PessoaSyncLog, type StatusSyncLog,
} from './api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './views/comum';

const opcoesStatusLog = Object.entries(STATUS_SYNC_LOG).map(([value, label]) => ({ value, label }));

/** Gestão de integrações com sistemas de gestão da prefeitura e histórico de sincronização. */
export const IntegracoesPanel: React.FC = () => {
  const [modal, setModal] = useState<'nova' | PessoaIntegracao | null>(null);
  const [statusLog, setStatusLog] = useState<StatusSyncLog | null>(null);
  const [reprocessando, setReprocessando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { erro, executar } = useAcao();

  const integracoes = useDados(() => pessoasApi.listarIntegracoes(), []);
  const logs = useDados(() => pessoasApi.listarSyncLogs({ status: statusLog || undefined, per_page: 50 }), [statusLog]);

  const reprocessar = async (log: PessoaSyncLog) => {
    setReprocessando(log.id);
    setAviso(null);
    const resultado = await executar(() => pessoasApi.reprocessarSyncLog(log.id));
    if (resultado) setAviso('Reprocessamento agendado — o resultado aparecerá em uma nova entrada do histórico em instantes.');
    await logs.recarregar();
    setReprocessando(null);
  };

  const colunasIntegracoes: ColumnDef<PessoaIntegracao, unknown>[] = [
    { id: 'nome', header: 'Nome', accessorKey: 'nome' },
    { id: 'api_url', header: 'URL', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.api_url ?? '—'}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusChip label={row.original.is_active ? 'Ativa' : 'Inativa'} variant={row.original.is_active ? 'success' : 'neutral'} /> },
    { id: 'ultima_sincronizacao_em', header: 'Última sincronização', cell: ({ row }) => <Mono>{row.original.ultima_sincronizacao_em ?? '—'}</Mono> },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        <Button size="xs" variant="outline" onClick={() => setModal(row.original)}>Editar</Button>
      ),
    },
  ];

  const colunasLogs: ColumnDef<PessoaSyncLog, unknown>[] = [
    { id: 'created_at', header: 'Quando', cell: ({ row }) => <Mono>{row.original.created_at}</Mono> },
    {
      id: 'status', header: 'Status', cell: ({ row }) => (
        <StatusChip label={STATUS_SYNC_LOG[row.original.status]} variant={row.original.status === 'sucesso' ? 'success' : row.original.status === 'erro' ? 'danger' : 'neutral'} />
      ),
    },
    {
      id: 'contadores', header: 'Processados / sucesso / falha', cell: ({ row }) => (
        <Mono>{row.original.registros_processados} / {row.original.registros_sucesso} / {row.original.registros_falha}</Mono>
      ),
    },
    { id: 'detalhes', header: 'Detalhes', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.detalhes?.erro ? String(row.original.detalhes.erro) : '—'}</span> },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        row.original.status === 'erro' ? (
          <Button size="xs" variant="outline" disabled={reprocessando === row.original.id} onClick={() => void reprocessar(row.original)}>
            <RefreshCw className="h-3 w-3" /> {reprocessando === row.original.id ? 'Reprocessando…' : 'Reprocessar'}
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações de Pessoas" subtitle="Conexões com sistemas de gestão da prefeitura e histórico de sincronização." icon={<Plug className="h-6 w-6" />} />

      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Integrações cadastradas</h3>
          <Button size="sm" onClick={() => setModal('nova')}><Plus className="h-4 w-4" /> Nova integração</Button>
        </div>
        <DataTable columns={colunasIntegracoes} data={integracoes.dados ?? []} loading={integracoes.carregando} emptyText="Nenhuma integração cadastrada." />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Histórico de sincronização</h3>
          <Select value={statusLog} onChange={(v) => setStatusLog(v as StatusSyncLog | null)} options={opcoesStatusLog} placeholder="Todos os status" />
        </div>
        <DataTable columns={colunasLogs} data={logs.dados?.data ?? []} loading={logs.carregando} emptyText="Nenhuma sincronização registrada." />
      </div>

      <FormModal
        aberto={modal !== null}
        titulo={modal && modal !== 'nova' ? 'Editar integração' : 'Nova integração'}
        onFechar={() => setModal(null)}
        iniciais={modal && modal !== 'nova' ? {
          nome: modal.nome,
          api_url: modal.api_url ?? '',
          field_mappings: modal.field_mappings ? JSON.stringify(modal.field_mappings) : '',
          is_active: modal.is_active,
        } : { is_active: true }}
        campos={[
          { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
          { nome: 'api_url', rotulo: 'URL da API', obrigatorio: true, dica: 'Endpoint que recebe ?cpf=... e retorna os dados da pessoa.' },
          { nome: 'api_token', rotulo: 'Token de acesso', tipo: 'password', mono: true, dica: modal && modal !== 'nova' ? 'Deixe em branco para manter o token atual.' : 'Armazenado cifrado; nunca reexibido.' },
          { nome: 'field_mappings', rotulo: 'Mapeamento de campos (JSON)', tipo: 'textarea', dica: 'Ex.: {"nome": "dados.nomeCompleto"}. Deixe em branco para usar os nomes padrão.' },
          { nome: 'is_active', rotulo: 'Integração ativa', tipo: 'switch' },
        ]}
        onEnviar={async (v) => {
          const payload: Record<string, unknown> = { ...v };
          if (typeof payload.field_mappings === 'string') {
            payload.field_mappings = payload.field_mappings.trim() ? JSON.parse(payload.field_mappings) : undefined;
          }
          if (!payload.api_token) delete payload.api_token;

          if (modal && modal !== 'nova') await pessoasApi.atualizarIntegracao(modal.id, payload);
          else await pessoasApi.criarIntegracao(payload);
          await integracoes.recarregar();
        }}
      />
    </div>
  );
};

export default IntegracoesPanel;
