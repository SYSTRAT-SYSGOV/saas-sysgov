import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  KpiCard,
  AlertCard,
  StatusChip,
  Select,
} from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import {
  FileText,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Download,
  DollarSign,
  Target,
  Info,
  XCircle,
  CalendarDays,
  BarChart3,
  Fingerprint,
  MessageSquare,
  Percent,
  ArrowUpCircle,
  Search,
  Calendar,
  User,
  Hash,
  AlertCircle,
  CircleCheck,
  ScrollText,
  Shield,
  ThumbsUp,
  Eye,
  RotateCcw,
  Filter,
  Plus,
  Users,
  LayoutList,
  Table,
  X,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiEspelhoAvaliacao,
  ApiDiarioBordo,
  ApiSimulacaoProgressao,
  ApiAvaliacao,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';
import { MatrizEscalaGrafica, type RespostaItem } from '../components/MatrizEscalaGrafica';

const api = new SysgovApi();

type ServidorSubTab = 'espelho' | 'cit' | 'simulador' | 'pmd' | 'recurso';

export interface PortalServidorViewProps {
  portalSelector?: React.ReactNode;
}

// ─── Helpers e Componentes de Suporte (Semaforo Fiscal SYSGOV) ────────────────────────

function getGrauColor(grau: number) {
  if (grau >= 4) return 'text-status-success';
  if (grau >= 3) return 'text-[#8D5B00]';
  return 'text-status-danger';
}

function getGrauLabel(grau: number) {
  const labels: Record<number, string> = {
    1: 'Insatisfatório',
    2: 'Abaixo do esperado',
    3: 'Satisfatório',
    4: 'Bom desempenho',
    5: 'Excelente',
  };
  return labels[grau] || `Grau ${grau}`;
}

function getGrauBgColor(grau: number) {
  if (grau >= 4) return 'bg-status-success-bg border-status-success-border';
  if (grau >= 3) return 'bg-status-warning-bg border-status-warning-border';
  return 'bg-status-danger-bg border-status-danger-border';
}

function ProgressBar({ value, max = 100, color = 'emerald' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
  };
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${colorMap[color] || 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Component Principal ──────────────────────────────────────────────────────

export const PortalServidorView: React.FC<PortalServidorViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<ServidorSubTab>('espelho');
  const [loading, setLoading] = useState<boolean>(true);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [selectedAvalId, setSelectedAvalId] = useState<number | null>(null);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [simulacao, setSimulacao] = useState<ApiSimulacaoProgressao | null>(null);
  const [pmd, setPmd] = useState<any | null>(null);

  const [filtroCitBusca, setFiltroCitBusca] = useState('');
  const [filtroCitTipo, setFiltroCitTipo] = useState<'todos' | 'positivo' | 'negativo'>('todos');
  const [modalCienciaOpen, setModalCienciaOpen] = useState<boolean>(false);
  const [tipoCiencia, setTipoCiencia] = useState<'concordancia' | 'discordancia_recurso'>('concordancia');
  const [observacoesCiencia, setObservacoesCiencia] = useState<string>('');
  const [assinando, setAssinando] = useState<boolean>(false);
  const [modalRecursoOpen, setModalRecursoOpen] = useState<boolean>(false);
  const [fatoresContestados, setFatoresContestados] = useState<string[]>([]);
  const [fundamentacaoRecurso, setFundamentacaoRecurso] = useState<string>('');
  const [novoGrauDesejado, setNovoGrauDesejado] = useState<number>(4);
  const [enviandoRecurso, setEnviandoRecurso] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const carregarListaAvaliacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.capd.listAvaliacoes();
      const lista = res.data || [];
      setAvaliacoes(lista);
      if (lista.length > 0) {
        setSelectedAvalId(lista[0].id);
      }
    } catch (e) {
      console.error('Erro ao carregar avaliações:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarDadosAvaliacao = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const aval = avaliacoes.find(a => a.id === id);
      const servidorId = aval?.servidor_id;
      if (!servidorId) return;

      const [esp, resCit, sim, listaPmd] = await Promise.all([
        api.capd.obterEspelhoAvaliacao(id).catch(() => null),
        api.capd.listDiarioBordo({ servidor_id: servidorId }).catch(() => ({ data: [] })),
        api.capd.simularProgressao(servidorId).catch(() => null),
        api.capd.listPmds({ servidor_id: servidorId }).catch(() => ({ data: [] })),
      ]);
      setEspelho(esp);
      setIncidentes(resCit.data || []);
      setSimulacao(sim);
      setPmd(listaPmd.data?.[0] || null);
    } catch (e) {
      console.error('Erro ao carregar dados da avaliação:', e);
    } finally {
      setLoading(false);
    }
  }, [avaliacoes]);

  useEffect(() => {
    carregarListaAvaliacoes();
  }, [carregarListaAvaliacoes]);

  useEffect(() => {
    if (selectedAvalId) {
      carregarDadosAvaliacao(selectedAvalId);
    }
  }, [selectedAvalId, carregarDadosAvaliacao]);

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter((inc) => {
      const matchTipo = filtroCitTipo === 'todos' || inc.tipo === filtroCitTipo;
      const matchBusca = !filtroCitBusca || inc.descricao_fato?.toLowerCase().includes(filtroCitBusca.toLowerCase()) || inc.fator?.nome?.toLowerCase().includes(filtroCitBusca.toLowerCase());
      return matchTipo && matchBusca;
    });
  }, [incidentes, filtroCitTipo, filtroCitBusca]);

  const incidentesPositivos = useMemo(() => incidentes.filter((i) => i.tipo === 'positivo'), [incidentes]);
  const incidentesNegativos = useMemo(() => incidentes.filter((i) => i.tipo !== 'positivo'), [incidentes]);

  const fatoresParaMatriz = useMemo(
    () => (espelho?.fatores || []).map((f) => ({ codigo: f.codigo, nome: f.nome, descricao: f.descricao || '' })),
    [espelho]
  );

  const respostasEspelho = useMemo(() => {
    const mapa: Record<string, RespostaItem> = {};
    for (const f of espelho?.fatores || []) {
      mapa[f.codigo] = { grau: f.grau ?? undefined, justificativa: f.justificativa ?? undefined };
    }
    return mapa;
  }, [espelho]);

  const anotacoesPorFator = useMemo(() => {
    const mapa: Record<string, ApiDiarioBordo[]> = {};
    for (const inc of incidentes) {
      const cod = inc.fator?.codigo;
      if (!cod) continue;
      if (!mapa[cod]) mapa[cod] = [];
      mapa[cod].push(inc);
    }
    return mapa;
  }, [incidentes]);

  const handleAssinarCiencia = async () => {
    if (!espelho) return;
    setAssinando(true);
    try {
      const res = await api.capd.registrarCiencia(espelho.avaliacao_id, { tipo: tipoCiencia, observacoes: observacoesCiencia });
      setModalCienciaOpen(false);
      await carregarDadosAvaliacao(selectedAvalId!);
      setFeedback({ open: true, type: 'success', title: 'Ciência Registrada', message: `Sua assinatura digital foi protocolada. Hash: ${res.hash_sha256.substring(0, 16)}...` });
    } catch (err: any) {
      setFeedback({ open: true, type: 'error', title: 'Erro ao Registrar Ciência', message: err?.response?.data?.message || 'Falha ao registrar assinatura.' });
    } finally { setAssinando(false); }
  };

  const handleSubmeterRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espelho) return;
    setEnviandoRecurso(true);
    try {
      await api.capd.createRecurso({ avaliacao_id: espelho.avaliacao_id, fator_contestado_id: 1, justificativa_servidor: `[Fatores: ${fatoresContestados.join(', ')}] ${fundamentacaoRecurso}` });
      setModalRecursoOpen(false);
      setFundamentacaoRecurso('');
      await carregarDadosAvaliacao(selectedAvalId!);
      setFeedback({ open: true, type: 'success', title: 'Recurso Protocolado', message: 'Seu recurso foi encaminhado com sucesso à chefia imediata.' });
    } catch (err: any) {
      setFeedback({ open: true, type: 'error', title: 'Erro no Protocolo', message: err?.response?.data?.message || 'Falha ao protocolar.' });
    } finally { setEnviandoRecurso(false); }
  };

  const subTabItems: TabsItem<ServidorSubTab>[] = [
    { key: 'espelho', label: 'Espelho da Avaliação', icon: <FileText className="h-4 w-4" /> },
    { key: 'cit', label: 'Diário de Bordo', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length || undefined },
    { key: 'simulador', label: 'Simulador de Progressão', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'pmd', label: 'Plano de Melhoria (PMD)', icon: <GraduationCap className="h-4 w-4" />, badge: pmd ? 1 : undefined },
    { key: 'recurso', label: 'Meu Recurso', icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  if (loading && !espelho) return <ScreenState type="loading" title="Carregando portal do servidor avaliado..." />;

  const cycleOptions: SelectOption[] = avaliacoes.map(av => ({
    value: av.id.toString(),
    label: `Ciclo ${av.ciclo?.ano_referencia || av.ciclo?.nome || av.id}`
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal do Servidor Avaliado"
        subtitle="Consulta ao espelho funcional de desempenho, ciência eletrônica e simulação de progressão"
        badge="Área do Servidor"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciclo:</span>
              <Select
                value={selectedAvalId ? selectedAvalId.toString() : null}
                onChange={(val) => setSelectedAvalId(Number(val))}
                options={cycleOptions}
                className="w-48"
              />
            </div>
            {portalSelector}
            {espelho && !espelho.ciencia_servidor_em && (
              <Button variant="default" size="sm" onClick={() => setModalCienciaOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Fingerprint className="h-4 w-4 mr-1.5" /> Assinar Ciência Digital
              </Button>
            )}
            {espelho && espelho.pode_recorrer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalRecursoOpen(true)}
                className="border-status-warning-border text-[#8D5B00] hover:bg-status-warning-bg"
              >
                <ShieldAlert className="h-4 w-4 mr-1.5" /> Interpor Recurso
              </Button>
            )}
          </div>
        }
      />

      {espelho && !espelho.ciencia_servidor_em && (
        <div className="flex items-start gap-3 p-4 bg-status-warning-bg border border-status-warning-border rounded-lg shadow-2xs">
          <AlertCircle className="h-5 w-5 text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#8D5B00]">Ciência Eletrônica Pendente</p>
            <p className="text-xs text-[#8D5B00]/80 mt-0.5">A ciência é obrigatória nos termos do Art. 27 da Lei nº 1.704/2006. O prazo recursal inicia após a assinatura.</p>
          </div>
          <Button size="sm" onClick={() => setModalCienciaOpen(true)} className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs">Assinar Agora</Button>
        </div>
      )}

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'espelho' && (
        <div className="space-y-6">
          {espelho ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  title="Nota Final do Ciclo (Nc)"
                  value={`${Number(espelho.nota_final).toFixed(2)} pts`}
                  subtitle={espelho.elegivel_progressao ? 'Acima do corte ≥ 70 pts' : 'Abaixo do corte < 70 pts'}
                  icon={<Award className="h-5 w-5" />}
                  iconBgColor={espelho.elegivel_progressao ? 'bg-status-success-bg text-status-success' : 'bg-status-danger-bg text-status-danger'}
                  statusBadge={<StatusChip label={espelho.elegivel_progressao ? 'Apto' : 'Abaixo do Corte'} variant={espelho.elegivel_progressao ? 'success' : 'danger'} />}
                />
                <KpiCard
                  title="Ciclo de Referência"
                  value={espelho.ciclo?.ano_referencia?.toString() || 'Vigente'}
                  subtitle={espelho.ciclo?.nome || 'Ciclo Anual de Avaliação'}
                  icon={<CalendarDays className="h-5 w-5" />}
                  iconBgColor="bg-status-info-bg text-status-info"
                />
                <KpiCard
                  title="Devolutiva Presencial"
                  value={espelho.devolutiva_realizada ? 'Realizada' : 'Pendente'}
                  subtitle={`Gestor: ${espelho.avaliador?.nome || 'Chefia Imediata'}`}
                  icon={<MessageSquare className="h-5 w-5" />}
                  iconBgColor={espelho.devolutiva_realizada ? 'bg-status-success-bg text-status-success' : 'bg-status-warning-bg text-status-warning'}
                  statusBadge={<StatusChip label={espelho.devolutiva_realizada ? 'Concluída' : 'Aguardando'} variant={espelho.devolutiva_realizada ? 'success' : 'warning'} />}
                />
              </div>

              <Card className="p-5 border-border bg-muted/10 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-status-info" /> Elegibilidade à Progressão Funcional
                    </h3>
                    <p className="text-xs text-muted-foreground">Nota de corte: <span className="font-mono font-bold text-foreground">70,00 pontos</span></p>
                  </div>
                  <StatusChip label={espelho.elegivel_progressao ? 'Apto à Progressão' : 'Abaixo do Corte'} variant={espelho.elegivel_progressao ? 'success' : 'danger'} />
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>0 pts</span> <span className="text-foreground font-bold">{Number(espelho.nota_final).toFixed(2)} pts</span> <span>100 pts</span>
                  </div>
                  <div className="relative">
                    <ProgressBar value={Number(espelho.nota_final)} max={100} color={espelho.elegivel_progressao ? 'emerald' : 'rose'} />
                    <div className="absolute top-0 -translate-x-1/2 h-1.5 w-0.5 bg-amber-400" style={{ left: '70%' }} />
                  </div>
                  <div className="text-[10px] text-[#8D5B00] text-right font-mono">← Corte: 70,00 pts</div>
                </div>
              </Card>

              {espelho.parecer_avaliador && (
                <Card className="p-5 border-border bg-muted/30 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-status-info-bg rounded-lg border border-status-info-border shrink-0">
                      <ScrollText className="h-4 w-4 text-status-info" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Parecer Descritivo do Gestor</h4>
                      <blockquote className="text-sm text-foreground leading-relaxed italic border-l-2 border-status-info-border pl-4">"{espelho.parecer_avaliador}"</blockquote>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground">Espelho de Desempenho</h3>
                    <p className="text-xs text-muted-foreground">Metodologia de Escala Gráfica para Avaliação de Desempenho (Chiavenato) — somente leitura</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">{espelho.fatores?.length || 0} fatores</Badge>
                </div>
                <div className="p-4 bg-muted/10">
                  <MatrizEscalaGrafica
                    fatores={fatoresParaMatriz}
                    respostas={respostasEspelho}
                    anotacoesPorFator={anotacoesPorFator}
                    onVerIncidentes={() => setActiveTab('cit')}
                    disabled
                  />
                </div>
                <div className="p-4 border-t border-border bg-card flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-mono">Soma dos pesos: {(espelho.fatores?.reduce((s, f) => s + f.peso, 0) ?? 0).toFixed(2)}%</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Nota Final:</span>
                    <span className="font-mono text-xl font-black text-foreground tabular-nums">{Number(espelho.nota_final).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState icon={<FileText className="h-10 w-10 text-muted-foreground" />} title="Nenhuma avaliação encontrada" description="Sua avaliação ainda está em processamento." />
          )}
        </div>
      )}

      {activeTab === 'cit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard title="Total de Registros" value={incidentes.length.toString()} subtitle="Apontamentos do período" icon={<BookOpen className="h-5 w-5" />} iconBgColor="bg-status-info-bg text-status-info" />
            <KpiCard title="Fatos Positivos" value={incidentesPositivos.length.toString()} subtitle="Desempenhos exemplares" icon={<CircleCheck className="h-5 w-5" />} iconBgColor="bg-status-success-bg text-status-success" statusBadge={<StatusChip label="Favorável" variant="success" />} />
            <KpiCard title="Pontos a Desenvolver" value={incidentesNegativos.length.toString()} subtitle="Oportunidades de melhoria" icon={<AlertCircle className="h-5 w-5" />} iconBgColor="bg-status-warning-bg text-status-warning" statusBadge={<StatusChip label="Atenção" variant="warning" />} />
          </div>

          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-foreground">Diário de Bordo — Fatos Observáveis (CIT)</h3>
                  <Badge variant="outline" className="text-[10px] font-mono">{incidentes.length} registros</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { key: 'todos', label: 'Todos', count: incidentes.length },
                  { key: 'positivo', label: 'Positivos', count: incidentesPositivos.length, dot: 'bg-emerald-500' },
                  { key: 'negativo', label: 'A Desenvolver', count: incidentesNegativos.length, dot: 'bg-amber-500' },
                ].map((chip) => {
                  const ativo = filtroCitTipo === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFiltroCitTipo(chip.key as any)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        ativo
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                      }`}
                    >
                      {chip.dot && <span className={`h-1.5 w-1.5 rounded-full ${chip.dot} shrink-0`} />}
                      <span>{chip.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${ativo ? 'bg-white/20' : 'bg-background/80'}`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={filtroCitBusca}
                  onChange={(e) => setFiltroCitBusca(e.target.value)}
                  placeholder="Pesquisar fato, fator ou descrição..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/10">
              {incidentesFiltrados.length === 0 ? (
                <EmptyState icon={<BookOpen className="h-10 w-10 text-muted-foreground" />} title="Nenhum registro encontrado" description="Não constam registros com o filtro aplicado." />
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {incidentesFiltrados.map((inc) => {
                    const isPositivo = inc.tipo === 'positivo';
                    const dataObj = new Date(inc.data_ocorrencia);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

                    const servidorNome = espelho?.servidor?.nome || 'Servidor Avaliado';
                    const matricula = espelho?.servidor?.matricula || '—';
                    const cargo = espelho?.servidor?.cargo || 'Servidor Público Municipal';
                    const fatorNome = inc.fator?.nome || `Fator #${inc.fator_id}`;
                    const hash = inc.hash_sha256;
                    const partes = servidorNome.trim().split(' ');
                    const iniciais = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : partes[0].slice(0, 2).toUpperCase();

                    return (
                      <div key={inc.id} className="relative group">
                        <div className={`absolute -left-6 top-3 h-4 w-4 rounded-full border-2 border-background shadow-xs flex items-center justify-center ${isPositivo ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <div className={`rounded-xl border border-border bg-card p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                          isPositivo
                            ? 'border-l-4 border-l-emerald-500 hover:border-l-emerald-600'
                            : 'border-l-4 border-l-amber-500 hover:border-l-amber-600'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {iniciais}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">{servidorNome}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                    Mat. {matricula}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">{cargo}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={isPositivo ? 'success' : 'outline'} className={`text-[10px] uppercase font-bold flex items-center gap-1 ${!isPositivo ? 'border-status-warning-border text-[#8D5B00] bg-status-warning-bg' : ''}`}>
                                {isPositivo ? <><ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" /> Fato Positivo (Superação)</> : <><AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" /> Ponto a Desenvolver</>}
                              </Badge>
                              <Badge variant="outline" className="text-[11px] font-medium text-foreground/80">
                                {fatorNome}
                              </Badge>
                              <span className="font-mono text-xs font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/50">
                                <Clock className="h-3 w-3 text-muted-foreground/70" /> {dataFormatada}
                              </span>
                            </div>
                          </div>
                          <div className="bg-muted/20 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed">
                            <span className="font-semibold text-foreground/90 block mb-1">Conduta Fática Registrada nos Autos:</span>
                            <p className="text-muted-foreground leading-relaxed">{inc.descricao_fato}</p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-3">
                              {hash && (
                                <span
                                  className="font-mono text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded border border-border/60 flex items-center gap-1 cursor-pointer hover:text-foreground"
                                  title={`Hash SHA-256 Imutável: ${hash}`}
                                  onClick={() => navigator.clipboard?.writeText(hash)}
                                >
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  sha256: {hash.slice(0, 10)}...{hash.slice(-6)}
                                </span>
                              )}
                              <span className="text-muted-foreground/70 hidden md:inline">• Válido para fundamentar Graus 1, 2 ou 5</span>
                            </div>
                            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 self-end sm:self-auto hover:bg-primary/10" onClick={() => {}}>
                              <Eye className="h-3.5 w-3.5 text-primary" /> Ver Ficha Completa
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'simulador' && (
        <div className="space-y-6">
          {simulacao ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="NFC Trienal Projetada" value={`${Number(simulacao.nfc_projetada).toFixed(2)} pts`} subtitle="Média aritmética dos 3 ciclos" icon={<BarChart3 className="h-5 w-5" />} iconBgColor="bg-status-info-bg text-status-info" />
                <KpiCard title="Elegibilidade Regimental" value={simulacao.elegivel_progressao ? 'APTO' : 'INAPTO'} subtitle="Corte legal: 70,00 pontos" icon={<Target className="h-5 w-5" />} iconBgColor={simulacao.elegivel_progressao ? 'bg-status-success-bg text-status-success' : 'bg-status-danger-bg text-status-danger'} statusBadge={<StatusChip label={simulacao.elegivel_progressao ? 'Progressão Garantida' : 'PMD Obrigatório'} variant={simulacao.elegivel_progressao ? 'success' : 'danger'} />} />
                <KpiCard title="Impacto Salarial Total" value={`+${simulacao.percentual_total_aumento?.toFixed(1) || '0.0'}%`} subtitle="Progressão horizontal + quinquênios" icon={<ArrowUpCircle className="h-5 w-5" />} iconBgColor="bg-status-success-bg text-status-success" />
              </div>
              <Card className={`p-5 border-border ${simulacao.elegivel_progressao ? 'bg-status-success-bg border-status-success-border' : 'bg-status-danger-bg border-status-danger-border'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${simulacao.elegivel_progressao ? 'bg-white/60' : 'bg-white/60'}`}>
                    {simulacao.elegivel_progressao ? <CheckCircle2 className="h-6 w-6 text-status-success" /> : <XCircle className="h-6 w-6 text-status-danger" />}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base font-bold ${simulacao.elegivel_progressao ? 'text-status-success' : 'text-status-danger'}`}>
                      {simulacao.elegivel_progressao ? 'Servidor Apto à Progressão Horizontal (+10%)' : 'Servidor Inapto — NFC Abaixo do Corte'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {simulacao.elegivel_progressao ? 'A NFC trienal calculada supera o mínimo legal de 70,00 pontos, conferindo direito à progressão horizontal de 10% sobre o vencimento-base.' : 'A NFC trienal calculada está abaixo do mínimo legal. Será elaborado um PMD para o próximo triênio.'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><DollarSign className="h-4 w-4 text-emerald-500" /> Quinquênios e Adicional por Tempo de Serviço (Art. 17)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/40 rounded-lg border border-border text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Quinquênios Adquiridos</span>
                    <div className="font-mono font-black text-3xl text-foreground mt-1">{simulacao.quinquenios?.qtd_quinquenios || 0}</div>
                    <span className="text-xs text-muted-foreground">períodos de 5 anos</span>
                  </div>
                  <div className="p-4 bg-status-success-bg rounded-lg border border-status-success-border text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Adicional sobre o Básico</span>
                    <div className="font-mono font-black text-3xl text-status-success mt-1">+{simulacao.quinquenios?.percentual_total?.toFixed(1) || '0.0'}%</div>
                    <span className="text-xs text-muted-foreground">sobre o vencimento-base</span>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-lg border border-border text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Próximo Quinquênio</span>
                    <div className="font-mono font-bold text-base text-foreground mt-1">{simulacao.quinquenios?.proximo_em || 'Em apuração'}</div>
                    <span className="text-xs text-muted-foreground">data prevista</span>
                  </div>
                </div>
              </Card>
              <Card className="gap-0 py-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-card">
                  <h4 className="text-sm font-bold text-foreground">Histórico de Notas Anuais — Triênio Atual</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">As 3 notas anuais compõem a NFC pela média aritmética simples.</p>
                </div>
                <div className="p-5 space-y-4">
                  {simulacao.historico_ciclos?.map((h, idx) => {
                    const nota = Number(h.nota);
                    const color = nota >= 70 ? 'emerald' : nota >= 50 ? 'amber' : 'rose';
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-status-info px-2 py-1 bg-status-info-bg rounded border border-status-info-border">Ano {idx + 1}</span>
                            <span className="text-xs text-muted-foreground">{h.ano ? `(${h.ano})` : ''} Ciclo #{h.ciclo_id}</span>
                          </div>
                          <span className={`font-mono font-black text-lg tabular-nums ${color === 'emerald' ? 'text-status-success' : color === 'amber' ? 'text-[#8D5B00]' : 'text-status-danger'}`}>{nota.toFixed(2)} pts</span>
                        </div>
                        <ProgressBar value={nota} max={100} color={color} />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono"><span>0</span><span className="text-[#8D5B00]">corte: 70</span><span>100</span></div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> Média (NFC Trienal):</span>
                    <span className="font-mono font-black text-xl text-foreground tabular-nums">{Number(simulacao.nfc_projetada).toFixed(2)} pts</span>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState icon={<TrendingUp className="h-10 w-10 text-muted-foreground" />} title="Simulação não disponível" description="Avaliações insuficientes para a projeção trienal." />
          )}
        </div>
      )}

      {activeTab === 'pmd' && (
        <div className="space-y-4">
          {pmd ? (
            <>
              <Card className="p-5 border-border bg-status-warning-bg border-status-warning-border">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/60"><GraduationCap className="h-6 w-6 text-[#8D5B00]" /></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Plano de Melhoria de Desempenho (PMD) Ativo</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Instrumento de apoio gerado em razão de nota inferior a 70,00 pontos.</p>
                      </div>
                      <StatusChip label={pmd.status === 'concluido' ? 'Concluído' : 'Em Andamento'} variant={pmd.status === 'concluido' ? 'success' : 'warning'} />
                    </div>
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Prazo do PMD" value={`${pmd.prazo_meses} meses`} subtitle="Período de acompanhamento" icon={<Clock className="h-5 w-5" />} iconBgColor="bg-status-warning-bg text-status-warning" />
                <KpiCard title="Data Limite" value={pmd.data_limite || 'A definir'} subtitle="Prazo máximo para conclusão" icon={<CalendarDays className="h-5 w-5" />} iconBgColor="bg-status-danger-bg text-status-danger" />
                <KpiCard title="Responsável" value="Chefia Imediata" subtitle="Acompanhamento e orientação" icon={<User className="h-5 w-5" />} iconBgColor="bg-status-info-bg text-status-info" statusBadge={<StatusChip label={pmd.status === 'concluido' ? 'Concluído' : 'Em Andamento'} variant={pmd.status === 'concluido' ? 'success' : 'warning'} />} />
              </div>
              <Card className="p-5 border-border space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Diagnóstico de Causas</h4>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border text-sm text-foreground leading-relaxed">{pmd.diagnostico_causas}</div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Ações e Metas de Evolução</h4>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border text-sm text-foreground leading-relaxed">{pmd.acoes_desenvolvimento}</div>
                </div>
                {pmd.observacoes_rh && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Observações da Área de RH</h4>
                    <div className="p-3 bg-status-info-bg rounded-lg border border-status-info-border text-xs text-muted-foreground leading-relaxed">{pmd.observacoes_rh}</div>
                  </div>
                )}
              </Card>
              <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>O PMD não caracteriza punição administrativa, mas é um instrumento de apoio ao desenvolvimento funcional.</span>
              </div>
            </>
          ) : (
            <EmptyState icon={<GraduationCap className="h-10 w-10 text-muted-foreground" />} title="Nenhum PMD ativo" description="Você não possui obrigações de PMD pendentes." />
          )}
        </div>
      )}

      {activeTab === 'recurso' && (
        <div className="space-y-4">
          <Card className="p-4 border-l-4 border-l-amber-500 border-border bg-card">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-status-warning-bg rounded-lg border border-status-warning-border"><ShieldAlert className="h-5 w-5 text-[#8D5B00]" /></div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">Recurso Administrativo à CAD — Arts. 30 e 31</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  O servidor tem direito a interpor recurso administrativo no prazo de <strong className="text-foreground">10 dias úteis</strong> a contar da ciência.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-[10px]"><CalendarDays className="h-3 w-3 mr-1" /> Prazo: 10 dias úteis</Badge>
                  <Badge variant="outline" className="text-[10px]"><Hash className="h-3 w-3 mr-1" /> Contrarrazões: 5 dias úteis</Badge>
                  <Badge variant="outline" className="text-[10px]"><Briefcase className="h-3 w-3 mr-1" /> Julgamento: CAD</Badge>
                </div>
              </div>
            </div>
          </Card>
          {espelho && !espelho.ciencia_servidor_em && (
            <div className="flex items-start gap-3 p-4 bg-status-danger-bg border border-status-danger-border rounded-lg">
              <XCircle className="h-5 w-5 text-status-danger shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-status-danger">Ciência Eletrônica Obrigatória</p>
                <p className="text-xs text-status-danger/80 mt-0.5">Para protocolar um recurso, é necessário primeiro registrar a ciência eletrônica.</p>
              </div>
            </div>
          )}
          {espelho?.pode_recorrer && (
            <Button onClick={() => setModalRecursoOpen(true)} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white" size="sm">
              <ShieldAlert className="h-4 w-4 mr-2" /> Interpor Recurso Administrativo
            </Button>
          )}
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-card">
              <h3 className="text-sm font-bold text-foreground">Histórico de Recursos</h3>
            </div>
            <EmptyState icon={<ScrollText className="h-8 w-8 text-muted-foreground" />} title="Nenhum recurso protocolado" description="Você ainda não interpôs nenhum recurso neste ciclo." />
          </Card>
        </div>
      )}

      <Modal open={modalCienciaOpen} onClose={() => setModalCienciaOpen(false)} title="Assinatura Eletrônica de Ciência (Art. 27)" size="md">
        <div className="space-y-5 py-2 text-xs">
          <div className="flex items-start gap-3 p-3 bg-status-info-bg border border-status-info-border rounded-lg">
            <Info className="h-4 w-4 text-status-info shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">Conforme o Art. 27 da Lei nº 1.704/2006, a ciência digital registra data/hora oficial UTC-3 e endereço IP.</p>
          </div>
          {espelho && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sua nota final</span>
                  <div className="font-mono text-2xl font-black text-foreground mt-0.5">{Number(espelho.nota_final).toFixed(2)} pts</div>
                </div>
                <StatusChip label={espelho.elegivel_progressao ? 'Apto' : 'Abaixo do Corte'} variant={espelho.elegivel_progressao ? 'success' : 'danger'} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="block font-semibold text-foreground">Manifestação do Servidor:</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${tipoCiencia === 'concordancia' ? 'border-status-success-border bg-status-success-bg' : 'border-border bg-muted/10 hover:bg-muted/20'}`}>
                <input type="radio" name="tipoCiencia" checked={tipoCiencia === 'concordancia'} onChange={() => setTipoCiencia('concordancia')} className="accent-emerald-500 mt-0.5" />
                <div><span className="font-bold text-foreground text-sm">Concordância Integral</span><p className="text-muted-foreground mt-0.5">Concordo com os graus e notas atribuídos.</p></div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${tipoCiencia === 'discordancia_recurso' ? 'border-status-warning-border bg-status-warning-bg' : 'border-border bg-muted/10 hover:bg-muted/20'}`}>
                <input type="radio" name="tipoCiencia" checked={tipoCiencia === 'discordancia_recurso'} onChange={() => setTipoCiencia('discordancia_recurso')} className="accent-amber-500 mt-0.5" />
                <div><span className="font-bold text-[#8D5B00] text-sm">Ciência com Discordância</span><p className="text-muted-foreground mt-0.5">Tomo ciência, mas manifesto inconformidade para fins recursais.</p></div>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalCienciaOpen(false)}>Cancelar</Button>
            <Button size="sm" disabled={assinando} onClick={handleAssinarCiencia} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Fingerprint className="h-4 w-4 mr-1.5" /> {assinando ? 'Assinando...' : 'Confirmar Assinatura'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalRecursoOpen} onClose={() => setModalRecursoOpen(false)} title="Interposição de Recurso Administrativo (Art. 30)" size="lg">
        <form onSubmit={handleSubmeterRecurso} className="space-y-5 py-2 text-xs">
          <div className="flex items-start gap-3 p-3 bg-status-warning-bg border border-status-warning-border rounded-lg">
            <AlertTriangle className="h-4 w-4 text-[#8D5B00] shrink-0 mt-0.5" />
            <div className="flex-1"><p className="font-semibold text-[#8D5B00]">Prazos Regimentais</p><p className="text-xs text-muted-foreground mt-1">Prazo de 10 dias úteis para interposição a contar da ciência.</p></div>
          </div>
          <div>
            <label className="block font-semibold text-foreground mb-2">Fatores Contestados:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {espelho?.fatores?.map((f) => (
                <label key={f.codigo} className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors ${fatoresContestados.includes(f.codigo) ? 'border-status-info-border bg-status-info-bg' : 'border-border hover:bg-muted/10'}`}>
                  <input type="checkbox" checked={fatoresContestados.includes(f.codigo)} onChange={(e) => e.target.checked ? setFatoresContestados(p => [...p, f.codigo]) : setFatoresContestados(p => p.filter(c => c !== f.codigo))} className="accent-blue-500" />
                  <span className="font-mono font-bold text-status-info text-[11px]">{f.codigo}</span>
                  <span className="truncate text-foreground">{f.nome}</span>
                  <span className="ml-auto font-mono font-bold text-muted-foreground shrink-0">Grau {f.grau}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block font-semibold text-foreground mb-1.5">Grau Pleiteado (1 a 5):</label>
              <Input type="number" min={1} max={5} value={novoGrauDesejado} onChange={(e) => setNovoGrauDesejado(Number(e.target.value))} className="font-mono" required />
            </div>
            {novoGrauDesejado >= 1 && novoGrauDesejado <= 5 && (
              <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${getGrauBgColor(novoGrauDesejado)} ${getGrauColor(novoGrauDesejado)}`}>{getGrauLabel(novoGrauDesejado)}</div>
            )}
          </div>
          <div>
            <label className="block font-semibold text-foreground mb-1.5">Razões Recursais Fundamentadas: <span className="text-status-danger">*</span></label>
            <textarea rows={5} value={fundamentacaoRecurso} onChange={(e) => setFundamentacaoRecurso(e.target.value)} placeholder="Descreva os motivos da contestação..." required className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalRecursoOpen(false)}>Cancelar</Button>
            <Button size="sm" type="submit" disabled={enviandoRecurso || !fundamentacaoRecurso.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Send className="h-4 w-4 mr-1.5" /> {enviandoRecurso ? 'Protocolando...' : 'Protocolar Recurso'}
            </Button>
          </div>
        </form>
      </Modal>

      {feedback && (
        <Modal open={feedback.open} onClose={() => setFeedback(null)} title={feedback.title} size="sm">
          <div className="space-y-4 py-2">
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-status-success-bg border-status-success-border' : feedback.type === 'warning' ? 'bg-status-warning-bg border-status-warning-border' : 'bg-status-danger-bg border-status-danger-border'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" /> : feedback.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-[#8D5B00] shrink-0" /> : <XCircle className="h-5 w-5 text-status-danger shrink-0" />}
              <p className="text-sm text-foreground leading-relaxed">{feedback.message}</p>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={() => setFeedback(null)}>Fechar</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
};
