import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  StatCard,
} from '@sysgov/ui';
import {
  PageHeader,
  DataTable,
  EmptyState,
  StatusChip,
  ScreenState,
} from '@/components/ui';
import {
  TrendingUp,
  Eye,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  RefreshCw,
  Download,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import {
  calcularDeltaEvolucao,
  calcularKpisPmd,
  calcularUrgenciaPrazo,
  filtrarPmds,
  gerarCsvPmd,
  obterProgressoAcoes,
  STATUS_PMD_LABEL,
  STATUS_PMD_VARIANT,
} from './PmdPanel.utils';
import type { PlanoMelhoriaItem } from './PmdPanel.utils';

const api = new SysgovApi();

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Ações Concluídas' },
  { value: 'verificado', label: 'Verificado / Superado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const URGENCIA_OPTIONS = [
  { value: 'todos', label: 'Todos os prazos' },
  { value: 'vencidos', label: 'Prazos Vencidos' },
  { value: 'vencendo_em_breve', label: 'Vence em até 30 dias' },
  { value: 'no_prazo', label: 'No Prazo Regular' },
];

export const PmdPanel: React.FC = () => {
  const [pmds, setPmds] = useState<PlanoMelhoriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'todos' | 'vencidos' | 'vencendo_em_breve' | 'no_prazo'>('todos');
  const [search, setSearch] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [detalhePmd, setDetalhePmd] = useState<PlanoMelhoriaItem | null>(null);

  // Form verificação de evolução
  const [verModal, setVerModal] = useState(false);
  const [nfcNova, setNfcNova] = useState('');
  const [obsVerif, setObsVerif] = useState('');
  const [pmdVerif, setPmdVerif] = useState<PlanoMelhoriaItem | null>(null);
  const [savingVerif, setSavingVerif] = useState(false);
  const [concluindoAcoes, setConcluindoAcoes] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get<PlanoMelhoriaItem[]>('/capd/pmd');
      setPmds(resp.data ?? []);
    } catch {
      setErro('Não foi possível carregar os Planos de Melhoria de Desempenho.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // KPIs
  const kpis = useMemo(() => calcularKpisPmd(pmds), [pmds]);

  // Lista Filtrada
  const pmdsFiltrados = useMemo(() => {
    return filtrarPmds(pmds, {
      busca: search,
      status: filtroStatus,
      urgencia: filtroUrgencia,
    });
  }, [pmds, search, filtroStatus, filtroUrgencia]);

  // Exportação CSV
  const exportarCsv = useCallback(() => {
    const csv = gerarCsvPmd(pmdsFiltrados);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataHoje = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `acompanhamento_pmd_capd_${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pmdsFiltrados]);

  // Abrir Modal de Verificação
  const abrirVerificacao = (pmd: PlanoMelhoriaItem) => {
    setPmdVerif(pmd);
    setNfcNova('');
    setObsVerif('');
    setVerModal(true);
  };

  // Análise em tempo real do delta
  const analiseDelta = useMemo(() => {
    if (!pmdVerif || !nfcNova) return null;
    return calcularDeltaEvolucao(pmdVerif.nfc_gatilho, nfcNova);
  }, [pmdVerif, nfcNova]);

  // Registrar Verificação de Evolução
  const registrarVerificacao = async () => {
    if (!pmdVerif || !nfcNova || !obsVerif) return;
    setSavingVerif(true);
    setErro(null);
    try {
      await api.post(`/capd/pmd/${pmdVerif.id}/verificacao`, {
        nfc_novo_ciclo: parseFloat(nfcNova),
        observacoes: obsVerif,
      });
      setSucesso('Verificação de evolução registrada com sucesso!');
      setVerModal(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao registrar verificação.');
    } finally {
      setSavingVerif(false);
    }
  };

  // Concluir Ações do Plano
  const handleConcluirAcoes = async (id: number) => {
    setConcluindoAcoes(id);
    setErro(null);
    try {
      await api.post(`/capd/pmd/${id}/concluir-acoes`, {});
      setSucesso(`Ações do Plano #${id} marcadas como concluídas!`);
      if (detalhePmd?.id === id) {
        setDetalhePmd(null);
      }
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Não foi possível concluir as ações do plano.');
    } finally {
      setConcluindoAcoes(null);
    }
  };

  // Colunas do DataTable
  const columns = useMemo<ColumnDef<PlanoMelhoriaItem, any>[]>(
    () => [
      {
        id: 'servidor',
        header: 'Servidor / Matrícula',
        accessorFn: (row) => row.servidor?.nome_completo ?? `#${row.servidor_id}`,
        cell: ({ row }) => {
          const p = row.original;
          const nome = p.servidor?.nome_completo ?? `Servidor #${p.servidor_id}`;
          const mat = p.servidor?.matricula;
          const cargo = p.servidor?.cargo_efetivo;

          return (
            <div>
              <div className="font-medium text-foreground">{nome}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {mat && <span className="font-mono tabular-nums font-semibold">{mat}</span>}
                {mat && cargo && <span>•</span>}
                {cargo && <span className="truncate max-w-[180px]">{cargo}</span>}
              </div>
            </div>
          );
        },
      },
      {
        id: 'ciclo_gatilho',
        header: 'Ciclo & NFC Gatilho',
        accessorFn: (row) => row.ciclo?.nome ?? `Ciclo #${row.ciclo_id}`,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="text-xs font-medium text-foreground">
                {p.ciclo?.nome ?? `Ciclo #${p.ciclo_id}`}
              </div>
              <div className="font-mono font-bold text-xs tabular-nums text-destructive flex items-center gap-1 mt-0.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{p.nfc_gatilho} pts</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'metas_acoes',
        header: 'Metas & Progresso de Ações',
        accessorFn: (row) => row.objetivos,
        cell: ({ row }) => {
          const p = row.original;
          const prog = obterProgressoAcoes(p.acoes);

          return (
            <div className="space-y-1.5 max-w-xs">
              <div className="text-xs text-muted-foreground line-clamp-1" title={p.objetivos}>
                {p.objetivos}
              </div>
              {p.acoes && p.acoes.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        prog.percentual === 100 ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${prog.percentual}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                    {prog.texto}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'prazo',
        header: 'Prazo Limite',
        accessorFn: (row) => row.prazo,
        cell: ({ row }) => {
          const p = row.original;
          const urg = calcularUrgenciaPrazo(p.prazo, p.status);
          const dataFmt = p.prazo ? new Date(p.prazo).toLocaleDateString('pt-BR') : '—';

          return (
            <div className="space-y-1">
              <div className="font-mono text-xs tabular-nums text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{dataFmt}</span>
              </div>
              <Badge variant={urg.badgeVariant} className="text-[10px] py-0 px-1.5 font-normal">
                {urg.label}
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status,
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <StatusChip
              label={STATUS_PMD_LABEL[s] ?? s}
              variant={STATUS_PMD_VARIANT[s] ?? 'neutral'}
            />
          );
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => {
          const pmd = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                title="Ver Detalhes do Plano"
                onClick={() => setDetalhePmd(pmd)}
                className="gap-1 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                Detalhes
              </Button>

              {pmd.status !== 'verificado' && pmd.status !== 'cancelado' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 border-primary/40 hover:border-primary"
                  onClick={() => abrirVerificacao(pmd)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                  Evolução
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Planos de Melhoria de Desempenho (PMD)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhamento correcional e pedagógico para servidores com Nota Final Consolidada abaixo da nota de corte (RF-09).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCsv}
            disabled={pmdsFiltrados.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* PAINEL EXECUTIVO DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="PMDs Ativos / Em Risco"
          value={kpis.totalAtivos}
          caption={kpis.totalAtivos > 0 ? 'Retêm progressão funcional' : 'Quadro 100% regularizado'}
          accentClassName={kpis.totalAtivos > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}
          valueClassName={
            kpis.totalAtivos > 0
              ? 'text-amber-600 dark:text-amber-400 font-mono tabular-nums'
              : 'text-emerald-600 dark:text-emerald-400 font-mono tabular-nums'
          }
        />
        <StatCard
          label="Planos Superados / Verificados"
          value={kpis.totalVerificados}
          caption="Reavaliações com evolução aprovada"
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums"
        />
        <StatCard
          label="Taxa de Recuperação Funcional"
          value={kpis.taxaRecuperacao}
          caption="Percentual de superação da nota de corte"
          accentClassName="border-l-sky-500"
          valueClassName="font-mono tabular-nums text-foreground"
        />
        <StatCard
          label="Prazos Críticos (Vencidos)"
          value={kpis.totalVencidos}
          caption={
            kpis.totalVencendoEmBreve > 0
              ? `+${kpis.totalVencendoEmBreve} vencendo em 30 dias`
              : 'Sem prazos imediatos a vencer'
          }
          accentClassName={kpis.totalVencidos > 0 ? 'border-l-red-500' : 'border-l-primary'}
          valueClassName={
            kpis.totalVencidos > 0
              ? 'text-red-600 dark:text-red-400 font-mono tabular-nums'
              : 'font-mono tabular-nums text-foreground'
          }
        />
      </div>

      {/* CARD PRINCIPAL COM FERRAMENTAS E TABELA */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por servidor, matrícula ou objetivo..."
                  className="pl-8 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Status */}
              <div className="w-44">
                <Select
                  value={filtroStatus}
                  onChange={setFiltroStatus}
                  options={STATUS_OPTIONS}
                />
              </div>

              {/* Filtro de Urgência Temporal */}
              <div className="w-48">
                <Select
                  value={filtroUrgencia}
                  onChange={(val) => setFiltroUrgencia(val as any)}
                  options={URGENCIA_OPTIONS}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              <ScreenState type="loading" title="Carregando Planos de Melhoria..." />
            </div>
          ) : pmdsFiltrados.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
                title="Nenhum Plano de Melhoria encontrado"
                description={
                  search || filtroStatus || filtroUrgencia !== 'todos'
                    ? 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros de pesquisa.'
                    : 'Servidores com NFC inferior à nota de corte do ciclo trienal geram PMDs automaticamente na consolidação.'
                }
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pmdsFiltrados}
              pagination={true}
              pageSize={10}
              pageSizeSelector={true}
              pageSizeOptions={[10, 25, 50, 100]}
              searchable={false}
              className="border-0"
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL DE DETALHES DO PMD */}
      {detalhePmd && (
        <Modal
          open={Boolean(detalhePmd)}
          onClose={() => setDetalhePmd(null)}
          title={`Plano de Melhoria de Desempenho #${detalhePmd.id}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Ficha do Servidor */}
            <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Servidor sob Acompanhamento
                </span>
                <StatusChip
                  label={STATUS_PMD_LABEL[detalhePmd.status] ?? detalhePmd.status}
                  variant={STATUS_PMD_VARIANT[detalhePmd.status] ?? 'neutral'}
                />
              </div>
              <div className="text-sm font-semibold text-foreground">
                {detalhePmd.servidor?.nome_completo ?? `Servidor #${detalhePmd.servidor_id}`}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-border/60">
                <div>
                  <span className="text-muted-foreground">Matrícula: </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {detalhePmd.servidor?.matricula || 'S/M'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cargo: </span>
                  <span>{detalhePmd.servidor?.cargo_efetivo || 'Efetivo'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">NFC Gatilho: </span>
                  <span className="font-mono font-bold text-destructive tabular-nums">
                    {detalhePmd.nfc_gatilho} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Ciclo e Prazo */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-background rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Ciclo de Origem:</span>
                <span className="font-medium text-foreground">
                  {detalhePmd.ciclo?.nome ?? `Ciclo #${detalhePmd.ciclo_id}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Prazo Limite:</span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {detalhePmd.prazo ? new Date(detalhePmd.prazo).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>

            {/* Objetivos Institucionais */}
            <div>
              <h4 className="font-semibold text-foreground uppercase tracking-wide text-[11px] mb-1">
                Objetivos Institucionais Pactuados
              </h4>
              <p className="p-3 bg-muted/20 rounded-lg border border-border text-muted-foreground leading-relaxed">
                {detalhePmd.objetivos}
              </p>
            </div>

            {/* Checklist de Ações Acordadas */}
            {detalhePmd.acoes && detalhePmd.acoes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-semibold text-foreground uppercase tracking-wide text-[11px]">
                    Checklist de Ações de Desenvolvimento
                  </h4>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {obterProgressoAcoes(detalhePmd.acoes).texto}
                  </span>
                </div>
                <div className="space-y-2">
                  {detalhePmd.acoes.map((acao, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-2.5 bg-background rounded-lg border border-border"
                    >
                      <div className="flex items-start gap-2">
                        {acao.status === 'concluido' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className="text-foreground">{acao.descricao}</span>
                      </div>
                      {acao.prazo && (
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0 ml-2">
                          {acao.prazo}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parecer de Verificação */}
            {detalhePmd.observacoes_verificacao && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Parecer da Verificação de Evolução
                </span>
                <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  {detalhePmd.observacoes_verificacao}
                </p>
              </div>
            )}

            {/* Botões do Rodapé */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div>
                {detalhePmd.status !== 'concluido' &&
                  detalhePmd.status !== 'verificado' &&
                  detalhePmd.status !== 'cancelado' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConcluirAcoes(detalhePmd.id)}
                      disabled={concluindoAcoes === detalhePmd.id}
                      className="gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {concluindoAcoes === detalhePmd.id ? 'Concluindo...' : 'Marcar Ações Concluídas'}
                    </Button>
                  )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetalhePmd(null)}>
                  Fechar
                </Button>
                {detalhePmd.status !== 'verificado' && detalhePmd.status !== 'cancelado' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const p = detalhePmd;
                      setDetalhePmd(null);
                      abrirVerificacao(p);
                    }}
                    className="gap-1"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Registrar Evolução
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE REGISTRO DE VERIFICAÇÃO DE EVOLUÇÃO */}
      {verModal && pmdVerif && (
        <Modal
          open={verModal}
          onClose={() => setVerModal(false)}
          title="Registrar Verificação de Evolução Funcional"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Informe a nova Nota Final Consolidada (NFC) apurada no ciclo subsequente para avaliar se o servidor superou o índice gatilho de retenção.
            </p>

            {/* Painel Comparativo Antes vs Depois */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">NFC Gatilho de Origem:</span>
                <span className="font-mono text-base font-bold text-destructive tabular-nums">
                  {pmdVerif.nfc_gatilho} pts
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Nota de Corte Padrão:</span>
                <span className="font-mono text-base font-bold text-foreground tabular-nums">
                  70,00 pts
                </span>
              </div>
            </div>

            {/* Campo Nova NFC com cálculo de delta em tempo real */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Nova NFC Apurada no Ciclo de Verificação *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfcNova}
                onChange={(e) => setNfcNova(e.target.value)}
                placeholder="Ex.: 74.50"
                className="font-mono tabular-nums text-sm font-semibold"
              />

              {/* Indicador de Delta em Tempo Real */}
              {analiseDelta && (
                <div
                  className={`p-2.5 rounded-md border text-xs flex items-center justify-between ${
                    analiseDelta.superouCorte
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {analiseDelta.superouCorte ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span>
                      Variação: <strong className="font-mono">{analiseDelta.deltaTexto}</strong> —{' '}
                      {analiseDelta.superouCorte
                        ? 'Superou a nota de corte (Apto à Desobstrução)'
                        : 'Abaixo da nota de corte (< 70,00)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Parecer das Ações */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Parecer Circunstanciado da Chefia / Comissão CAD *
              </label>
              <textarea
                className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                rows={4}
                value={obsVerif}
                onChange={(e) => setObsVerif(e.target.value)}
                placeholder="Descreva as medidas de capacitação, evolução das metas acordadas e fundamentação técnica do resultado apurado..."
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setVerModal(false)} disabled={savingVerif}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={registrarVerificacao}
                disabled={savingVerif || !nfcNova || !obsVerif}
                className="gap-1.5"
              >
                {savingVerif ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Concluir Verificação
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PmdPanel;
