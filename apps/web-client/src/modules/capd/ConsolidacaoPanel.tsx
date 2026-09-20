import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Select,
  Badge,
  StatCard,
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
  History,
  Scale,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
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

interface ConsolidacaoHistoricoItem {
  id: number;
  servidor_id: number;
  trienio: number;
  notas_ciclos: Record<string, string>;
  nfc: string;
  conceito: string;
  elegivel_progressao: boolean;
  versao: number;
  created_at: string;
}

interface HistoricoResponse {
  trienio: number;
  total: number;
  consolidacoes: ConsolidacaoHistoricoItem[];
}

const CONCEITO_VARIANT: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
  Excelente: 'success',
  Bom: 'primary',
  Regular: 'warning',
  Insuficiente: 'danger',
};

const CORES_CONCEITOS: Record<string, string> = {
  Excelente: 'bg-emerald-500 text-white dark:bg-emerald-600',
  Bom: 'bg-indigo-500 text-white dark:bg-indigo-600',
  Regular: 'bg-amber-500 text-white dark:bg-amber-600',
  Insuficiente: 'bg-rose-500 text-white dark:bg-rose-600',
  Pendente: 'bg-slate-400 text-white dark:bg-slate-600',
};

export const ConsolidacaoPanel: React.FC = () => {
  const [ciclos, setCiclos]             = useState<CicloOpcao[]>([]);
  const [cicloId, setCicloId]           = useState<number | null>(null);
  const [nfcData, setNfcData]           = useState<NfcResponse | null>(null);
  const [rankingData, setRankingData]   = useState<RankingResponse | null>(null);
  const [historicoData, setHistoricoData] = useState<HistoricoResponse | null>(null);
  const [aba, setAba]                   = useState<'nfc' | 'ranking' | 'historico'>('nfc');
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
    setHistoricoData(null);
    try {
      const [nfcResp, rkResp, histResp] = await Promise.all([
        api.get<NfcResponse>(`/capd/consolidacao/${cicloId}/nfc`),
        api.get<RankingResponse>(`/capd/consolidacao/${cicloId}/ranking`),
        api.get<HistoricoResponse>(`/capd/consolidacao/${cicloId}/historico`),
      ]);
      setNfcData(nfcResp.data);
      setRankingData(rkResp.data);
      setHistoricoData(histResp.data);
    } catch {
      setErro('Não foi possível calcular as NFCs. Verifique se o ciclo possui avaliações concluídas.');
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  useEffect(() => {
    if (cicloId) {
      carregarNfc();
    }
  }, [cicloId, carregarNfc]);

  const processarConsolidacao = async () => {
    if (!cicloId) return;
    setProcessando(true);
    setErro(null);
    try {
      const resp = await api.post<any>(`/capd/consolidacao/${cicloId}/processar`, {});
      setSucesso(resp.data?.message ?? 'Consolidação trienal processada e persistida com sucesso!');
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

  const servidorPorId = useMemo(() => {
    const mapa = new Map<number, ServidorNfc>();
    for (const s of nfcData?.servidores ?? []) mapa.set(s.servidor_id, s);
    return mapa;
  }, [nfcData?.servidores]);

  const filteredHistorico = useMemo(() => {
    if (!historicoData?.consolidacoes) return [];
    if (!search.trim()) return historicoData.consolidacoes;
    const term = search.toLowerCase();
    return historicoData.consolidacoes.filter(h => {
      const s = servidorPorId.get(h.servidor_id);
      return s ? (s.nome.toLowerCase().includes(term) || s.matricula.toLowerCase().includes(term)) : false;
    });
  }, [historicoData?.consolidacoes, search, servidorPorId]);

  const filteredRanking = useMemo(() => {
    if (!rankingData?.ranking) return [];
    if (!search.trim()) return rankingData.ranking;
    const term = search.toLowerCase();
    return rankingData.ranking.filter(
      r => r.nome.toLowerCase().includes(term) || r.matricula.toLowerCase().includes(term)
    );
  }, [rankingData?.ranking, search]);

  // Estatísticas e Métricas Analíticas
  const analiseConceitos = useMemo(() => {
    const servidores = nfcData?.servidores ?? [];
    const total = servidores.length;
    const contagem = {
      Excelente: 0,
      Bom: 0,
      Regular: 0,
      Insuficiente: 0,
      Pendente: 0,
    };
    let somaNotas = 0;
    let qtdNotas = 0;

    for (const s of servidores) {
      if (s.nfc) {
        const val = parseFloat(s.nfc);
        if (!isNaN(val)) {
          somaNotas += val;
          qtdNotas++;
        }
      }
      const c = s.conceito as keyof typeof contagem;
      if (c && contagem[c] !== undefined) {
        contagem[c]++;
      } else {
        contagem.Pendente++;
      }
    }

    const mediaGlobal = qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(2) : '0.00';
    const taxaAptos = total > 0 ? (((nfcData?.aptos ?? 0) / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      contagem,
      mediaGlobal,
      taxaAptos,
    };
  }, [nfcData]);

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
              <span key={ano} className="inline-flex items-center gap-1 text-xs bg-muted/40 px-2 py-0.5 rounded border border-border">
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
      header: 'Admissão (2º Critério)',
      size: 160,
      meta: {
        sortValue: r => r.data_admissao ?? '',
        exportValue: r => r.data_admissao ?? '',
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {row.original.data_admissao ? new Date(row.original.data_admissao).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
    {
      id: 'data_nascimento',
      header: 'Nascimento (3º Critério)',
      size: 160,
      meta: {
        sortValue: r => r.data_nascimento ?? '',
        exportValue: r => r.data_nascimento ?? '',
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {row.original.data_nascimento ? new Date(row.original.data_nascimento).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
  ], []);

  const columnsHistorico = useMemo<ColumnDef<ConsolidacaoHistoricoItem, any>[]>(() => [
    {
      id: 'servidor',
      header: 'Servidor Público',
      size: 260,
      meta: {
        sortValue: h => servidorPorId.get(h.servidor_id)?.nome ?? `Servidor #${h.servidor_id}`,
        exportValue: h => servidorPorId.get(h.servidor_id)?.nome ?? `Servidor #${h.servidor_id}`,
      },
      cell: ({ row }) => {
        const s = servidorPorId.get(row.original.servidor_id);
        return (
          <div>
            <div className="font-medium text-foreground text-sm">
              {s?.nome ?? `Servidor #${row.original.servidor_id}`}
            </div>
            {s && (
              <span className="font-mono text-xs text-muted-foreground">{s.matricula}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'trienio',
      header: 'Ano Triênio',
      size: 120,
      meta: { sortValue: h => h.trienio, exportValue: h => h.trienio },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums font-semibold">{row.original.trienio}</span>
      ),
    },
    {
      id: 'versao',
      header: 'Versão',
      size: 90,
      meta: { sortValue: h => h.versao, exportValue: h => `v${h.versao}` },
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs tabular-nums">
          v{row.original.versao}
        </Badge>
      ),
    },
    {
      id: 'nfc',
      header: 'NFC',
      size: 100,
      meta: { sortValue: h => parseFloat(h.nfc), exportValue: h => h.nfc },
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
      meta: { sortValue: h => h.conceito, exportValue: h => h.conceito },
      cell: ({ row }) => <StatusChip label={row.original.conceito} variant={CONCEITO_VARIANT[row.original.conceito] ?? 'neutral'} />,
    },
    {
      id: 'elegivel_progressao',
      header: 'Situação',
      size: 110,
      meta: { sortValue: h => (h.elegivel_progressao ? 1 : 0), exportValue: h => (h.elegivel_progressao ? 'Apto' : 'Inapto') },
      cell: ({ row }) => (
        <StatusChip
          label={row.original.elegivel_progressao ? 'Apto' : 'Inapto'}
          variant={row.original.elegivel_progressao ? 'success' : 'danger'}
        />
      ),
    },
    {
      id: 'created_at',
      header: 'Persistido em',
      size: 160,
      meta: { sortValue: h => h.created_at, exportValue: h => new Date(h.created_at).toLocaleString('pt-BR') },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {new Date(row.original.created_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
  ], [servidorPorId]);

  const tabItems: TabsItem<'nfc' | 'ranking' | 'historico'>[] = [
    { key: 'nfc', label: 'Notas por Servidor (NFC)', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'ranking', label: 'Ranking de Progressão (Art. 39)', icon: <Trophy className="w-3.5 h-3.5" /> },
    { key: 'historico', label: 'Histórico de Consolidações', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const cicloSelecionado = ciclos.find(c => c.id === cicloId);

  return (
    <div className="space-y-6">
      {/* ── PageHeader Canônico ── */}
      <PageHeader
        icon={<Trophy className="h-6 w-6 text-primary" />}
        title="Consolidação NFC Trienal & Ranking"
        subtitle="Média ponderada do triênio de estágio probatório (RN-02) e Classificação com critérios objetivos de desempate legal (Art. 39 da Lei nº 1.704/2006)"
        badge="Homologação Trienal"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {ciclos.length > 0 && (
              <div className="w-72">
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
                  className="shadow-sm"
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
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* Estado sem ciclo selecionado */}
      {!cicloId && !loadingCiclos && (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="Nenhum ciclo selecionado"
          description="Selecione um ciclo de avaliação no seletor acima para visualizar as notas consolidadas e o ranking de progressão."
        />
      )}

      {/* Loading de dados */}
      {cicloId && loading && (
        <ScreenState type="loading" title="Calculando Notas Consolidadas (NFC Trienal)..." />
      )}

      {/* Dados consolidados */}
      {cicloId && !loading && nfcData && (
        <div className="space-y-6">
          {/* ── 4 STATCARDS DEDICADOS EXCLUSIVAMENTE À CONSOLIDAÇÃO TRIENAL ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total de Servidores no Triênio"
              value={`${nfcData.total} Servidores`}
              caption={
                cicloSelecionado
                  ? `Ciclo de referência: ${cicloSelecionado.ano_competencia}`
                  : 'Avaliados em estágio probatório'
              }
              accentClassName="border-l-indigo-500"
              valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums"
            />

            <StatCard
              label="Aptos à Progressão / Estabilidade"
              value={`${nfcData.aptos} Aptos`}
              caption={`${analiseConceitos.taxaAptos}% de aprovação no triênio`}
              accentClassName="border-l-emerald-500"
              valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums"
              captionClassName="text-emerald-600 dark:text-emerald-400"
            />

            <StatCard
              label="Inaptos (Encaminhados ao PMD)"
              value={`${nfcData.inaptos} Inaptos`}
              caption={
                nfcData.inaptos > 0
                  ? 'Abertura compulsória de plano de melhoria (Art. 40)'
                  : 'Nenhum servidor abaixo da nota de corte'
              }
              accentClassName={nfcData.inaptos > 0 ? 'border-l-rose-500' : 'border-l-slate-400'}
              valueClassName={
                nfcData.inaptos > 0
                  ? 'text-rose-600 dark:text-rose-400 font-mono tabular-nums'
                  : 'text-muted-foreground font-mono tabular-nums'
              }
              captionClassName={nfcData.inaptos > 0 ? 'text-rose-500' : undefined}
            />

            <StatCard
              label="Nota de Corte Regulamentar"
              value={`${nfcData.nota_corte} pts`}
              caption={`Média global apurada: ${analiseConceitos.mediaGlobal} pts`}
              accentClassName="border-l-amber-500"
              valueClassName="text-amber-600 dark:text-amber-400 font-mono tabular-nums"
            />
          </div>

          {/* ── CARD DE DISTRIBUIÇÃO CONCEITUAL EMPILHADA ── */}
          <Card className="p-4 space-y-3 border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Distribuição dos Conceitos do Triênio (0% a 100%)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {analiseConceitos.total} servidores avaliados no triênio
              </span>
            </div>

            {/* Trilha Gráfica Empilhada */}
            <div className="w-full h-8 bg-muted/40 rounded-lg overflow-hidden flex border border-border/70 p-0.5 shadow-inner">
              {['Excelente', 'Bom', 'Regular', 'Insuficiente', 'Pendente'].map((conc) => {
                const count = analiseConceitos.contagem[conc as keyof typeof analiseConceitos.contagem] || 0;
                if (count <= 0 || analiseConceitos.total <= 0) return null;
                const perc = (count / analiseConceitos.total) * 100;
                const cor = CORES_CONCEITOS[conc];

                return (
                  <div
                    key={conc}
                    style={{ width: `${perc}%` }}
                    className={`h-full flex items-center justify-center transition-all duration-300 relative group select-none text-[11px] font-bold font-mono ${cor} first:rounded-l-md last:rounded-r-md`}
                    title={`${conc}: ${count} servidor(es) (${perc.toFixed(1)}%)`}
                  >
                    {perc >= 8 ? (
                      <span className="truncate px-1 drop-shadow-sm">
                        {conc} ({count})
                      </span>
                    ) : perc >= 4 ? (
                      <span className="truncate px-0.5 text-[9px] drop-shadow-sm">{count}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Legenda com contagem e percentual */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {(['Excelente', 'Bom', 'Regular', 'Insuficiente'] as const).map((conc) => {
                const count = analiseConceitos.contagem[conc] || 0;
                const perc = analiseConceitos.total > 0 ? ((count / analiseConceitos.total) * 100).toFixed(1) : '0.0';
                const cor = CORES_CONCEITOS[conc];

                return (
                  <div
                    key={conc}
                    className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded border border-border/50 text-muted-foreground"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${cor} shrink-0`} />
                    <span className="font-semibold text-foreground">{conc}:</span>
                    <span className="font-mono tabular-nums font-bold text-foreground">
                      {count} ({perc}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── Sub-abas no padrão Tabs ── */}
          <Tabs
            items={tabItems}
            value={aba}
            onChange={setAba}
          />

          {/* ── PAINEL INSTRUTIVO DO RANKING DE PROGRESSÃO (ART. 39) ── */}
          {aba === 'ranking' && (
            <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Critérios Legais Sucessivos de Desempate (Art. 39, Lei nº 1.704/2006)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Em caso de empate na classificação para fins de promoção e progressão na carreira, a ordenação oficial aplica rigorosamente a seguinte ordem de precedência:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-white/80 dark:bg-card p-2.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                  <div className="font-bold text-foreground">1º Critério: Maior NFC</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">Nota Final Consolidada apurada no triênio</div>
                </div>
                <div className="bg-white/80 dark:bg-card p-2.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                  <div className="font-bold text-foreground">2º Critério: Tempo de Serviço</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">Data de admissão mais antiga no serviço público</div>
                </div>
                <div className="bg-white/80 dark:bg-card p-2.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                  <div className="font-bold text-foreground">3º Critério: Idade Mais Avançada</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">Data de nascimento mais antiga (maior idade civil)</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Card com Barra de Busca e DataTable ── */}
          <Card className="gap-0 py-0 overflow-hidden border-border">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={aba === 'nfc' ? 'Buscar servidor por nome ou matrícula...' : 'Buscar no ranking por nome ou matrícula...'}
                className="max-w-md"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {aba === 'nfc'
                  ? `${filteredServidores.length} de ${nfcData.total} servidores`
                  : aba === 'ranking'
                  ? `${filteredRanking.length} classificados`
                  : `${filteredHistorico.length} registros`}
              </span>
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
                <DataTable
                  columns={columnsRanking}
                  data={filteredRanking}
                  emptyText="Nenhum servidor classificado no ranking."
                  pageSize={10}
                  fixedLayout
                />
              )}

              {aba === 'historico' && (
                <div className="space-y-3">
                  <div className="px-1 py-1 text-xs text-muted-foreground">
                    Registros imutáveis: cada processamento gera uma nova versão auditada, preservando o histórico anterior.
                  </div>
                  <DataTable
                    columns={columnsHistorico}
                    data={filteredHistorico}
                    emptyText="Nenhuma consolidação persistida ainda para este triênio. Use 'Processar Consolidação' para gerar a primeira versão."
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
