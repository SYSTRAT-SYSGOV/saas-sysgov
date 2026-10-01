import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, Button } from '@sysgov/ui';
import { FileText, Plus, RefreshCw, Search, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@sysgov/ui';
import { MiniKpiCard, StatusBadgeProposicao, FiltrosProposicao } from '../components';
import type { StatusProposicao, FiltrosProposicaoValues } from '../components';
import { requerimentosApi } from '../api';
import type { Proposicao, TipoInstrumento, PaginatedResponse, KpiAutor } from '../api';
import { CriarProposicaoModal } from '../views/CriarProposicaoModal';
import { DetalhesProposicaoModal } from '../views/DetalhesProposicaoModal';
import { useAuth } from '@/core/auth/useAuth';

export const ProposicoesView: React.FC = () => {
  const { user } = useAuth();

  const [proposicoes, setProposicoes] = useState<Proposicao[]>([]);
  const [tipos, setTipos] = useState<TipoInstrumento[]>([]);
  const [kpis, setKpis] = useState<KpiAutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosProposicaoValues>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modais
  const [showCriar, setShowCriar] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tiposRes, propsRes, minhasRes] = await Promise.all([
        requerimentosApi.getTiposInstrumento(),
        requerimentosApi.getProposicoes({ ...filtros, per_page: 15, page }),
        requerimentosApi.getMinhasProposicoes(),
      ]);

      setTipos(tiposRes.data);
      setProposicoes(propsRes.data.data);
      setTotalPages(propsRes.data.meta.last_page);
      setTotal(propsRes.data.meta.total);
      setKpis(minhasRes.data.kpis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar proposições';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filtros, page]);

  useEffect(() => { carregar(); }, [carregar]);

  const proposicoesFiltradas = useMemo(() => {
    if (!searchTerm) return proposicoes;
    const term = searchTerm.toLowerCase();
    return proposicoes.filter((p) =>
      p.ementa.toLowerCase().includes(term) ||
      p.numero.toLowerCase().includes(term) ||
      p.autor_principal?.name?.toLowerCase().includes(term),
    );
  }, [proposicoes, searchTerm]);

  const handleLimparFiltros = () => {
    setFiltros({});
    setSearchTerm('');
    setPage(1);
  };

  const columns: ColumnDef<Proposicao>[] = [
    {
      accessorKey: 'numero',
      header: 'Número',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-semibold">{getValue() as string}</span>
      ),
      size: 150,
    },
    {
      accessorKey: 'ementa',
      header: 'Ementa',
      cell: ({ getValue, row }) => (
        <div className="min-w-0">
          <p className="text-sm truncate max-w-md">{getValue() as string}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.tipo_instrumento?.nome} • {row.original.autor_principal?.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'area_tematica',
      header: 'Área',
      cell: ({ getValue }) => (
        <span className="text-xs">{(getValue() as string) ?? '—'}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <StatusBadgeProposicao status={getValue() as StatusProposicao} />
      ),
      size: 160,
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(getValue() as string).toLocaleDateString('pt-BR')}
        </span>
      ),
      size: 100,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.original.id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
      size: 50,
    },
  ];

  if (error) {
    return <ScreenState variant="error" title="Erro ao carregar" message={error} onRetry={carregar} />;
  }

  const tipoOptions = tipos
    .filter((t) => t.ativo)
    .map((t) => ({ value: t.slug, label: t.nome }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title="Proposições"
        subtitle="Gerencie requerimentos, indicações, projetos de lei e demais instrumentos legislativos"
        actions={
          <Button onClick={() => setShowCriar(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposição
          </Button>
        }
      />

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpiCard
            title="Total de Proposições"
            value={kpis.total}
            icon={<FileText className="h-5 w-5" />}
            variant="default"
          />
          <MiniKpiCard
            title="Em Tramitação"
            value={kpis.em_tramitacao}
            icon={<RefreshCw className="h-5 w-5" />}
            variant="info"
          />
          <MiniKpiCard
            title="Respondidas"
            value={kpis.respondidas}
            icon={<FileText className="h-5 w-5" />}
            variant="success"
          />
          <MiniKpiCard
            title="Vencidas"
            value={kpis.vencidas}
            icon={<FileText className="h-5 w-5" />}
            variant="danger"
          />
        </div>
      )}

      {/* ── Filtros + Busca ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <FiltrosProposicao
          tipos={tipoOptions}
          filtros={filtros}
          onChange={setFiltros}
          onLimpar={handleLimparFiltros}
        />
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por número, ementa ou autor..."
          className="w-full sm:w-72"
        />
      </div>

      {/* ── Tabela ────────────────────────────────────────────────── */}
      {loading ? (
        <ScreenState variant="loading" title="Carregando proposições..." />
      ) : proposicoesFiltradas.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Nenhuma proposição encontrada"
          description="Crie uma nova proposição ou ajuste os filtros."
          action={
            <Button onClick={() => setShowCriar(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposição
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={proposicoesFiltradas}
              pagination={{ page, totalPages, total, onPageChange: setPage }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Modais ───────────────────────────────────────────────────── */}
      {showCriar && (
        <CriarProposicaoModal
          tipos={tipos}
          onClose={() => setShowCriar(false)}
          onCreated={() => { setShowCriar(false); carregar(); }}
        />
      )}
      {selectedId && (
        <DetalhesProposicaoModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};