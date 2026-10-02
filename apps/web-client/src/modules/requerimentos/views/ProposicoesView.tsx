import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, Button } from '@sysgov/ui';
import { FileText, Plus, RefreshCw, Eye, Pencil, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { MiniKpiCard, StatusBadgeProposicao, FiltrosProposicao } from '../components';
import type { StatusProposicao, FiltrosProposicaoValues } from '../components';
import { requerimentosApi } from '../api';
import type { Proposicao, TipoInstrumento, KpiAutor } from '../api';
import { ProposicaoFormPage } from '../pages/ProposicaoFormPage';
import { DetalhesProposicaoModal } from '../views/DetalhesProposicaoModal';
import { EncaminharProposicaoModal } from '../views/EncaminharProposicaoModal';

export const ProposicoesView: React.FC = () => {
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([]);
  const [tipos, setTipos] = useState<TipoInstrumento[]>([]);
  const [kpis, setKpis] = useState<KpiAutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosProposicaoValues>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Tela cheia de criar/editar (mesmo padrão de LicitaModule/CursosModule: query
  // string pra permitir voltar/compartilhar o link, em vez de só useState local).
  const [searchParams, setSearchParams] = useSearchParams();
  const formParam = searchParams.get('form');
  const formProposicaoId = formParam === null ? null : formParam === 'novo' ? null : Number(formParam);
  const mostrarForm = formParam !== null;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [encaminharProposicao, setEncaminharProposicao] = useState<Proposicao | null>(null);

  const abrirCriar = () => setSearchParams({ form: 'novo' });
  const abrirEditar = (id: number) => setSearchParams({ form: String(id) });
  const fecharForm = () => {
    searchParams.delete('form');
    setSearchParams(searchParams);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // DataTable pagina no cliente (não aceita page/total do servidor) — busca um lote
      // grande de uma vez, igual ao padrão já usado em AccessManagement.
      const [tiposRes, propsRes, minhasRes] = await Promise.all([
        requerimentosApi.getTiposInstrumento(),
        requerimentosApi.getProposicoes({
          ...filtros,
          exercicio: filtros.exercicio ? Number(filtros.exercicio) : undefined,
          per_page: 200,
        }),
        requerimentosApi.getMinhasProposicoes(),
      ]);

      setTipos(tiposRes.data);
      setProposicoes(propsRes.data.data);
      setKpis(minhasRes.data.kpis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar proposições';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.original.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => abrirEditar(row.original.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {row.original.status === 'protocolado' && (
            <Button variant="ghost" size="sm" onClick={() => setEncaminharProposicao(row.original)}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      size: 110,
    },
  ];

  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={carregar} />;
  }

  if (mostrarForm) {
    return (
      <ProposicaoFormPage
        proposicaoId={formProposicaoId}
        tipos={tipos}
        onBack={fecharForm}
        onSaved={() => { fecharForm(); carregar(); }}
      />
    );
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
          <Button onClick={abrirCriar}>
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
        <ScreenState type="loading" title="Carregando proposições..." />
      ) : proposicoesFiltradas.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Nenhuma proposição encontrada"
          description="Crie uma nova proposição ou ajuste os filtros."
          actionLabel="Nova Proposição"
          onAction={abrirCriar}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={proposicoesFiltradas}
              pageSize={15}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Modal de detalhes ────────────────────────────────────────── */}
      {selectedId && (
        <DetalhesProposicaoModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setSelectedId(null); abrirEditar(selectedId); }}
          onEncaminhar={(p) => { setSelectedId(null); setEncaminharProposicao(p); }}
        />
      )}

      {encaminharProposicao && (
        <EncaminharProposicaoModal
          proposicao={encaminharProposicao}
          onClose={() => setEncaminharProposicao(null)}
          onEncaminhado={() => { setEncaminharProposicao(null); carregar(); }}
        />
      )}
    </div>
  );
};