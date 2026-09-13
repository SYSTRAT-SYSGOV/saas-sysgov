import React, { useCallback, useEffect, useState } from 'react';
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
  Building2,
  Briefcase,
  TrendingUp,
  UserCheck,
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

export const PainelGerencialPanel: React.FC<{ cicloId?: number }> = ({ cicloId: initialCicloId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [selectedCicloId, setSelectedCicloId] = useState<number | undefined>(initialCicloId);

  // KPIs
  const [kpis, setKpis] = useState<ApiPainelKpis>({
    total_servidores: 0,
    percentual_concluidas: 0,
    pendencias: 0,
    recursos_abertos: 0,
    notas_extremas_auditoria: 0,
    prazos_vencendo: 0,
  });

  // Lista de servidores
  const [servidores, setServidores] = useState<ServidorItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);

  // Visões por perfil
  const [activeVisao, setActiveVisao] = useState<'geral' | 'comissao' | 'drh' | 'gestor'>('geral');
  const [visaoData, setVisaoData] = useState<any>(null);

  // Filtros sincronizados com a URL
  const [busca, setBusca] = useState<string>(searchParams.get('busca') || '');
  const [cargo, setCargo] = useState<string>(searchParams.get('cargo') || '');
  const [planoCarreira, setPlanoCarreira] = useState<string>(searchParams.get('plano_carreira') || '');
  const [statusAvaliacao, setStatusAvaliacao] = useState<string>(searchParams.get('status_avaliacao') || '');
  const [faixaNota, setFaixaNota] = useState<string>(searchParams.get('faixa_nota') || '');
  const [situacaoPrazo, setSituacaoPrazo] = useState<string>(searchParams.get('situacao_prazo') || '');

  // Carrega ciclos disponíveis
  useEffect(() => {
    api.capd.listCiclos().then((data) => {
      setCiclos(data);
      if (!selectedCicloId && data.length > 0) {
        const ativo = data.find((c) => c.status !== 'encerrado') || data[0];
        setSelectedCicloId(ativo.id);
      }
    }).catch(console.error);
  }, [selectedCicloId]);

  // Atualiza parâmetros de URL quando os filtros mudam
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

  // Carrega dados principais do painel
  const fetchData = useCallback(async () => {
    if (!selectedCicloId) return;
    setLoading(true);
    try {
      // 1. Carrega KPIs
      const kpiRes = await api.capd.getPainelKpis(selectedCicloId);
      setKpis(kpiRes);

      // 2. Carrega lista com filtros
      const filtros: ApiPainelFiltros = {
        ciclo_id: selectedCicloId,
        busca: busca || undefined,
        cargo: cargo || undefined,
        plano_carreira: planoCarreira || undefined,
        status_avaliacao: (statusAvaliacao as any) || undefined,
        faixa_nota: (faixaNota as any) || undefined,
        situacao_prazo: (situacaoPrazo as any) || undefined,
        page,
        per_page: 20,
      };

      const gridRes = await api.capd.getPainelServidores(filtros);
      setServidores(gridRes.data);
      setTotalRecords(gridRes.total);

      // 3. Carrega visão especializada se selecionada
      if (activeVisao !== 'geral') {
        const vRes = await api.capd.getPainelVisaoPerfil(activeVisao, selectedCicloId);
        setVisaoData(vRes);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCicloId, busca, cargo, planoCarreira, statusAvaliacao, faixaNota, situacaoPrazo, page, activeVisao]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ação de exportar CSV
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
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* ── Topo: Seletor de Ciclo e Ações Rápidas ───────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Painel Gerencial da Comissão CAPD
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhamento em tempo real, auditoria de notas extremas e controle recursal
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-56">
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
              aria-label="Ciclo de Avaliação"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            aria-label="Atualizar Dados"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || servidores.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* ── Top-level KPIs em JetBrains Mono ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Servidores"
          value={kpis.total_servidores}
          subtitle="Servidores cadastrados"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        />

        <KpiCard
          title="Concluídas"
          value={`${kpis.percentual_concluidas}%`}
          subtitle="Avaliações finalizadas"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />

        <KpiCard
          title="Pendências"
          value={kpis.pendencias}
          subtitle="Aguardando preenchimento"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />

        <KpiCard
          title="Recursos Abertos"
          value={kpis.recursos_abertos}
          subtitle="Em tramitação na comissão"
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
        />

        <KpiCard
          title="Auditoria Notas"
          value={kpis.notas_extremas_auditoria}
          subtitle="Notas extremas (<4 ou >9.5)"
          icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
        />

        <KpiCard
          title="Prazos Vencendo"
          value={kpis.prazos_vencendo}
          subtitle="Vencimento nos prox. 7 dias"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />
      </div>

      {/* ── Barra de Filtros Avançados Combináveis ───────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-blue-600" />
              Filtros Avançados Combináveis (E)
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLimparFiltros}
              className="text-xs text-slate-500 hover:text-slate-800 h-7"
            >
              Limpar Filtros
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Busca Nome/CPF */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por Nome, Matrícula ou CPF..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    updateUrlParams({ busca: e.target.value });
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Cargo / Função */}
            <div>
              <Input
                placeholder="Filtrar Cargo..."
                value={cargo}
                onChange={(e) => {
                  setCargo(e.target.value);
                  updateUrlParams({ cargo: e.target.value });
                }}
                className="h-9 text-sm"
              />
            </div>

            {/* Plano de Carreira */}
            <div>
              <Select
                value={planoCarreira}
                onChange={(val) => {
                  setPlanoCarreira(val);
                  updateUrlParams({ plano_carreira: val });
                }}
                options={[
                  { value: '', label: 'Todos os Planos' },
                  { value: 'GERAL', label: 'Quadro Geral' },
                  { value: 'MAGISTERIO', label: 'Magistério' },
                ]}
                aria-label="Plano de Carreira"
              />
            </div>

            {/* Status da Avaliação */}
            <div>
              <Select
                value={statusAvaliacao}
                onChange={(val) => {
                  setStatusAvaliacao(val);
                  updateUrlParams({ status_avaliacao: val });
                }}
                options={[
                  { value: '', label: 'Todos os Status' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'rascunho', label: 'Em Rascunho' },
                  { value: 'submetida', label: 'Submetida' },
                  { value: 'em_recurso', label: 'Em Recurso' },
                  { value: 'homologada', label: 'Homologada' },
                ]}
                aria-label="Status da Avaliação"
              />
            </div>

            {/* Faixa de Nota */}
            <div>
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
                aria-label="Faixa de Nota"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub-navegação por Perfil de Acesso ────────────────────────── */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveVisao('geral')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeVisao === 'geral'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Grid Geral de Servidores
            <Badge variant="outline" className="ml-1 font-mono text-xs">
              {totalRecords}
            </Badge>
          </div>
        </button>

        <button
          onClick={() => setActiveVisao('comissao')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeVisao === 'comissao'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Visão Comissão (Auditoria & Recursos)
            {kpis.notas_extremas_auditoria > 0 && (
              <Badge variant="destructive" className="ml-1 font-mono text-xs">
                {kpis.notas_extremas_auditoria}
              </Badge>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveVisao('drh')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeVisao === 'drh'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Visão DRH (Curva de Notas & Leniência)
          </div>
        </button>

        <button
          onClick={() => setActiveVisao('gestor')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeVisao === 'gestor'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" />
            Visão Gestor (Minha Equipe)
          </div>
        </button>
      </div>

      {/* ── Renderização da Visão Selecionada ─────────────────────────── */}
      {activeVisao === 'geral' && (
        <Card className="border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servidor</TableHead>
                <TableHead>Cargo / Lotação</TableHead>
                <TableHead>Avaliador Imediato</TableHead>
                <TableHead className="text-center">Nota Final</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ciência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Carregando servidores...
                  </TableCell>
                </TableRow>
              ) : servidores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum servidor localizado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                servidores.map((srv) => {
                  const av = srv.avaliacoes?.[0];
                  const notaNum = av?.nota_final ? parseFloat(av.nota_final) : null;

                  return (
                    <TableRow key={srv.id} className="hover:bg-slate-50/80">
                      {/* Dados Servidor */}
                      <TableCell>
                        <div className="font-semibold text-slate-900">{srv.nome_completo}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          Matrícula: {srv.matricula} | CPF: {srv.cpf}
                        </div>
                      </TableCell>

                      {/* Cargo / Lotação */}
                      <TableCell>
                        <div className="text-sm text-slate-800">{srv.cargo_efetivo}</div>
                        <div className="text-xs text-slate-500">
                          {srv.org_unit?.name || srv.orgao_lotacao}
                        </div>
                      </TableCell>

                      {/* Avaliador */}
                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {srv.chefia_imediata?.name || (
                            <span className="text-amber-600 italic">Pendente resolução</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Nota Final */}
                      <TableCell className="text-center">
                        {notaNum !== null ? (
                          <span
                            className={`inline-block font-mono tabular-nums text-sm font-bold px-2 py-0.5 rounded ${
                              notaNum >= 9.5
                                ? 'bg-purple-100 text-purple-800'
                                : notaNum >= 7.0
                                ? 'bg-emerald-100 text-emerald-800'
                                : notaNum >= 6.0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {notaNum.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {av?.homologada ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Homologada
                          </Badge>
                        ) : av?.data_conclusao ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Submetida
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>

                      {/* Ciência */}
                      <TableCell className="text-center font-mono text-xs">
                        {av?.ciencia_servidor_em ? (
                          <span className="text-emerald-600 font-medium">Registrada</span>
                        ) : av?.data_conclusao ? (
                          <span className="text-amber-600 font-medium">Pendente</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (av?.id) {
                              window.location.href = `/capd?tab=avaliacoes&avaliacao_id=${av.id}`;
                            }
                          }}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Visão Especializada: Comissão ────────────────────────────── */}
      {activeVisao === 'comissao' && visaoData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-rose-200">
            <CardHeader className="bg-rose-50/50 pb-3">
              <CardTitle className="text-base text-rose-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Fila de Auditoria (Notas Extremas & Amostragem)
              </CardTitle>
              <CardDescription>
                Avaliações com nota &lt; 4,00 ou &ge; 9,50 sujeitas à verificação de evidências CIT
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead className="text-center">Nota</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.fila_auditoria?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-slate-500">
                        Nenhuma nota extrema pendente de auditoria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visaoData.fila_auditoria?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{item.servidor?.name}</div>
                          <div className="text-xs text-slate-500">Avaliador: {item.avaliador?.name}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-rose-700">
                          {item.nota_final}
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

          <Card className="border-indigo-200">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Fila de Recursos em Tramitação
              </CardTitle>
              <CardDescription>Recursos administrativos distribuídos ou aguardando relatoria</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorrente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.fila_recursos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-slate-500">
                        Nenhum recurso pendente de julgamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visaoData.fila_recursos?.map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">
                            {rec.avaliacao?.servidor?.name || 'Servidor'}
                          </div>
                          <div className="text-xs text-slate-500">
                            Relator: {rec.relator?.name || 'A sortear'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {rec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Pautar
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

      {/* ── Visão Especializada: DRH ──────────────────────────────────── */}
      {activeVisao === 'drh' && visaoData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela por Secretaria */}
          <Card className="lg:col-span-2 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Consolidado por Secretaria / Órgão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Secretaria</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Concluídas</TableHead>
                    <TableHead className="text-center">Média Geral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.por_secretaria?.map((sec: any) => (
                    <TableRow key={sec.secretaria}>
                      <TableCell className="font-medium text-slate-900">{sec.secretaria}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{sec.total}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-emerald-600">
                        {sec.concluidas}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-bold">
                        {sec.media_nota}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Ranking de Leniência por Avaliador */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Indicador de Leniência / Médias Altas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliador</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-center">Média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaoData.ranking_leniencia?.map((item: any) => (
                    <TableRow key={item.avaliador_id}>
                      <TableCell className="text-sm font-medium text-slate-800">
                        {item.avaliador?.name || `Avaliador #${item.avaliador_id}`}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{item.total}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-700">
                        {item.media}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Visão Especializada: Gestor ───────────────────────────────── */}
      {activeVisao === 'gestor' && visaoData && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Equipe Subordinada Direta
            </CardTitle>
            <CardDescription>
              Total na equipe: <span className="font-mono font-bold">{visaoData.total_equipe}</span> |
              Pendências de preenchimento: <span className="font-mono font-bold text-amber-600">{visaoData.total_pendentes}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servidor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visaoData.subordinados?.map((s: any) => {
                  const av = s.avaliacoes?.[0];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-slate-900">{s.nome_completo}</TableCell>
                      <TableCell className="text-sm text-slate-600">{s.cargo_efetivo}</TableCell>
                      <TableCell className="text-center">
                        {av?.data_conclusao ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Concluída</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="default" className="h-7 text-xs bg-blue-600 text-white">
                          {av?.data_conclusao ? 'Visualizar' : 'Avaliar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
