import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Select,
  KpiCard,
} from '@sysgov/ui';
import {
  PageHeader,
  DataTable,
  EmptyState,
  SearchInput,
  StatusChip,
  ScreenState,
  Tabs,
  type TabsItem,
} from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Trophy,
  Download,
  PlayCircle,
  RefreshCw,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';

const api = new SysgovApi();

interface ServidorNfc {
  servidor_id: number;
  nome: string;
  matricula: string;
  notas_ciclos: Record<string, string>;
  nfc: string | null;
  conceito: string | null;
  elegivel: boolean;
}

interface RankingItem extends ServidorNfc {
  posicao: number;
  data_admissao?: string;
  data_nascimento?: string;
}

interface NfcResponse {
  ciclo_id: number;
  nota_corte: string;
  total: number;
  aptos: number;
  inaptos: number;
  servidores: ServidorNfc[];
}

interface RankingResponse {
  ciclo_id: number;
  nota_corte: string;
  total: number;
  ranking: RankingItem[];
}

interface CicloOpcao {
  id: number;
  nome: string;
  ano_competencia: number;
  status: string;
}

const CONCEITO_VARIANT: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
  Excelente: 'success',
  Bom: 'primary',
  Regular: 'warning',
  Insuficiente: 'danger',
};

export const ConsolidacaoPanel: React.FC = () => {
  const [ciclos, setCiclos]             = useState<CicloOpcao[]>([]);
  const [cicloId, setCicloId]           = useState<number | null>(null);
  const [nfcData, setNfcData]           = useState<NfcResponse | null>(null);
  const [rankingData, setRankingData]   = useState<RankingResponse | null>(null);
  const [aba, setAba]                   = useState<'nfc' | 'ranking'>('nfc');
  const [loading, setLoading]           = useState(false);
  const [loadingCiclos, setLoadingCiclos] = useState(false);
  const [processando, setProcessando]   = useState(false);
  const [search, setSearch]             = useState('');
  const [erro, setErro]                 = useState<string | null>(null);
  const [sucesso, setSucesso]           = useState<string | null>(null);

  const carregarCiclos = useCallback(async () => {
    setLoadingCiclos(true);
    try {
      const resp = await api.get<CicloOpcao[]>('/capd/ciclos');
      const lista = resp.data ?? [];
      setCiclos(lista);
      if (lista.length > 0 && !cicloId) {
        const maisRecente = [...lista].sort((a, b) => b.ano_competencia - a.ano_competencia)[0];
        setCicloId(maisRecente.id);
      }
    } catch {
      /* silencioso */
    } finally {
      setLoadingCiclos(false);
    }
  }, [cicloId]);

  useEffect(() => {
    carregarCiclos();
  }, [carregarCiclos]);

  const carregarNfc = useCallback(async () => {
    if (!cicloId) return;
    setLoading(true);
    setErro(null);
    setNfcData(null);
    setRankingData(null);
    try {
      const [nfcResp, rkResp] = await Promise.all([
        api.get<NfcResponse>(`/capd/consolidacao/${cicloId}/nfc`),
        api.get<RankingResponse>(`/capd/consolidacao/${cicloId}/ranking`),
      ]);
      setNfcData(nfcResp.data);
      setRankingData(rkResp.data);
    } catch {
      setErro('Não foi possível calcular as NFCs. Verifique se o ciclo possui avaliações concluídas.');
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  useEffect(() => {
    carregarNfc();
  }, [carregarNfc]);

  const processarConsolidacao = async () => {
    if (!cicloId) return;
    setProcessando(true);
    setErro(null);
    try {
      const resp = await api.post<any>(`/capd/consolidacao/${cicloId}/processar`, {});
      setSucesso(resp.data?.message ?? 'Consolidação trienal processada com sucesso!');
      carregarNfc();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao processar consolidação.');
    } finally {
      setProcessando(false);
    }
  };

  const exportarPdf = () => {
    if (!cicloId) return;
    window.open(`/api/capd/consolidacao/${cicloId}/exportar-pdf`, '_blank');
  };

  const filteredServidores = useMemo(() => {
    if (!nfcData?.servidores) return [];
    if (!search.trim()) return nfcData.servidores;
    const term = search.toLowerCase();
    return nfcData.servidores.filter(
      s => s.nome.toLowerCase().includes(term) || s.matricula.toLowerCase().includes(term)
    );
  }, [nfcData?.servidores, search]);

  const filteredRanking = useMemo(() => {
    if (!rankingData?.ranking) return [];
    if (!search.trim()) return rankingData.ranking;
    const term = search.toLowerCase();
    return rankingData.ranking.filter(
      r => r.nome.toLowerCase().includes(term) || r.matricula.toLowerCase().includes(term)
    );
  }, [rankingData?.ranking, search]);

  const columnsNfc = useMemo<ColumnDef<ServidorNfc, any>[]>(() => [
    {
      id: 'matricula',
      header: 'Matrícula',
      size: 130,
      meta: {
        sortValue: s => s.matricula,
        exportValue: s => s.matricula,
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
          {row.original.matricula}
        </span>
      ),
    },
    {
      id: 'nome',
      header: 'Servidor Público',
      size: 260,
      meta: {
        sortValue: s => s.nome,
        exportValue: s => s.nome,
      },
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">
          {row.original.nome}
        </span>
      ),
    },
    {
      id: 'notas_ciclos',
      header: 'Notas por Ciclo Anual',
      size: 240,
      enableSorting: false,
      cell: ({ row }) => {
        const notas = row.original.notas_ciclos;
        const entries = Object.entries(notas);
        if (entries.length === 0) return <span className="text-muted-foreground text-xs italic">—</span>;
        return (
          <div className="flex flex-wrap gap-2">
            {entries.map(([ano, nota]) => (
              <span key={ano} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded border border-border">
                <span className="text-muted-foreground">{ano}:</span>
                <strong className="font-mono tabular-nums text-foreground">{nota}</strong>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'nfc',
      header: 'NFC Trienal',
      size: 120,
      meta: {
        sortValue: s => (s.nfc ? parseFloat(s.nfc) : -1),
        exportValue: s => s.nfc ?? '',
      },
      cell: ({ row }) => (
        <span className="font-mono font-bold text-sm tabular-nums">
          {row.original.nfc ? (
            <span className={row.original.elegivel ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-destructive font-bold'}>
              {row.original.nfc}
            </span>
          ) : (
            <span className="text-muted-foreground italic text-xs">Pendente</span>
          )}
        </span>
      ),
    },
    {
      id: 'conceito',
      header: 'Conceito',
      size: 130,
      meta: {
        sortValue: s => s.conceito ?? '',
        exportValue: s => s.conceito ?? '',
      },
      cell: ({ row }) => {
        const c = row.original.conceito;
        if (!c) return <span className="text-muted-foreground text-xs">—</span>;
        return <StatusChip label={c} variant={CONCEITO_VARIANT[c] ?? 'neutral'} />;
      },
    },
    {
      id: 'situacao',
      header: 'Situação',
      size: 120,
      meta: {
        sortValue: s => (s.elegivel ? 1 : 0),
        exportValue: s => (s.elegivel ? 'Apto' : 'Inapto'),
      },
      cell: ({ row }) => {
        if (!row.original.nfc) {
          return <StatusChip label="Sem Nota" variant="neutral" />;
        }
        return (
          <StatusChip
            label={row.original.elegivel ? 'Apto' : 'Inapto'}
            variant={row.original.elegivel ? 'success' : 'danger'}
          />
        );
      },
    },
  ], []);

  const columnsRanking = useMemo<ColumnDef<RankingItem, any>[]>(() => [
    {
      id: 'posicao',
      header: 'Posição',
      size: 110,
      meta: {
        sortValue: r => r.posicao,
        exportValue: r => `${r.posicao}º`,
      },
      cell: ({ row }) => {
        const pos = row.original.posicao;
        if (pos === 1) {
          return (
            <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              <Award className="w-4 h-4 text-amber-500" /> 1º Lugar
            </span>
          );
        }
        if (pos === 2) {
          return (
            <span className="font-mono font-bold text-slate-500 text-sm">
              2º Lugar
            </span>
          );
        }
        if (pos === 3) {
          return (
            <span className="font-mono font-bold text-amber-700 dark:text-amber-600 text-sm">
              3º Lugar
            </span>
          );
        }
        return (
          <span className="font-mono font-bold text-muted-foreground text-sm">
            {pos}º
          </span>
        );
      },
    },
    {
      id: 'matricula',
      header: 'Matrícula',
      size: 120,
      meta: {
        sortValue: r => r.matricula,
        exportValue: r => r.matricula,
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
          {row.original.matricula}
        </span>
      ),
    },
    {
      id: 'nome',
      header: 'Servidor Público',
      size: 260,
      meta: {
        sortValue: r => r.nome,
        exportValue: r => r.nome,
      },
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">
          {row.original.nome}
        </span>
      ),
    },
    {
      id: 'nfc',
      header: 'NFC Final',
      size: 120,
      meta: {
        sortValue: r => (r.nfc ? parseFloat(r.nfc) : -1),
        exportValue: r => r.nfc ?? '',
      },
      cell: ({ row }) => (
        <span className="font-mono font-bold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
          {row.original.nfc}
        </span>
      ),
    },
    {
      id: 'conceito',
      header: 'Conceito',
      size: 130,
      meta: {
        sortValue: r => r.conceito ?? '',
        exportValue: r => r.conceito ?? '',
      },
      cell: ({ row }) => {
        const c = row.original.conceito;
        if (!c) return <span className="text-muted-foreground text-xs">—</span>;
        return <StatusChip label={c} variant={CONCEITO_VARIANT[c] ?? 'neutral'} />;
      },
    },
    {
      id: 'data_admissao',
      header: 'Admissão (Desempate)',
      size: 160,
      meta: {
        sortValue: r => r.data_admissao ?? '',
        exportValue: r => r.data_admissao ? new Date(r.data_admissao).toLocaleDateString('pt-BR') : '',
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {row.original.data_admissao
            ? new Date(row.original.data_admissao).toLocaleDateString('pt-BR')
            : '—'}
        </span>
      ),
    },
  ], []);

  const tabItems: TabsItem<'nfc' | 'ranking'>[] = [
    { key: 'nfc', label: 'Notas por Servidor (NFC)', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'ranking', label: 'Ranking de Progressão', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<Trophy className="h-6 w-6" />}
        title="Consolidação NFC Trienal & Ranking"
        subtitle="Nota Final Consolidada (RN-02) e Classificação de Progressão com desempate legal (art. 39, Lei nº 1.704/2006)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {ciclos.length > 0 && (
              <div className="w-64">
                <Select
                  value={cicloId ? String(cicloId) : ''}
                  onChange={v => {
                    setCicloId(v ? Number(v) : null);
                    setNfcData(null);
                    setRankingData(null);
                  }}
                  options={ciclos.map(c => ({
                    value: String(c.id),
                    label: `${c.nome} (${c.ano_competencia})`,
                  }))}
                  placeholder="Selecione o ciclo trienal..."
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={carregarNfc}
              disabled={!cicloId || loading}
              title="Recarregar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {cicloId && nfcData && (
              <>
                <Button variant="outline" size="sm" onClick={exportarPdf}>
                  <Download className="h-4 w-4 mr-1.5" /> Exportar PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={processarConsolidacao}
                  disabled={processando}
                >
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  {processando ? 'Processando...' : 'Processar Consolidação'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Alertas */}
      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* Estado sem ciclo selecionado */}
      {!cicloId && !loadingCiclos && (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="Nenhum ciclo selecionado"
          description="Selecione um ciclo de avaliação no topo para visualizar as notas consolidadas e o ranking."
        />
      )}

      {/* Loading de dados */}
      {cicloId && loading && (
        <ScreenState type="loading" title="Calculando Notas Consolidadas (NFC)..." />
      )}

      {/* Dados consolidados */}
      {cicloId && !loading && nfcData && (
        <div className="space-y-5">
          {/* Grade de KpiCards Canônicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Total de Servidores"
              value={nfcData.total}
              icon={<Users className="h-5 w-5" />}
              iconBgColor="bg-primary/10 text-primary"
            />
            <KpiCard
              title="Servidores Aptos"
              value={nfcData.aptos}
              icon={<CheckCircle className="h-5 w-5" />}
              iconBgColor="bg-status-success-bg text-status-success"
            />
            <KpiCard
              title="Inaptos (Gera PMD)"
              value={nfcData.inaptos}
              icon={<AlertTriangle className="h-5 w-5" />}
              iconBgColor={nfcData.inaptos > 0 ? "bg-status-danger-bg text-status-danger" : "bg-muted text-muted-foreground"}
            />
            <KpiCard
              title="Nota de Corte NFC"
              value={`${nfcData.nota_corte} pts`}
              icon={<Trophy className="h-5 w-5" />}
              iconBgColor="bg-status-warning-bg text-status-warning"
            />
          </div>

          {/* Sub-abas no padrão Tabs */}
          <Tabs
            items={tabItems}
            value={aba}
            onChange={setAba}
          />

          {/* Card com Barra de Busca e DataTable */}
          <Card className="gap-0 py-0">
            <div className="p-3 border-b border-border">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={aba === 'nfc' ? 'Buscar servidor por nome ou matrícula...' : 'Buscar no ranking por nome ou matrícula...'}
              />
            </div>

            <div className="p-3">
              {aba === 'nfc' && (
                <DataTable
                  columns={columnsNfc}
                  data={filteredServidores}
                  emptyText="Nenhum servidor encontrado para este ciclo."
                  pageSize={10}
                  fixedLayout
                />
              )}

              {aba === 'ranking' && rankingData && (
                <div className="space-y-3">
                  <div className="px-1 py-1 text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      Critérios sucessivos de desempate: <strong>(1) Maior NFC</strong> · <strong>(2) Maior tempo de serviço público</strong> · <strong>(3) Maior idade civil</strong>
                    </span>
                    <span className="font-mono text-xs">
                      {rankingData.ranking.length} servidores classificados
                    </span>
                  </div>
                  <DataTable
                    columns={columnsRanking}
                    data={filteredRanking}
                    emptyText="Nenhum servidor classificado no ranking."
                    pageSize={10}
                    fixedLayout
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ConsolidacaoPanel;
