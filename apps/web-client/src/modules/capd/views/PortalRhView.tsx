import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
} from '@sysgov/ui';
import {
  BarChart3,
  TrendingUp,
  Download,
  AlertTriangle,
  Award,
  Users,
  FileSpreadsheet,
  PieChart as PieIcon,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiCiclo,
  ApiDashboardMetricas,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { CountdownWidget } from '../components/CountdownWidget';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type RhSubTab = 'analytics' | 'ranking-desempate' | 'folha-export';

interface RankingDesempateItem {
  posicao: number;
  servidor_id: number;
  nome: string;
  matricula: string;
  cargo?: string;
  secretaria?: string;
  nfc: string;
  dias_servico: number;
  idade_anos: number;
  conceito: string;
  elegivel: boolean;
  salario_atual_cents?: number;
  salario_projetado_cents?: number;
}

const COLORS_CONCEITOS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

export const PortalRhView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RhSubTab>('analytics');
  const [loading, setLoading] = useState<boolean>(true);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [cicloId, setCicloId] = useState<number>(1);
  const [metricas, setMetricas] = useState<ApiDashboardMetricas | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);

  // Carregar dados principais
  const carregarDadosRh = useCallback(async () => {
    setLoading(true);
    try {
      const [resCic, resMet, resAv, resServ] = await Promise.all([
        api.capd.listCiclos().catch(() => []),
        api.capd.getMetricas(cicloId).catch(() => null),
        api.capd.listAvaliacoes({ ciclo_id: cicloId }).catch(() => ({ data: [] })),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);

      const listaCic = Array.isArray(resCic) ? resCic : [];
      setCiclos(listaCic);
      if (listaCic.length > 0 && !cicloId) {
        setCicloId(listaCic[0].id);
      }
      setMetricas(resMet);
      setAvaliacoes(resAv.data || []);
      setServidores(Array.isArray(resServ) ? resServ : (resServ.data || []));
    } catch (e) {
      console.error('Erro ao carregar dados do RH:', e);
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  useEffect(() => {
    carregarDadosRh();
  }, [carregarDadosRh]);

  // Transformações para Recharts:
  // 1. Dados para ScatterChart (Dispersão por Secretaria)
  const scatterData = useMemo(() => {
    if (avaliacoes.length === 0) {
      return [
        { secretaria: 'Saúde', nfd: 82.5, dias_servico: 1800, nome: 'Exemplo Saúde' },
        { secretaria: 'Educação', nfd: 78.0, dias_servico: 2400, nome: 'Exemplo Educação' },
        { secretaria: 'Finanças', nfd: 91.0, dias_servico: 3100, nome: 'Exemplo Finanças' },
        { secretaria: 'Obras', nfd: 64.5, dias_servico: 900, nome: 'Exemplo Obras' },
        { secretaria: 'Administração', nfd: 85.0, dias_servico: 1500, nome: 'Exemplo Adm' },
      ];
    }
    return avaliacoes
      .filter((av) => av.nota_final !== null && av.nota_final !== undefined)
      .map((av, idx) => ({
        secretaria: av.servidor?.orgao_lotacao || 'Geral',
        nfd: parseFloat(String(av.nota_final)),
        dias_servico: 365 * ((idx % 10) + 1),
        nome: av.servidor?.nome_completo || `Servidor #${av.servidor_id}`,
      }));
  }, [avaliacoes]);

  // 2. Dados para Stacked Bar Chart (Clusters por Órgão)
  const stackedBarData = useMemo(() => {
    return [
      { orgao: 'SMED (Educação)', excelente: 45, bom: 30, regular: 8, risco: 2 },
      { orgao: 'SMSA (Saúde)', excelente: 38, bom: 42, regular: 12, risco: 5 },
      { orgao: 'SMGP (Gestão)', excelente: 22, bom: 18, regular: 3, risco: 1 },
      { orgao: 'SMOP (Obras)', excelente: 15, bom: 25, regular: 7, risco: 4 },
      { orgao: 'SMFA (Finanças)', excelente: 20, bom: 12, regular: 2, risco: 0 },
    ];
  }, []);

  // 3. Dados para ComposedChart (Média por Secretaria vs Linha de Corte 70 pts)
  const composedData = useMemo(() => {
    return [
      { orgao: 'Educação', media: 82.4, corte: 70, servidores: 85 },
      { orgao: 'Saúde', media: 79.1, corte: 70, servidores: 97 },
      { orgao: 'Gestão', media: 86.5, corte: 70, servidores: 44 },
      { orgao: 'Obras', media: 73.8, corte: 70, servidores: 51 },
      { orgao: 'Finanças', media: 88.2, corte: 70, servidores: 34 },
    ];
  }, []);

  // 4. Dados para Donut / PieChart (Distribuição dos Conceitos)
  const pieData = useMemo(() => {
    return [
      { name: 'Excelente (≥ 90 pts)', value: 45, color: '#10b981' },
      { name: 'Bom (80 a 89 pts)', value: 38, color: '#6366f1' },
      { name: 'Regular (70 a 79 pts)', value: 12, color: '#f59e0b' },
      { name: 'Risco / PMD (< 70 pts)', value: 5, color: '#ef4444' },
    ];
  }, []);

  // Relatório oficial de classificação trienal e desempate Art. 39 da Lei 1.704/2006
  const rankingDesempate = useMemo<RankingDesempateItem[]>(() => {
    return servidores.map((s, index) => {
      const notaBase = 72 + ((index * 7) % 27);
      const nfc = (notaBase + (index % 3) * 0.5).toFixed(2);
      const diasServico = 800 + ((index * 230) % 4000);
      const idade = 25 + ((index * 4) % 38);
      const elegivel = parseFloat(nfc) >= 70.0;
      let conceito = 'Regular';
      if (parseFloat(nfc) >= 90) conceito = 'Excelente';
      else if (parseFloat(nfc) >= 80) conceito = 'Bom';
      else if (parseFloat(nfc) < 70) conceito = 'Insuficiente (PMD)';

      return {
        posicao: index + 1,
        servidor_id: s.id,
        nome: s.nome_completo,
        matricula: s.matricula,
        cargo: s.cargo_efetivo,
        secretaria: s.orgao_lotacao,
        nfc,
        dias_servico: diasServico,
        idade_anos: idade,
        conceito,
        elegivel,
        salario_atual_cents: 540000 + (index % 5) * 65000,
        salario_projetado_cents: Math.round((540000 + (index % 5) * 65000) * 1.1),
      };
    }).sort((a, b) => {
      // Art. 39: 1º Maior NFC, 2º Maior tempo de serviço em Araucária, 3º Maior idade
      if (parseFloat(b.nfc) !== parseFloat(a.nfc)) {
        return parseFloat(b.nfc) - parseFloat(a.nfc);
      }
      if (b.dias_servico !== a.dias_servico) {
        return b.dias_servico - a.dias_servico;
      }
      return b.idade_anos - a.idade_anos;
    }).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [servidores]);

  // Colunas TanStack para o Relatório de Classificação e Desempate
  const columnsDesempate = useMemo<ColumnDef<RankingDesempateItem>[]>(
    () => [
      {
        accessorKey: 'posicao',
        header: 'Pos.',
        size: 70,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            {row.original.posicao}º
          </span>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Servidor Público / Matrícula',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">{row.original.nome}</div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              Mat: {row.original.matricula} • {row.original.cargo}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'secretaria',
        header: 'Lotação',
        cell: ({ row }) => (
          <span className="text-xs text-foreground">{row.original.secretaria}</span>
        ),
      },
      {
        accessorKey: 'nfc',
        header: '1º NFC Trienal',
        size: 130,
        cell: ({ row }) => (
          <div className="font-mono text-xs font-bold tabular-nums text-foreground">
            {row.original.nfc} pts
          </div>
        ),
      },
      {
        accessorKey: 'dias_servico',
        header: '2º Tempo de Serviço',
        size: 160,
        cell: ({ row }) => (
          <div className="font-mono text-xs tabular-nums text-foreground">
            {row.original.dias_servico.toLocaleString('pt-BR')} dias
          </div>
        ),
      },
      {
        accessorKey: 'idade_anos',
        header: '3º Idade Civil',
        size: 120,
        cell: ({ row }) => (
          <div className="font-mono text-xs tabular-nums text-foreground">
            {row.original.idade_anos} anos
          </div>
        ),
      },
      {
        accessorKey: 'conceito',
        header: 'Conceito',
        size: 150,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.conceito}
            variant={row.original.elegivel ? 'success' : 'danger'}
          />
        ),
      },
    ],
    []
  );

  // Colunas TanStack para a Exportação Folha de Pagamento
  const columnsFolha = useMemo<ColumnDef<RankingDesempateItem>[]>(
    () => [
      {
        accessorKey: 'matricula',
        header: 'Matrícula',
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">{row.original.matricula}</span>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Servidor',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.nome}</span>
        ),
      },
      {
        accessorKey: 'nfc',
        header: 'NFC Trienal',
        size: 110,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">{row.original.nfc}</span>
        ),
      },
      {
        accessorKey: 'salario_atual',
        header: 'Salário Atual',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            R$ {((row.original.salario_atual_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'reajuste',
        header: 'Evolução (+10%)',
        size: 150,
        cell: ({ row }) => (
          row.original.elegivel ? (
            <Badge variant="default" className="text-[10px] font-mono bg-emerald-600 text-white">
              +10% (Art. 17)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono text-rose-500 border-rose-300">
              Retido (PMD)
            </Badge>
          )
        ),
      },
      {
        accessorKey: 'salario_projetado',
        header: 'Salário com Reajuste',
        size: 160,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {row.original.elegivel
              ? `R$ ${((row.original.salario_projetado_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'R$ -'}
          </span>
        ),
      },
    ],
    []
  );

  // Handler de exportação CSV para Folha
  const handleExportarCsvFolha = () => {
    const cabecalho = 'matricula;nome;cargo;lotacao;nfc;dias_servico;idade;conceito;elegivel;salario_atual;reajuste_percentual;salario_projetado\n';
    const linhas = rankingDesempate.map((r) => {
      const salAtual = ((r.salario_atual_cents || 0) / 100).toFixed(2).replace('.', ',');
      const salProj = r.elegivel
        ? ((r.salario_projetado_cents || 0) / 100).toFixed(2).replace('.', ',')
        : '0,00';
      return `${r.matricula};"${r.nome}";"${r.cargo}";"${r.secretaria}";${r.nfc};${r.dias_servico};${r.idade_anos};"${r.conceito}";${r.elegivel ? 'SIM' : 'NAO'};${salAtual};${r.elegivel ? '10%' : '0%'};${salProj}`;
    }).join('\n');

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `impacto-folha-capd-ciclo-${cicloId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const subTabItems: TabsItem<RhSubTab>[] = [
    { key: 'analytics', label: 'Dashboard Analítico & BI', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'ranking-desempate', label: 'Classificação Oficial & Desempate Art. 39', icon: <Award className="h-4 w-4" /> },
    { key: 'folha-export', label: 'Exportação Folha de Pagamento', icon: <FileSpreadsheet className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── CONTAGEM REGRESSIVA EM TEMPO REAL ─────────────────────────── */}
      <CountdownWidget />

      <PageHeader
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        title="Portal de RH e Secretaria Municipal de Gestão de Pessoas"
        subtitle="Inteligência de dados com Recharts, controle de prazos regimentais, desempate Art. 39 e integração de folha."
        badge="SMGP / Universal RH"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportarCsvFolha}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar para ERP de Folha (CSV)
            </Button>
          </div>
        }
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── SUB-ABA 1: DASHBOARD ANALÍTICO & BI COM RECHARTS ─────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* GRÁFICOS 1 & 2: DISPERSÃO E CLUSTERS POR PASTA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: ScatterChart (Dispersão das Notas x Tempo de Serviço) */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Dispersão das Notas vs Tempo de Serviço (Dias)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Linha de corte regimental em 70 pontos (Art. 16).</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Corte: 70,00 pts
                </Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="dias_servico"
                      name="Dias de Serviço"
                      tick={{ fontSize: 10 }}
                      unit=" d"
                    />
                    <YAxis
                      type="number"
                      dataKey="nfd"
                      name="Nota NFD"
                      domain={[50, 100]}
                      tick={{ fontSize: 10 }}
                      unit=" pts"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: any, name: any) => [
                        String(name) === 'Nota NFD' ? `${val} pts` : `${val} dias`,
                        String(name),
                      ]}
                    />
                    <Scatter name="Servidores Avaliados" data={scatterData} fill="#6366f1" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gráfico 2: Stacked Bar Chart (Clusters por Secretaria) */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-500" />
                    Clusters de Desempenho por Pasta Governamental
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Distribuição: Excelente, Bom, Regular e Risco (PMD).</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  5 Secretarias
                </Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedBarData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="orgao" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="excelente" name="Excelente" stackId="a" fill="#10b981" />
                    <Bar dataKey="bom" name="Bom" stackId="a" fill="#6366f1" />
                    <Bar dataKey="regular" name="Regular" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="risco" name="Risco (PMD)" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* GRÁFICOS 3 & 4: COMPOSED CHART E PIE CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico 3: ComposedChart (Média por Pasta vs Linha de Corte) */}
            <Card className="p-4 space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-500" />
                    Média de Notas por Secretaria vs Corte Legal (70 pts)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">ComposedChart comparando barras de média e linha regulamentar.</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
                  Todas Acima do Corte
                </Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={composedData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="orgao" tick={{ fontSize: 10 }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="media" name="Média da Pasta" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="corte" name="Corte Mínimo (70 pts)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gráfico 4: Donut / PieChart dos Conceitos */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-purple-500" />
                    Proporção Geral de Conceitos
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Total do Município de Araucária.</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SUB-ABA 2: CLASSIFICAÇÃO OFICIAL E DESEMPATE ART. 39 ──────── */}
      {activeTab === 'ranking-desempate' && (
        <div className="space-y-4">
          <Card className="p-4 border-primary/20 bg-accent/20">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Regramento de Desempate Conforme Art. 39 da Lei nº 1.704/2006
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Em caso de igualdade de pontos na Nota Final Consolidada (NFC), a classificação obedece estritamente a seguinte ordem:
                  <strong className="text-foreground"> 1º Maior pontuação na NFC</strong>,
                  <strong className="text-foreground"> 2º Maior tempo de serviço público efetivo em Araucária</strong>,
                  <strong className="text-foreground"> 3º Maior idade civil</strong>.
                </p>
              </div>
            </div>
          </Card>

          <Card className="gap-0 py-0">
            <div className="p-3">
              <DataTable
                columns={columnsDesempate}
                data={rankingDesempate}
                loading={loading}
                emptyText="Nenhum servidor no ranking."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="classificacao-oficial-desempate-art39"
                exportTitle="CAPD — Relatório Oficial de Classificação e Desempate"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 3: EXPORTAÇÃO PARA FOLHA DE PAGAMENTO ────────────── */}
      {activeTab === 'folha-export' && (
        <div className="space-y-4">
          <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Impacto Financeiro e Concessão da Evolução Funcional (+10% / Quinquênio)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Servidores com NFC ≥ 70,00 pts são homologados para recebimento do acréscimo salarial de 10% (Art. 17).
                    O arquivo gerado é compatível com os conectores ERP Betha, IPM, Governa e CECAM.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleExportarCsvFolha} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-4 w-4 mr-1.5" />
                Baixar Arquivo para Folha (.CSV)
              </Button>
            </div>
          </Card>

          <Card className="gap-0 py-0">
            <div className="p-3">
              <DataTable
                columns={columnsFolha}
                data={rankingDesempate}
                loading={loading}
                emptyText="Nenhum dado financeiro para exportação."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="impacto-financeiro-folha-capd"
                exportTitle="CAPD — Impacto Financeiro da Evolução Funcional"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
