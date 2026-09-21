import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  StatCard,
} from '@sysgov/ui';
import {
  Field,
  EmptyState,
  StatusChip,
  DataTable,
  SearchInput,
} from '@/components/ui';
import {
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Download,
  Clock,
  HelpCircle,
  CheckCircle2,
  Info,
  Eye,
  ShieldCheck,
  Users,
  Search,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiPendenciaHierarquia } from '@sysgov/sdk';
import {
  calcularKpisPendencias,
  filtrarPendencias,
  formatarDataHoraBr,
  gerarCsvPendencias,
  obterConfigTipoPendencia,
} from './PendenciasHierarquiaPanel.utils';

const api = new SysgovApi();

export const PendenciasHierarquiaPanel: React.FC = () => {
  const [pendencias, setPendencias] = useState<ApiPendenciaHierarquia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'aberta' | 'resolvida' | ''>('aberta');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [busca, setBusca] = useState<string>('');

  // Modal de Resolução
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<ApiPendenciaHierarquia | null>(null);
  const [avaliadorId, setAvaliadorId] = useState<string>('');
  const [avaliadorNome, setAvaliadorNome] = useState<string>('');
  const [resolvendo, setResolvendo] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sugestões de Servidores / Avaliadores no Modal
  const [servidoresCandidatos, setServidoresCandidatos] = useState<any[]>([]);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState<boolean>(false);
  const [buscaAvaliadorModal, setBuscaAvaliadorModal] = useState<string>('');
  const [modoManual, setModoManual] = useState<boolean>(false);

  // Modal de Detalhes de Auditoria
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [pendenciaDetalhes, setPendenciaDetalhes] = useState<ApiPendenciaHierarquia | null>(null);

  // Carregamento principal das pendências
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Carrega até 200 pendências para possibilitar filtro reativo e estatísticas no painel
      const res = await api.capd.listPendenciasHierarquia({ per_page: 200 });
      setPendencias(res.data);
    } catch {
      setPendencias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Carrega lista de servidores disponíveis para o modal de designação
  const carregarCandidatos = useCallback(async () => {
    setCarregandoCandidatos(true);
    try {
      const res = await api.capd.listServidores({ per_page: 50 });
      setServidoresCandidatos(res.data || []);
    } catch {
      setServidoresCandidatos([]);
    } finally {
      setCarregandoCandidatos(false);
    }
  }, []);

  // KPIs
  const kpis = useMemo(() => calcularKpisPendencias(pendencias), [pendencias]);

  // Lista Filtrada
  const pendenciasFiltradas = useMemo(
    () =>
      filtrarPendencias(pendencias, {
        status: filtroStatus,
        tipo: filtroTipo,
        busca,
      }),
    [pendencias, filtroStatus, filtroTipo, busca]
  );

  // Exportação CSV
  const exportarCsv = useCallback(() => {
    const csvContent = gerarCsvPendencias(pendenciasFiltradas);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataHoje = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `pendencias_hierarquia_capd_${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pendenciasFiltradas]);

  // Abertura do modal de resolução
  const abrirResolucao = (pendencia: ApiPendenciaHierarquia) => {
    setPendenciaSelecionada(pendencia);
    setAvaliadorId('');
    setAvaliadorNome('');
    setBuscaAvaliadorModal('');
    setModoManual(false);
    setErro(null);
    setModalAberto(true);
    carregarCandidatos();
  };

  // Abertura do modal de detalhes
  const abrirDetalhes = (pendencia: ApiPendenciaHierarquia) => {
    setPendenciaDetalhes(pendencia);
    setModalDetalhesAberto(true);
  };

  // Submissão da resolução
  const resolver = async () => {
    if (!pendenciaSelecionada || !avaliadorId) return;
    setResolvendo(true);
    setErro(null);
    try {
      await api.capd.resolverPendenciaHierarquia(pendenciaSelecionada.id, Number(avaliadorId));
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível resolver a pendência de hierarquia.');
    } finally {
      setResolvendo(false);
    }
  };

  // Servidores candidatos filtrados no modal
  const candidatosFiltrados = useMemo(() => {
    const termo = buscaAvaliadorModal.trim().toLowerCase();
    if (!termo) return servidoresCandidatos.slice(0, 8);
    return servidoresCandidatos
      .filter((s) => {
        const nome = (s.nome_completo || '').toLowerCase();
        const mat = (s.matricula || '').toLowerCase();
        const cargo = (s.cargo_efetivo || '').toLowerCase();
        return nome.includes(termo) || mat.includes(termo) || cargo.includes(termo);
      })
      .slice(0, 8);
  }, [servidoresCandidatos, buscaAvaliadorModal]);

  // Definição das colunas do DataTable
  const columns: ColumnDef<ApiPendenciaHierarquia, any>[] = useMemo(
    () => [
      {
        id: 'servidor',
        header: 'Servidor',
        accessorFn: (row) => row.servidor?.nome_completo ?? `#${row.servidor_id}`,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="font-medium text-foreground">
                {p.servidor?.nome_completo ?? `#${p.servidor_id}`}
              </div>
              {p.servidor?.matricula && (
                <div className="font-mono text-xs text-muted-foreground tabular-nums">
                  {p.servidor.matricula}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'ciclo',
        header: 'Ciclo Avaliativo',
        accessorFn: (row) => (row.ciclo ? `${row.ciclo.nome} (${row.ciclo.ano_referencia})` : '—'),
        cell: ({ row }) => {
          const c = row.original.ciclo;
          if (!c) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="text-xs">
              <span className="font-medium">{c.nome}</span>
              <span className="ml-1 text-muted-foreground font-mono tabular-nums">
                ({c.ano_referencia})
              </span>
            </div>
          );
        },
      },
      {
        id: 'tipo_pendencia',
        header: 'Inconsistência',
        accessorFn: (row) => row.tipo_pendencia,
        cell: ({ row }) => {
          const tipo = row.original.tipo_pendencia;
          const config = obterConfigTipoPendencia(tipo);

          if (tipo === 'sem_superior') {
            return (
              <Badge variant="warning" className="gap-1 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Sem Superior</span>
              </Badge>
            );
          }

          if (tipo === 'afastamento_sem_substituto') {
            return (
              <Badge variant="info" className="gap-1 py-1">
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                <span>Afastamento</span>
              </Badge>
            );
          }

          if (tipo === 'topo_sem_config') {
            return (
              <Badge variant="secondary" className="gap-1 py-1">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Topo s/ Config</span>
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="gap-1 py-1">
              <span>{config.label}</span>
            </Badge>
          );
        },
      },
      {
        id: 'motivo',
        header: 'Diagnóstico do Motor',
        accessorFn: (row) => row.motivo,
        cell: ({ row }) => (
          <div
            className="text-xs text-muted-foreground max-w-sm line-clamp-2 leading-relaxed"
            title={row.original.motivo}
          >
            {row.original.motivo}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.status === 'aberta' ? 'Aberta' : 'Resolvida'}
            variant={row.original.status === 'aberta' ? 'warning' : 'success'}
          />
        ),
      },
      {
        id: 'resolucao',
        header: 'Resolução / Data',
        accessorFn: (row) => row.resolvido_em ?? '',
        cell: ({ row }) => {
          const p = row.original;
          if (p.status !== 'resolvida') {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="text-xs space-y-0.5">
              <div className="font-mono text-muted-foreground tabular-nums">
                Avaliador #{p.avaliador_designado_id}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {formatarDataHoraBr(p.resolvido_em)}
              </div>
            </div>
          );
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => {
          const p = row.original;
          if (p.status === 'aberta') {
            return (
              <div className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => abrirResolucao(p)}
                  className="gap-1.5 hover:border-primary/50"
                >
                  <UserCheck className="h-4 w-4 text-primary" />
                  Resolver
                </Button>
              </div>
            );
          }
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => abrirDetalhes(p)}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
                Detalhes
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PAINEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pendências de Hierarquia Avaliativa (DRH)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saneamento de exceções e designação manual de avaliadores para servidores com inconsistências na árvore funcional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={pendenciasFiltradas.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* PAINEL EXECUTIVO DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendências Abertas"
          value={kpis.totalAbertas}
          caption={kpis.totalAbertas > 0 ? 'Exigem designação manual' : 'Cadastros 100% íntegros'}
          accentClassName={kpis.totalAbertas > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}
          valueClassName={
            kpis.totalAbertas > 0
              ? 'text-amber-600 dark:text-amber-400 font-mono tabular-nums'
              : 'text-emerald-600 dark:text-emerald-400 font-mono tabular-nums'
          }
        />
        <StatCard
          label="Total Resolvidas"
          value={kpis.totalResolvidas}
          caption="Designações homologadas pelo DRH"
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums"
        />
        <StatCard
          label="Taxa de Saneamento"
          value={kpis.taxaSaneamento}
          caption="Percentual de resolução acumulado"
          accentClassName="border-l-sky-500"
          valueClassName="font-mono tabular-nums text-foreground"
        />
        <StatCard
          label="Sem Superior / Afastamento"
          value={`${kpis.porTipo.sem_superior} / ${kpis.porTipo.afastamento_sem_substituto}`}
          caption="Causas principais registradas"
          accentClassName="border-l-indigo-500"
          valueClassName="font-mono tabular-nums text-foreground text-xl"
        />
      </div>

      {/* CARD PRINCIPAL COM FERRAMENTAS E LISTAGEM */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por servidor, matrícula ou motivo..."
                  className="pl-8 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Status */}
              <div className="w-36">
                <Select
                  value={filtroStatus}
                  onChange={(val) => setFiltroStatus(val as 'aberta' | 'resolvida' | '')}
                  options={[
                    { value: 'aberta', label: 'Abertas' },
                    { value: 'resolvida', label: 'Resolvidas' },
                    { value: '', label: 'Todas as Situações' },
                  ]}
                />
              </div>

              {/* Filtro por Tipo */}
              <div className="w-48">
                <Select
                  value={filtroTipo}
                  onChange={setFiltroTipo}
                  options={[
                    { value: '', label: 'Todos os Tipos' },
                    { value: 'sem_superior', label: 'Sem Superior' },
                    { value: 'afastamento_sem_substituto', label: 'Afastamento' },
                    { value: 'topo_sem_config', label: 'Topo s/ Config' },
                  ]}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pendenciasFiltradas.length === 0 && !loading ? (
            <div className="py-12">
              <EmptyState
                icon={<AlertTriangle className="h-8 w-8 text-muted-foreground" />}
                title="Nenhuma pendência encontrada"
                description={
                  busca || filtroStatus || filtroTipo
                    ? 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros de pesquisa.'
                    : 'Todas as resoluções de hierarquia estão regularizadas no momento.'
                }
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pendenciasFiltradas}
              loading={loading}
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

      {/* MODAL DE RESOLUÇÃO ASSISTIDO E SEGURO */}
      {modalAberto && pendenciaSelecionada && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title="Designar Avaliador Responsável (DRH)"
          size="md"
        >
          <div className="space-y-4">
            {erro && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
                {erro}
              </div>
            )}

            {/* FICHA DE CONTEXTO DO SERVIDOR */}
            <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Servidor em Avaliação
                </span>
                {pendenciaSelecionada.ciclo && (
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {pendenciaSelecionada.ciclo.nome} ({pendenciaSelecionada.ciclo.ano_referencia})
                  </Badge>
                )}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {pendenciaSelecionada.servidor?.nome_completo ?? `#${pendenciaSelecionada.servidor_id}`}
              </div>
              {pendenciaSelecionada.servidor?.matricula && (
                <div className="text-xs font-mono text-muted-foreground tabular-nums">
                  Matrícula: {pendenciaSelecionada.servidor.matricula}
                </div>
              )}
              <div className="pt-1.5 border-t border-border/60 text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground font-medium">Diagnóstico: </strong>
                  {pendenciaSelecionada.motivo}
                </span>
              </div>
            </div>

            {/* SELEÇÃO DO NOVO AVALIADOR */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Selecione o Avaliador Designado
                </span>
                <button
                  type="button"
                  onClick={() => setModoManual(!modoManual)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {modoManual ? 'Voltar para busca por lista' : 'Inserir ID manual'}
                </button>
              </div>

              {!modoManual ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={buscaAvaliadorModal}
                      onChange={(e) => setBuscaAvaliadorModal(e.target.value)}
                      placeholder="Pesquisar gestor por nome, cargo ou matrícula..."
                      className="pl-8 text-xs"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                    {carregandoCandidatos ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Carregando servidores gestores...
                      </div>
                    ) : candidatosFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nenhum servidor encontrado. Tente buscar por matrícula ou utilize a inserção por ID manual.
                      </div>
                    ) : (
                      candidatosFiltrados.map((s) => {
                        const targetId = s.user_id ? String(s.user_id) : String(s.id);
                        const isSelecionado = avaliadorId === targetId;

                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setAvaliadorId(targetId);
                              setAvaliadorNome(s.nome_completo);
                            }}
                            className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                              isSelecionado
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{s.nome_completo}</div>
                              <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                                Mat.: {s.matricula || 'S/M'} — Cargo: {s.cargo_efetivo || 'Efetivo'}
                              </div>
                            </div>
                            {isSelecionado && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <Field label="ID do Usuário Avaliador Designado (users.id)">
                  <Input
                    type="number"
                    value={avaliadorId}
                    onChange={(e) => {
                      setAvaliadorId(e.target.value);
                      setAvaliadorNome(`Usuário ID #${e.target.value}`);
                    }}
                    placeholder="Ex.: 42"
                    className="font-mono tabular-nums text-xs"
                  />
                </Field>
              )}

              {/* Avaliador Selecionado em Destaque */}
              {avaliadorId && (
                <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-md text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Avaliador Selecionado: </span>
                    <strong className="text-foreground ml-1">{avaliadorNome || `ID #${avaliadorId}`}</strong>
                    <span className="text-muted-foreground font-mono tabular-nums text-[11px] ml-2">
                      (User ID: {avaliadorId})
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>
              )}
            </div>

            {/* AVISO DE IMPACTO */}
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs rounded-md flex items-start gap-2">
              <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção: </strong>
                A confirmação desta designação atualizará imediatamente todas as avaliações abertas e não-homologadas deste servidor neste ciclo, atribuindo-as ao novo avaliador.
              </span>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" onClick={() => setModalAberto(false)} disabled={resolvendo}>
                Cancelar
              </Button>
              <Button onClick={resolver} disabled={resolvendo || !avaliadorId} className="gap-1.5">
                {resolvendo ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Resolvendo...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Confirmar Designação
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE DETALHES DA AUDITORIA */}
      {modalDetalhesAberto && pendenciaDetalhes && (
        <Modal
          open={modalDetalhesAberto}
          onClose={() => setModalDetalhesAberto(false)}
          title="Histórico e Auditoria da Pendência"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-md border border-border space-y-1.5">
              <div className="text-muted-foreground font-semibold">Servidor Avaliado</div>
              <div className="text-sm font-medium text-foreground">
                {pendenciaDetalhes.servidor?.nome_completo ?? `#${pendenciaDetalhes.servidor_id}`}
              </div>
              {pendenciaDetalhes.servidor?.matricula && (
                <div className="font-mono text-muted-foreground tabular-nums">
                  Matrícula: {pendenciaDetalhes.servidor.matricula}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Identificador da Pendência:</span>
                <span className="font-mono tabular-nums font-medium">#{pendenciaDetalhes.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Ciclo:</span>
                <span className="font-medium">
                  {pendenciaDetalhes.ciclo ? `${pendenciaDetalhes.ciclo.nome} (${pendenciaDetalhes.ciclo.ano_referencia})` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Categoria da Inconsistência:</span>
                <span className="font-medium">{obterConfigTipoPendencia(pendenciaDetalhes.tipo_pendencia).label}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Status da Pendência:</span>
                <StatusChip
                  label={pendenciaDetalhes.status === 'aberta' ? 'Aberta' : 'Resolvida'}
                  variant={pendenciaDetalhes.status === 'aberta' ? 'warning' : 'success'}
                />
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Avaliador Designado:</span>
                <span className="font-mono tabular-nums font-medium">
                  {pendenciaDetalhes.avaliador_designado_id ? `ID #${pendenciaDetalhes.avaliador_designado_id}` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Data do Saneamento:</span>
                <span className="font-mono tabular-nums">{formatarDataHoraBr(pendenciaDetalhes.resolvido_em)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Registro no Sistema:</span>
                <span className="font-mono tabular-nums">{formatarDataHoraBr(pendenciaDetalhes.created_at)}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/20 rounded-md border border-border space-y-1">
              <span className="text-muted-foreground font-semibold">Diagnóstico Emitido pelo Motor:</span>
              <p className="text-foreground leading-relaxed">{pendenciaDetalhes.motivo}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalDetalhesAberto(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
