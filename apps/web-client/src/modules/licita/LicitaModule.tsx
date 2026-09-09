import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Plus, Gavel, Search } from 'lucide-react';
import { Button, Card } from '@sysgov/ui';
import { PageHeader, DataTable, EmptyState, SearchInput, StatusChip, ScreenState } from '@/components/ui';
import { sysgovApi, type FaseLicita, type Processo, type StatusDfd } from '@sysgov/sdk';
import type { ColumnDef } from '@tanstack/react-table';
import { ProcessoFormModal } from './components/ProcessoFormModal';
import { DfdWorkspaceModal } from './components/DfdWorkspaceModal';

const FASE_LABEL: Record<FaseLicita, string> = {
  dfd: 'DFD',
  etp: 'ETP',
  mapa_riscos: 'Mapa de Riscos',
  pesquisa_precos: 'Pesquisa de Preços',
  tr: 'Termo de Referência',
  edital: 'Edital',
  concluido: 'Concluído',
};

const DFD_STATUS_LABEL: Record<StatusDfd, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const DFD_STATUS_VARIANT: Record<StatusDfd, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

export const LicitaModule: React.FC = () => {
  const { tenant } = useTenant();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Processo | null>(null);

  // A listagem só traz o DFD "raso" (sem versões/elaborador/aprovador) —
  // busca o processo completo antes de abrir o workspace pra evitar
  // renderizar o modal com relações undefined.
  const openWorkspace = async (processoId: number) => {
    try {
      const completo = await sysgovApi.licita.getProcesso(processoId);
      setSelected(completo);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar o processo.');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sysgovApi.licita.listProcessos({ per_page: 50 });
      setProcessos(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar processos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      processos.filter((p) =>
        [p.numero, p.objeto].some((t) => t?.toLowerCase().includes(search.toLowerCase())),
      ),
    [processos, search],
  );

  const handleProcessoChanged = (atualizado: Processo) => {
    setProcessos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
    setSelected(atualizado);
  };

  const columns = useMemo<ColumnDef<Processo, any>[]>(
    () => [
      {
        id: 'numero',
        header: 'Processo',
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-bold tabular-nums text-foreground">
              {row.original.numero}/{row.original.ano}
            </span>
            <span className="block text-[11px] text-muted-foreground truncate max-w-[320px]">
              {row.original.objeto || 'Objeto ainda não definido'}
            </span>
          </div>
        ),
      },
      {
        id: 'fase_atual',
        header: 'Fase Atual',
        cell: ({ row }) => <StatusChip label={FASE_LABEL[row.original.fase_atual]} variant="primary" />,
      },
      {
        id: 'dfd_status',
        header: 'Status do DFD',
        cell: ({ row }) => {
          const dfd = row.original.dfd;
          if (!dfd) return <span className="text-xs text-muted-foreground italic">Não iniciado</span>;
          return <StatusChip label={DFD_STATUS_LABEL[dfd.status]} variant={DFD_STATUS_VARIANT[dfd.status]} />;
        },
      },
      {
        id: 'created_at',
        header: 'Criado em',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString('pt-BR')}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<Gavel className="h-6 w-6" />}
          title="Licita — Instrução Processual"
          badge="Lei 14.133/2021"
          subtitle={`${tenant?.name} — DFD, ETP, Mapa de Riscos, Pesquisa de Preços, TR e Edital`}
        />
        <ScreenState type="loading" title="Carregando processos..." />
      </div>
    );
  }

  if (error && processos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<Gavel className="h-6 w-6" />}
          title="Licita — Instrução Processual"
          badge="Lei 14.133/2021"
          subtitle={`${tenant?.name} — DFD, ETP, Mapa de Riscos, Pesquisa de Preços, TR e Edital`}
        />
        <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gavel className="h-6 w-6" />}
        title="Licita — Instrução Processual"
        badge="Lei 14.133/2021"
        subtitle={`${tenant?.name} — DFD, ETP, Mapa de Riscos, Pesquisa de Preços, TR e Edital`}
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Novo Processo
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número ou objeto..." />
        </div>
        <div className="p-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10" />}
              title="Nenhum processo encontrado"
              description="Crie um novo processo para iniciar a instrução (DFD)."
              actionLabel="Novo Processo"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              emptyText="Nenhum processo encontrado."
              pageSize={10}
              onRowClick={(row) => openWorkspace(row.id)}
            />
          )}
        </div>
      </Card>

      <ProcessoFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(processo) => {
          setProcessos((prev) => [processo, ...prev]);
          setShowCreate(false);
          setSelected(processo);
        }}
      />

      {selected && (
        <DfdWorkspaceModal
          processo={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onChanged={handleProcessoChanged}
        />
      )}
    </div>
  );
};

export default LicitaModule;
