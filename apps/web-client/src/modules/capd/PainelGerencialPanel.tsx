import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiCiclo, ApiPainelFiltros, ApiPainelKpis } from '@sysgov/sdk';

const api = new SysgovApi();

interface ServidorItem {
  id: number;
  user_id: number;
  matricula: string;
  nome_completo: string;
  cpf: string;
  cargo_efetivo: string;
  orgao_lotacao: string;
  chefia_imediata?: { id: number; name: string; email: string } | null;
  org_unit?: { id: number; name: string; code: string; type: string } | null;
  avaliacoes?: Array<{
    id: number;
    nota_final: string;
    homologada: boolean;
    data_conclusao?: string | null;
    ciencia_servidor_em?: string | null;
    elegivel_progressao: boolean;
    recursos?: any[];
  }>;
}

type VisaoPerfil = 'geral' | 'comissao' | 'drh' | 'gestor';

interface Props {
  cicloId?: number;
}

export const PainelGerencialPanel: React.FC<Props> = ({ cicloId: initialCicloId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados de dados principais
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [selectedCicloId, setSelectedCicloId] = useState<number | null>(
    initialCicloId || (searchParams.get('ciclo_id') ? Number(searchParams.get('ciclo_id')) : null)
  );

  const [kpis, setKpis] = useState<ApiPainelKpis>({
    total_servidores: 0,
    percentual_concluidas: 0,
    pendencias: 0,
    recursos_abertos: 0,
    notas_extremas_auditoria: 0,
    prazos_vencendo: 0,
  });

  const [servidores, setServidores] = useState<ServidorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [activeVisao, setActiveVisao] = useState<VisaoPerfil>('geral');
  const [visaoData, setVisaoData] = useState<any>(null);

  // Estados dos filtros avançados
  const [busca, setBusca] = useState<string>(searchParams.get('busca') || '');
  const [cargo, setCargo] = useState<string>(searchParams.get('cargo') || '');
  const [planoCarreira, setPlanoCarreira] = useState<string>(searchParams.get('plano_carreira') || '');
  const [statusAvaliacao, setStatusAvaliacao] = useState<string>(searchParams.get('status_avaliacao') || '');
  const [faixaNota, setFaixaNota] = useState<string>(searchParams.get('faixa_nota') || '');
  const [situacaoPrazo, setSituacaoPrazo] = useState<string>(searchParams.get('situacao_prazo') || '');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState<boolean>(false);

  // Carrega lista de ciclos para o seletor
  useEffect(() => {
    api.capd.listCiclos().then((data) => {
      setCiclos(data);
      if (!selectedCicloId && data.length > 0) {
        const ativo = data.find((c) => c.status !== 'encerrado') || data[0];
        setSelectedCicloId(ativo.id);
      }
    }).catch(console.error);
  }, [selectedCicloId]);

  const updateUrlParams = useCallback(
    (newParams: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val) {
          next.set(key, val);
        } else {
          next.delete(key);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const fetchData = useCallback(async () => {
    if (!selectedCicloId) return;
    setLoading(true);
    try {
      const kpiRes = await api.capd.getPainelKpis(selectedCicloId);
      setKpis(kpiRes);

      const filtros: ApiPainelFiltros = {
        ciclo_id: selectedCicloId,
        busca: busca || undefined,
        cargo: cargo || undefined,
        plano_carreira: planoCarreira || undefined,
        status_avaliacao: (statusAvaliacao as any) || undefined,
        faixa_nota: (faixaNota as any) || undefined,
        situacao_prazo: (situacaoPrazo as any) || undefined,
        page: 1,
        per_page: 50,
      };

      const gridRes = await api.capd.getPainelServidores(filtros);
      setServidores(gridRes.data);

      if (activeVisao !== 'geral') {
        const vRes = await api.capd.getPainelVisaoPerfil(activeVisao, selectedCicloId);
        setVisaoData(vRes);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCicloId, busca, cargo, planoCarreira, statusAvaliacao, faixaNota, situacaoPrazo, activeVisao]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        ciclo_id: String(selectedCicloId || ''),
        busca,
        cargo,
        plano_carreira: planoCarreira,
        status_avaliacao: statusAvaliacao,
        faixa_nota: faixaNota,
        situacao_prazo: situacaoPrazo,
      }).toString();

      window.open(`/api/v1/capd/painel/export?${params}`, '_blank');
    } catch (e) {
      console.error('Erro na exportação:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleLimparFiltros = () => {
    setBusca('');
    setCargo('');
    setPlanoCarreira('');
    setStatusAvaliacao('');
    setFaixaNota('');
    setSituacaoPrazo('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const filtrosAtivosCount = [cargo, planoCarreira, statusAvaliacao, faixaNota, situacaoPrazo].filter(Boolean).length;

  const tabItems: TabsItem<VisaoPerfil>[] = [
    { key: 'geral', label: 'Grid Geral de Servidores', icon: <Users className="w-3.5 h-3.5" />, badge: servidores.length },
    { key: 'comissao', label: 'Visão Comissão (Auditoria)', icon: <ShieldAlert className="w-3.5 h-3.5" />, badge: kpis.notas_extremas_auditoria },
    { key: 'drh', label: 'Visão DRH (Curva de Notas)', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'gestor', label: 'Visão Gestor (Equipe)', icon: <UserCheck className="w-3.5 h-3.5" /> },
  ];

  const columns = useMemo<ColumnDef<ServidorItem, any>[]>(() => [
    {
      id: 'servidor',
      header: 'Servidor Público',
      size: 260,
      meta: {
        sortValue: s => s.nome_completo,
        exportValue: s => `${s.nome_completo} (${s.matricula})`,
      },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <div className="font-semibold text-foreground text-sm">{s.nome_completo}</div>
            <div className="text-xs text-muted-foreground font-mono tabular-nums">
              Matrícula: {s.matricula}
            </div>
          </div>
        );
      },
    },
    {
      id: 'cargo_lotacao',
      header: 'Cargo / Lotação',
      size: 240,
      meta: {
        sortValue: s => s.cargo_efetivo,
        exportValue: s => `${s.cargo_efetivo} - ${s.org_unit?.name || s.orgao_lotacao}`,
      },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <div className="text-sm font-medium text-foreground">{s.cargo_efetivo}</div>
            <div className="text-xs text-muted-foreground truncate max-w-xs">
              {s.org_unit?.name || s.orgao_lotacao}
            </div>
          </div>
        );
      },
    },
    {
      id: 'chefia',
      header: 'Superior Imediato',
      size: 200,
      meta: {
        sortValue: s => s.chefia_imediata?.name ?? '',
        exportValue: s => s.chefia_imediata?.name ?? 'Pendente resolução',
      },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <span className="text-xs text-foreground">
            {s.chefia_imediata?.name || (
              <span className="text-amber-600 dark:text-amber-400 italic">Pendente resolução</span>
            )}
          </span>
        );
      },
    },
    {
      id: 'nota_final',
      header: 'Nota Final',
      size: 120,
      meta: {
        sortValue: s => (s.avaliacoes?.[0]?.nota_final ? parseFloat(s.avaliacoes[0].nota_final) : -1),
        exportValue: s => s.avaliacoes?.[0]?.nota_final ?? '',
      },
      cell: ({ row }) => {
        const av = row.original.avaliacoes?.[0];
        const notaNum = av?.nota_final ? parseFloat(av.nota_final) : null;
        if (notaNum === null) {
          return <span className="text-xs font-mono text-muted-foreground italic">—</span>;
        }
        return (
          <span className="font-mono tabular-nums text-sm font-bold text-foreground">
            {notaNum.toFixed(2)} pts
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status Avaliação',
      size: 140,
      meta: {
        sortValue: s => {
          const av = s.avaliacoes?.[0];
          return av?.homologada ? 'homologada' : av?.data_conclusao ? 'submetida' : 'pendente';
        },
        exportValue: s => {
          const av = s.avaliacoes?.[0];
          return av?.homologada ? 'Homologada' : av?.data_conclusao ? 'Submetida' : 'Pendente';
        },
      },
      cell: ({ row }) => {
        const av = row.original.avaliacoes?.[0];
        if (av?.homologada) {
          return <StatusChip label="Homologada" variant="success" />;
        }
        if (av?.data_conclusao) {
          return <StatusChip label="Submetida" variant="primary" />;
        }
        return <StatusChip label="Pendente" variant="neutral" />;
      },
    },
    {
      id: 'ciencia',
      header: 'Ciência',
      size: 130,
      cell: ({ row }) => {
        const av = row.original.avaliacoes?.[0];
        if (av?.ciencia_servidor_em) {
          return <StatusChip label="Registrada" variant="success" />;
        }
        if (av?.data_conclusao) {
          return <StatusChip label="Pendente" variant="warning" />;
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      id: 'acoes',
      header: '',
      size: 90,
      enableSorting: false,
      cell: ({ row }) => {
        const av = row.original.avaliacoes?.[0];
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Ver detalhes da avaliação"
              onClick={() => {
                if (av?.id) {
                  window.location.href = `/capd?tab=avaliacoes&avaliacao_id=${av.id}`;
                }
              }}
              disabled={!av?.id}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="Painel Gerencial da Comissão CAPD"
        subtitle="Acompanhamento em tempo real das etapas avaliativas, auditoria de notas e controle recursal"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {ciclos.length > 0 && (
              <div className="w-64">
                <Select
                  value={String(selectedCicloId || '')}
                  onChange={(val) => {
                    const id = Number(val);
                    setSelectedCicloId(id);
                    updateUrlParams({ ciclo_id: String(id) });
                  }}
                  options={ciclos.map((c) => ({
                    value: String(c.id),
                    label: `${c.nome} (${c.ano_competencia || c.ano_referencia})`,
                  }))}
                  placeholder="Selecione o Ciclo..."
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              title="Atualizar Dados"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || servidores.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {/* Grade de KPIs Canônicos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Servidores"
          value={kpis.total_servidores}
          icon={<Users className="h-5 w-5" />}
          iconBgColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Concluídas"
          value={`${kpis.percentual_concluidas}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBgColor="bg-status-success-bg text-status-success"
        />
        <KpiCard
          title="Pendências"
          value={kpis.pendencias}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor={kpis.pendencias > 0 ? "bg-status-warning-bg text-status-warning" : "bg-muted text-muted-foreground"}
        />
        <KpiCard
          title="Recursos Abertos"
          value={kpis.recursos_abertos}
          icon={<FileText className="h-5 w-5" />}
          iconBgColor={kpis.recursos_abertos > 0 ? "bg-status-warning-bg text-status-warning" : "bg-muted text-muted-foreground"}
        />
        <KpiCard
          title="Auditoria Notas"
          value={kpis.notas_extremas_auditoria}
          icon={<ShieldAlert className="h-5 w-5" />}
          iconBgColor={kpis.notas_extremas_auditoria > 0 ? "bg-status-danger-bg text-status-danger" : "bg-muted text-muted-foreground"}
        />
        <KpiCard
          title="Prazos Vencendo"
          value={kpis.prazos_vencendo}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBgColor={kpis.prazos_vencendo > 0 ? "bg-status-danger-bg text-status-danger" : "bg-muted text-muted-foreground"}
        />
      </div>

      {/* Sub-navegação com Tabs Canônicas */}
      <Tabs
        items={tabItems}
        value={activeVisao}
        onChange={setActiveVisao}
      />

      {/* Visão 1: Geral de Servidores */}
      {activeVisao === 'geral' && (
        <Card className="gap-0 py-0">
          <div className="p-3 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <SearchInput
                value={busca}
                onChange={(val) => {
                  setBusca(val);
                  updateUrlParams({ busca: val });
                }}
                placeholder="Buscar por nome, CPF ou matrícula..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
                className="text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-primary" />
                Filtros Avançados
                {filtrosAtivosCount > 0 && (
                  <Badge variant="primary" className="ml-1.5 font-mono text-[10px] px-1.5 py-0">
                    {filtrosAtivosCount}
                  </Badge>
                )}
              </Button>

              {filtrosAtivosCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLimparFiltros}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Painel sanfona de filtros adicionais */}
          {showFiltrosAvancados && (
            <div className="p-3 border-b border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Status da Avaliação</label>
                <Select
                  value={statusAvaliacao}
                  onChange={(val) => {
                    setStatusAvaliacao(val);
                    updateUrlParams({ status_avaliacao: val });
                  }}
                  options={[
                    { value: '', label: 'Todos os Status' },
                    { value: 'homologada', label: 'Homologada' },
                    { value: 'submetida', label: 'Submetida' },
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'em_recurso', label: 'Em Recurso' },
                  ]}
                  placeholder="Status..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Faixa de Nota</label>
                <Select
                  value={faixaNota}
                  onChange={(val) => {
                    setFaixaNota(val);
                    updateUrlParams({ faixa_nota: val });
                  }}
                  options={[
                    { value: '', label: 'Todas as Notas' },
                    { value: 'abaixo_6', label: 'Abaixo de 6,0' },
                    { value: '6_a_7', label: '6,0 a 6,99' },
                    { value: '7_a_8_5', label: '7,0 a 8,49' },
                    { value: 'acima_8_5', label: 'Acima de 8,5' },
                    { value: 'acima_9_5', label: 'Extrema (> 9,5)' },
                  ]}
                  placeholder="Faixa de Nota..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Plano de Carreira</label>
                <Input
                  value={planoCarreira}
                  onChange={(e) => {
                    setPlanoCarreira(e.target.value);
                    updateUrlParams({ plano_carreira: e.target.value });
                  }}
                  placeholder="Ex: Geral, Magistério..."
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Cargo</label>
                <Input
                  value={cargo}
                  onChange={(e) => {
                    setCargo(e.target.value);
                    updateUrlParams({ cargo: e.target.value });
                  }}
                  placeholder="Ex: Médico, Professor..."
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Prazo de Recurso</label>
                <Select
                  value={situacaoPrazo}
                  onChange={(val) => {
                    setSituacaoPrazo(val);
                    updateUrlParams({ situacao_prazo: val });
                  }}
                  options={[
                    { value: '', label: 'Todos os Prazos' },
                    { value: 'ciencia_pendente', label: 'Ciência Pendente' },
                    { value: 'vencendo_7_dias', label: 'Recurso Vencendo em 7 Dias' },
                    { value: 'recurso_vencido', label: 'Recurso Vencido' },
                  ]}
                  placeholder="Prazo de Recurso..."
                />
              </div>
            </div>
          )}

          <div className="p-3">
            {loading ? (
              <ScreenState type="loading" title="Carregando servidores..." />
            ) : servidores.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="Nenhum servidor localizado"
                description="Não foram encontrados servidores para o ciclo ou filtros selecionados."
                actionLabel={filtrosAtivosCount > 0 ? 'Limpar Filtros' : undefined}
                onAction={handleLimparFiltros}
              />
            ) : (
              <DataTable
                columns={columns}
                data={servidores}
                emptyText="Nenhum servidor encontrado."
                pageSize={20}
                fixedLayout
              />
            )}
          </div>
        </Card>
      )}

      {/* Visão 2: Comissão (Auditoria & Recursos) */}
      {activeVisao === 'comissao' && visaoData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="gap-0 py-0 overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-destructive/5">
              <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Fila de Auditoria (Notas Extremas & Amostragem)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Avaliações com nota &lt; 4,00 ou &ge; 9,50 sujeitas à verificação de evidências CIT
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-bold">Servidor</TableHead>
                    <TableHead className="text-xs font-bold text-center">Nota</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.fila_auditoria?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhuma nota extrema pendente de auditoria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visaoData.fila_auditoria?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">{item.servidor?.name}</div>
                          <div className="text-xs text-muted-foreground">Avaliador: {item.avaliador?.name}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-destructive">
                          {item.nota_final} pts
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Auditar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-accent/20">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Fila de Recursos em Tramitação
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Recursos administrativos distribuídos ou aguardando relatoria
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-bold">Recorrente</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.fila_recursos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhum recurso pendente de julgamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visaoData.fila_recursos?.map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">
                            {rec.avaliacao?.servidor?.name || 'Servidor'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Relator: {rec.relator?.name || 'A sortear'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusChip label={rec.status} variant="warning" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Instruir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visão 3: DRH (Curva de Notas & Leniência) */}
      {activeVisao === 'drh' && visaoData && (
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Curva de Distribuição e Índice de Leniência
            </CardTitle>
            <CardDescription className="text-xs">
              Média do ciclo: <strong className="font-mono">{visaoData.estatisticas?.media ?? '0.00'}</strong> pts | Desvio padrão: <strong className="font-mono">{visaoData.estatisticas?.desvio_padrao ?? '0.00'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {visaoData.curva_distribuicao && Object.entries(visaoData.curva_distribuicao).map(([faixa, qtd]: any) => (
                <div key={faixa} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-foreground">{faixa}</span>
                    <span className="text-muted-foreground">{qtd} servidor(es)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (Number(qtd) / Math.max(1, servidores.length)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visão 4: Gestor (Minha Equipe) */}
      {activeVisao === 'gestor' && (
        <Card className="gap-0 py-0">
          <div className="p-4">
            <p className="text-xs text-muted-foreground">
              Exibindo servidores vinculados à sua chefia imediata para o ciclo selecionado.
            </p>
          </div>
          <div className="p-3">
            <DataTable
              columns={columns}
              data={servidores}
              emptyText="Nenhum liderado encontrado."
              pageSize={10}
              fixedLayout
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default PainelGerencialPanel;
