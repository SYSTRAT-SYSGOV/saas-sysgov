import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
} from '@sysgov/ui';
import {
  UserCheck,
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
  FileCheck,
  Target,
  Star,
  ChevronRight,
  Info,
  XCircle,
  CalendarDays,
  BarChart3,
  Fingerprint,
  Layers,
  Milestone,
  MessageSquare,
  Percent,
  ArrowUpCircle,
  Search,
  Filter,
  Calendar,
  User,
  Briefcase,
  Hash,
  AlertCircle,
  CircleDot,
  CircleCheck,
  ScrollText,
  PenLine,
  Shield,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiEspelhoAvaliacao,
  ApiDiarioBordo,
  ApiSimulacaoProgressao,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';

const api = new SysgovApi();

type ServidorSubTab = 'espelho' | 'cit' | 'simulador' | 'pmd' | 'recurso';

export interface PortalServidorViewProps {
  portalSelector?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGrauColor(grau: number) {
  if (grau >= 5) return 'text-emerald-400';
  if (grau >= 4) return 'text-cyan-400';
  if (grau >= 3) return 'text-indigo-400';
  if (grau >= 2) return 'text-amber-400';
  return 'text-rose-400';
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
  if (grau >= 5) return 'bg-emerald-950/60 border-emerald-700/50';
  if (grau >= 4) return 'bg-cyan-950/60 border-cyan-700/50';
  if (grau >= 3) return 'bg-indigo-950/60 border-indigo-700/50';
  if (grau >= 2) return 'bg-amber-950/60 border-amber-700/50';
  return 'bg-rose-950/60 border-rose-700/50';
}

function getNotaVariant(nota: number): 'success' | 'warning' | 'danger' {
  if (nota >= 70) return 'success';
  if (nota >= 50) return 'warning';
  return 'danger';
}

function ProgressBar({ value, max = 100, color = 'emerald' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${colorMap[color] || 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── StatCard local (substitui KpiCard com props flexíveis) ──────────────────
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  accentColor?: 'emerald' | 'cyan' | 'indigo' | 'amber' | 'rose';
}
function StatCard({ title, value, icon, description, accentColor = 'cyan' }: StatCardProps) {
  const borderMap: Record<string, string> = {
    emerald: 'border-l-emerald-500',
    cyan: 'border-l-cyan-500',
    indigo: 'border-l-indigo-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
  };
  const iconBgMap: Record<string, string> = {
    emerald: 'bg-emerald-950/50 text-emerald-400',
    cyan: 'bg-cyan-950/50 text-cyan-400',
    indigo: 'bg-indigo-950/50 text-indigo-400',
    amber: 'bg-amber-950/50 text-amber-400',
    rose: 'bg-rose-950/50 text-rose-400',
  };
  return (
    <Card className={`p-4 border-l-4 border-border ${borderMap[accentColor]} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-snug">{title}</span>
        <div className={`p-2 rounded-lg shrink-0 ${iconBgMap[accentColor]}`}>{icon}</div>
      </div>
      <div className="mt-2 font-mono text-lg font-black text-foreground tabular-nums">{value}</div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </Card>
  );
}

function GrauStars({ grau }: { grau: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= grau ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </div>
  );
}

// ─── Component Principal ──────────────────────────────────────────────────────

export const PortalServidorView: React.FC<PortalServidorViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<ServidorSubTab>('espelho');
  const [loading, setLoading] = useState<boolean>(true);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [simulacao, setSimulacao] = useState<ApiSimulacaoProgressao | null>(null);
  const [pmd, setPmd] = useState<any | null>(null);

  // Filtros do CIT
  const [filtroCitBusca, setFiltroCitBusca] = useState('');
  const [filtroCitTipo, setFiltroCitTipo] = useState<'todos' | 'positivo' | 'negativo'>('todos');

  // Modal de Assinatura Eletrônica / Ciência
  const [modalCienciaOpen, setModalCienciaOpen] = useState<boolean>(false);
  const [tipoCiencia, setTipoCiencia] = useState<'concordancia' | 'discordancia_recurso'>('concordancia');
  const [observacoesCiencia, setObservacoesCiencia] = useState<string>('');
  const [assinando, setAssinando] = useState<boolean>(false);

  // Modal de Recurso Administrativo
  const [modalRecursoOpen, setModalRecursoOpen] = useState<boolean>(false);
  const [fatoresContestados, setFatoresContestados] = useState<string[]>([]);
  const [fundamentacaoRecurso, setFundamentacaoRecurso] = useState<string>('');
  const [novoGrauDesejado, setNovoGrauDesejado] = useState<number>(4);
  const [enviandoRecurso, setEnviandoRecurso] = useState<boolean>(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosServidor = useCallback(async () => {
    setLoading(true);
    try {
      const listaAv = await api.capd.listAvaliacoes();
      const avAtual = listaAv.data?.[0];

      if (avAtual) {
        const [esp, resCit, sim, listaPmd] = await Promise.all([
          api.capd.obterEspelhoAvaliacao(avAtual.id).catch(() => null),
          api.capd.listDiarioBordo({ servidor_id: avAtual.servidor_id }).catch(() => ({ data: [] })),
          api.capd.simularProgressao(avAtual.servidor_id).catch(() => null),
          api.capd.listPmds({ servidor_id: avAtual.servidor_id }).catch(() => ({ data: [] })),
        ]);

        setEspelho(esp);
        setIncidentes(resCit.data || []);
        setSimulacao(sim);
        setPmd(listaPmd.data?.[0] || null);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do portal do servidor:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosServidor();
  }, [carregarDadosServidor]);

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter((inc) => {
      const matchTipo = filtroCitTipo === 'todos' || inc.tipo === filtroCitTipo;
      const matchBusca =
        !filtroCitBusca ||
        inc.descricao_fato?.toLowerCase().includes(filtroCitBusca.toLowerCase()) ||
        inc.fator?.nome?.toLowerCase().includes(filtroCitBusca.toLowerCase());
      return matchTipo && matchBusca;
    });
  }, [incidentes, filtroCitTipo, filtroCitBusca]);

  const incidentesPositivos = useMemo(() => incidentes.filter((i) => i.tipo === 'positivo'), [incidentes]);
  const incidentesNegativos = useMemo(() => incidentes.filter((i) => i.tipo !== 'positivo'), [incidentes]);

  const handleAssinarCiencia = async () => {
    if (!espelho) return;
    setAssinando(true);
    try {
      const res = await api.capd.registrarCiencia(espelho.avaliacao_id, {
        tipo: tipoCiencia,
        observacoes: observacoesCiencia,
      });
      setModalCienciaOpen(false);
      await carregarDadosServidor();
      setFeedback({
        open: true,
        type: 'success',
        title: 'Ciência Eletrônica Registrada',
        message: `Sua assinatura digital foi protocolada com sucesso com registro de data/hora oficial UTC-3 e endereço IP. Hash SHA-256: ${res.hash_sha256.substring(0, 16)}...`,
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Ciência',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar assinatura.',
      });
    } finally {
      setAssinando(false);
    }
  };

  const handleSubmeterRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espelho) return;
    setEnviandoRecurso(true);
    try {
      await api.capd.createRecurso({
        avaliacao_id: espelho.avaliacao_id,
        fator_contestado_id: 1,
        justificativa_servidor: `[Fatores: ${fatoresContestados.join(', ') || 'Geral'}] ${fundamentacaoRecurso}`,
      });
      setModalRecursoOpen(false);
      setFundamentacaoRecurso('');
      await carregarDadosServidor();
      setFeedback({
        open: true,
        type: 'success',
        title: 'Recurso Administrativo Protocolado',
        message: 'Seu recurso foi encaminhado com sucesso à chefia imediata para manifestação de contrarrazões em até 5 dias úteis, seguindo posterior julgamento da CAD.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro no Protocolo de Recurso',
        message: err?.response?.data?.message || err?.message || 'Não foi possível protocolar o recurso.',
      });
    } finally {
      setEnviandoRecurso(false);
    }
  };

  const subTabItems: TabsItem<ServidorSubTab>[] = [
    { key: 'espelho', label: 'Espelho da Avaliação', icon: <FileText className="h-4 w-4" /> },
    { key: 'cit', label: 'Diário de Bordo', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length || undefined },
    { key: 'simulador', label: 'Simulador de Progressão', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'pmd', label: 'Plano de Melhoria (PMD)', icon: <GraduationCap className="h-4 w-4" />, badge: pmd ? 1 : undefined },
    { key: 'recurso', label: 'Meu Recurso', icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  if (loading && !espelho) {
    return <ScreenState type="loading" title="Carregando portal do servidor avaliado..." />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Portal do Servidor Avaliado"
        subtitle="Consulta ao espelho funcional de desempenho, ciência eletrônica, incidentes críticos e simulação de progressão"
        badge="Área do Servidor"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {portalSelector}
            {espelho && !espelho.ciencia_servidor_em && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setModalCienciaOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Fingerprint className="h-4 w-4 mr-1.5" />
                Assinar Ciência Digital
              </Button>
            )}
            {espelho && espelho.pode_recorrer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalRecursoOpen(true)}
                className="border-amber-600/50 text-amber-400 hover:bg-amber-950/40"
              >
                <ShieldAlert className="h-4 w-4 mr-1.5" />
                Interpor Recurso (Art. 30)
              </Button>
            )}
          </div>
        }
      />

      {/* ── Banner de status de ciência pendente ──────────────────────────── */}
      {espelho && !espelho.ciencia_servidor_em && (
        <div className="flex items-start gap-3 p-4 bg-amber-950/40 border border-amber-700/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Ciência Eletrônica Pendente</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Você ainda não assinou a ciência do resultado desta avaliação. A ciência é obrigatória nos termos do Art. 27 da Lei nº 1.704/2006. O prazo para interposição de recurso só conta a partir da data da ciência.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setModalCienciaOpen(true)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs"
          >
            Assinar Agora
          </Button>
        </div>
      )}

      {/* ── Sub-abas ───────────────────────────────────────────────────────── */}
      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ══════════════════════════════════════════════════════════════════════
          ABA 1 — ESPELHO DA AVALIAÇÃO
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'espelho' && (
        <div className="space-y-6">
          {espelho ? (
            <>
              {/* KPI Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title="Nota Final do Ciclo (Nc)"
                  value={`${Number(espelho.nota_final).toFixed(2)} pts`}
                  icon={<Award className="h-5 w-5" />}
                  description={espelho.elegivel_progressao ? 'Acima do corte (≥ 70 pts)' : 'Abaixo do corte (< 70 pts)'}
                  accentColor={espelho.elegivel_progressao ? 'emerald' : 'rose'}
                />
                <StatCard
                  title="Ciclo de Referência"
                  value={espelho.ciclo?.ano_referencia?.toString() || 'Vigente'}
                  icon={<CalendarDays className="h-5 w-5" />}
                  description={espelho.ciclo?.nome || 'Ciclo Anual de Avaliação'}
                  accentColor="cyan"
                />
                <StatCard
                  title="Devolutiva Presencial"
                  value={espelho.devolutiva_realizada ? 'Realizada' : 'Pendente'}
                  icon={<MessageSquare className="h-5 w-5" />}
                  description={`Gestor: ${espelho.avaliador?.nome || 'Chefia Imediata'}`}
                  accentColor={espelho.devolutiva_realizada ? 'emerald' : 'amber'}
                />
                <StatCard
                  title="Ciência Eletrônica"
                  value={espelho.ciencia_servidor_em ? 'Assinada' : 'Pendente'}
                  icon={<Fingerprint className="h-5 w-5" />}
                  description={
                    espelho.ciencia_servidor_em
                      ? `Em ${new Date(espelho.ciencia_servidor_em).toLocaleDateString('pt-BR')}`
                      : espelho.ciencia_tipo
                      ? `Tipo: ${espelho.ciencia_tipo}`
                      : 'Aguardando assinatura digital'
                  }
                  accentColor={espelho.ciencia_servidor_em ? 'emerald' : 'rose'}
                />
              </div>

              {/* Elegibilidade e barra de progresso */}
              <Card className="p-5 border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Elegibilidade à Progressão Funcional (Art. 16)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Nota de corte: <span className="font-mono font-bold text-foreground">70,00 pontos</span> — A NFC trienal é calculada pela média das 3 avaliações anuais do triênio.
                    </p>
                  </div>
                  <StatusChip
                    label={espelho.elegivel_progressao ? 'Apto à Progressão' : 'Abaixo do Corte — PMD Ativo'}
                    variant={espelho.elegivel_progressao ? 'success' : 'danger'}
                  />
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>0 pts</span>
                    <span className="text-foreground font-bold">{Number(espelho.nota_final).toFixed(2)} pts</span>
                    <span>100 pts</span>
                  </div>
                  <div className="relative">
                    <ProgressBar
                      value={Number(espelho.nota_final)}
                      max={100}
                      color={espelho.elegivel_progressao ? 'emerald' : 'rose'}
                    />
                    {/* Marcador de corte */}
                    <div
                      className="absolute top-0 -translate-x-1/2 h-1.5 w-0.5 bg-amber-400"
                      style={{ left: '70%' }}
                    />
                  </div>
                  <div className="text-[10px] text-amber-400 text-right font-mono">← Corte: 70,00 pts</div>
                </div>
              </Card>

              {/* Parecer do Avaliador */}
              {espelho.parecer_avaliador && (
                <Card className="p-5 border-border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-950/50 rounded-lg border border-indigo-700/30 shrink-0">
                      <ScrollText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Parecer Descritivo do Gestor
                      </h4>
                      <blockquote className="text-sm text-foreground leading-relaxed italic border-l-2 border-indigo-500/50 pl-4">
                        "{espelho.parecer_avaliador}"
                      </blockquote>
                      {espelho.devolutiva_resumo && (
                        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                          <strong className="text-foreground">Acordos da Devolutiva Presencial:</strong>{' '}
                          {espelho.devolutiva_resumo}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Tabela dos Fatores Avaliados */}
              <Card className="gap-0 py-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Fatores Funcionais — Escala Gráfica de Chiavenato
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      8 fatores avaliados com graus de 1 a 5 e pesos percentuais calibrados
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {espelho.fatores?.length || 0} fatores
                  </Badge>
                </div>

                <div className="divide-y divide-border">
                  {espelho.fatores?.map((f, idx) => (
                    <div
                      key={f.codigo}
                      className="p-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Numeração e nome */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-muted-foreground">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                                {f.codigo}
                              </span>
                              <span className="font-semibold text-sm text-foreground">{f.nome}</span>
                            </div>
                            {f.descricao && (
                              <p className="text-xs text-muted-foreground leading-relaxed">{f.descricao}</p>
                            )}
                            {f.justificativa && (
                              <div className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/50 mt-1.5 flex gap-2">
                                <PenLine className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                                <span>
                                  <strong className="text-foreground not-italic">Justificativa:</strong>{' '}
                                  {f.justificativa}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Métricas */}
                        <div className="flex items-center gap-6 shrink-0 md:pl-4">
                          {f.grau != null && (
                            <div className={`text-center p-2.5 rounded-lg border ${getGrauBgColor(f.grau)}`}>
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Grau</span>
                              <span className={`font-mono text-xl font-black ${getGrauColor(f.grau)}`}>
                                {f.grau}
                              </span>
                              <GrauStars grau={f.grau} />
                              <span className="text-[9px] text-muted-foreground mt-0.5 block">
                                {getGrauLabel(f.grau)}
                              </span>
                            </div>
                          )}
                          <div className="text-center">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Peso</span>
                            <span className="font-mono text-sm font-semibold text-foreground">{f.peso}%</span>
                          </div>
                          <div className="text-center min-w-[60px]">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nota</span>
                            <span className="font-mono text-lg font-black text-primary tabular-nums">
                              {Number(f.nota).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de progresso do fator */}
                      <div className="mt-3 pl-11">
                        <ProgressBar
                          value={Number(f.nota)}
                          max={100}
                          color={Number(f.nota) >= 70 ? 'emerald' : Number(f.nota) >= 50 ? 'amber' : 'rose'}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rodapé com total */}
                <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Soma dos pesos: {espelho.fatores?.reduce((s, f) => s + f.peso, 0)}% • {espelho.fatores?.length} fatores avaliados
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">NOTA FINAL:</span>
                    <span className="font-mono text-xl font-black text-primary tabular-nums">
                      {Number(espelho.nota_final).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Linha do Tempo de Status */}
              <Card className="p-5 border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                  <Milestone className="h-4 w-4 text-primary" />
                  Linha do Tempo — Status do Processo Avaliativo
                </h4>
                <div className="flex flex-col sm:flex-row gap-0">
                  {[
                    {
                      label: 'Avaliação Concluída',
                      done: true,
                      icon: <CheckCircle2 className="h-5 w-5" />,
                      color: 'emerald',
                    },
                    {
                      label: 'Devolutiva Presencial',
                      done: espelho.devolutiva_realizada,
                      icon: <MessageSquare className="h-5 w-5" />,
                      color: espelho.devolutiva_realizada ? 'emerald' : 'amber',
                    },
                    {
                      label: 'Ciência Eletrônica',
                      done: !!espelho.ciencia_servidor_em,
                      icon: <Fingerprint className="h-5 w-5" />,
                      color: espelho.ciencia_servidor_em ? 'emerald' : 'amber',
                    },
                    {
                      label: 'Prazo Recursal',
                      done: !espelho.pode_recorrer,
                      icon: <ShieldAlert className="h-5 w-5" />,
                      color: 'indigo',
                    },
                    {
                      label: 'Resultado Definitivo',
                      done: !espelho.pode_recorrer && !!espelho.ciencia_servidor_em,
                      icon: <Award className="h-5 w-5" />,
                      color: 'cyan',
                    },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex sm:flex-col flex-1 items-center sm:items-start gap-3 sm:gap-0">
                      <div className="flex sm:flex-row items-center w-full">
                        {/* Ícone */}
                        <div
                          className={`shrink-0 p-2 rounded-full border-2 z-10 ${
                            step.done
                              ? `bg-${step.color}-600 border-${step.color}-500 text-white`
                              : 'bg-slate-800 border-slate-600 text-slate-500'
                          }`}
                        >
                          {step.icon}
                        </div>
                        {/* Linha conectora */}
                        {i < arr.length - 1 && (
                          <div className="hidden sm:block h-0.5 flex-1 bg-slate-700 mx-2" />
                        )}
                      </div>
                      <div className="sm:mt-2 text-left sm:text-center">
                        <p className={`text-xs font-semibold ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {step.done ? 'Concluído' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<FileText className="h-10 w-10 text-muted-foreground" />}
              title="Nenhuma avaliação concluída encontrada"
              description="Sua avaliação deste ciclo ainda está em fase de processamento pela chefia imediata."
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA 2 — DIÁRIO DE BORDO (CIT)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cit' && (
        <div className="space-y-4">
          {/* KPIs do CIT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total de Registros"
              value={incidentes.length.toString()}
              icon={<BookOpen className="h-5 w-5" />}
              description="Todos os apontamentos do período"
              accentColor="cyan"
            />
            <StatCard
              title="Fatos Positivos"
              value={incidentesPositivos.length.toString()}
              icon={<CircleCheck className="h-5 w-5" />}
              description="Desempenhos exemplares registrados"
              accentColor="emerald"
            />
            <StatCard
              title="Pontos a Desenvolver"
              value={incidentesNegativos.length.toString()}
              icon={<AlertCircle className="h-5 w-5" />}
              description="Oportunidades de melhoria registradas"
              accentColor="amber"
            />
          </div>

          {/* Cabeçalho informativo */}
          <Card className="p-4 border-border bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-700/30">
                <BookOpen className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Diário de Bordo — Técnica do Incidente Crítico (Art. 24)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fatos observáveis, desempenhos exemplares e pontos a desenvolver registrados pela chefia imediata ao longo do período avaliativo. Estes registros fundamentam a pontuação atribuída na Escala Gráfica.
                </p>
              </div>
            </div>
          </Card>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por fato ou fator..."
                value={filtroCitBusca}
                onChange={(e) => setFiltroCitBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {(['todos', 'positivo', 'negativo'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroCitTipo(tipo)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                    filtroCitTipo === tipo
                      ? tipo === 'positivo'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : tipo === 'negativo'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/20'
                  }`}
                >
                  {tipo === 'todos' ? 'Todos' : tipo === 'positivo' ? 'Positivos' : 'A Desenvolver'}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {incidentesFiltrados.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum registro encontrado"
              description="Não constam registros de incidentes críticos neste período ou com o filtro aplicado."
            />
          ) : (
            <div className="relative border-l-2 border-slate-700/50 ml-4 space-y-4 py-2">
              {incidentesFiltrados.map((inc) => (
                <div key={inc.id} className="relative pl-6">
                  {/* Marcador timeline */}
                  <div
                    className={`absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 border-background ${
                      inc.tipo === 'positivo' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />

                  <Card className="p-4 border-border hover:border-muted-foreground/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={inc.tipo === 'positivo' ? 'success' : 'outline'}
                          className="text-[10px] font-bold uppercase"
                        >
                          {inc.tipo === 'positivo' ? (
                            <>
                              <CircleCheck className="h-3 w-3 mr-1" />
                              Fato Positivo
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Ponto a Desenvolver
                            </>
                          )}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">
                          {inc.fator?.nome || `Fator #${inc.fator_id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Calendar className="h-3 w-3" />
                        {new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">{inc.descricao_fato}</p>

                    {inc.evidencias && inc.evidencias.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/40">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                          Evidências Anexadas ({inc.evidencias.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {inc.evidencias.map((ev) => (
                            <a
                              key={ev.id}
                              href={ev.url_armazenamento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline font-mono px-2 py-1 bg-primary/10 rounded border border-primary/20"
                            >
                              <Download className="h-3 w-3" />
                              {ev.nome_arquivo}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé informativo */}
          {incidentes.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-3 bg-muted/10 rounded-lg border border-border">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                Exibindo {incidentesFiltrados.length} de {incidentes.length} registro(s). Os registros do Diário de Bordo são gerados exclusivamente pela chefia imediata e têm caráter fundamentador da avaliação.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA 3 — SIMULADOR DE PROGRESSÃO
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'simulador' && (
        <div className="space-y-6">
          {simulacao ? (
            <>
              {/* KPIs principais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="NFC Trienal Projetada"
                  value={`${Number(simulacao.nfc_projetada).toFixed(2)} pts`}
                  icon={<BarChart3 className="h-5 w-5" />}
                  description="Média aritmética dos 3 ciclos anuais"
                  accentColor="indigo"
                />
                <StatCard
                  title="Elegibilidade Regimental"
                  value={simulacao.elegivel_progressao ? 'APTO' : 'INAPTO'}
                  icon={<Target className="h-5 w-5" />}
                  description="Corte legal: 70,00 pontos (Art. 16)"
                  accentColor={simulacao.elegivel_progressao ? 'emerald' : 'rose'}
                />
                <StatCard
                  title="Impacto Salarial Total"
                  value={`+${simulacao.percentual_total_aumento?.toFixed(1) || '0.0'}%`}
                  icon={<ArrowUpCircle className="h-5 w-5" />}
                  description="Progressão horizontal + quinquênios"
                  accentColor="emerald"
                />
              </div>

              {/* Status de elegibilidade com detalhes */}
              <Card className={`p-5 border-border ${simulacao.elegivel_progressao ? 'bg-emerald-950/30 border-emerald-700/40' : 'bg-rose-950/30 border-rose-700/40'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${simulacao.elegivel_progressao ? 'bg-emerald-900/60' : 'bg-rose-900/60'}`}>
                    {simulacao.elegivel_progressao ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base font-bold ${simulacao.elegivel_progressao ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {simulacao.elegivel_progressao
                        ? 'Servidor Apto à Progressão Horizontal (+10%)'
                        : 'Servidor Inapto — NFC Abaixo do Corte'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {simulacao.elegivel_progressao
                        ? 'A NFC trienal calculada supera o mínimo legal de 70,00 pontos, conferindo direito à progressão horizontal de 10% sobre o vencimento-base, além dos quinquênios adquiridos (Art. 16 c/c Art. 17 da Lei nº 1.704/2006).'
                        : 'A NFC trienal calculada está abaixo do mínimo legal de 70,00 pontos. Será elaborado um Plano de Melhoria de Desempenho (PMD) para o próximo triênio.'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Detalhamento dos Quinquênios */}
              <Card className="p-5 border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Quinquênios e Adicional por Tempo de Serviço (Art. 17)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Quinquênios Adquiridos</span>
                    <div className="font-mono font-black text-3xl text-foreground mt-1">
                      {simulacao.quinquenios?.qtd_quinquenios || 0}
                    </div>
                    <span className="text-xs text-muted-foreground">períodos de 5 anos</span>
                  </div>
                  <div className="p-4 bg-emerald-950/30 rounded-lg border border-emerald-700/30 text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Adicional sobre o Básico</span>
                    <div className="font-mono font-black text-3xl text-emerald-400 mt-1">
                      +{simulacao.quinquenios?.percentual_total?.toFixed(1) || '0.0'}%
                    </div>
                    <span className="text-xs text-muted-foreground">sobre o vencimento-base</span>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Próximo Quinquênio</span>
                    <div className="font-mono font-bold text-base text-foreground mt-1">
                      {simulacao.quinquenios?.proximo_em || 'Em apuração'}
                    </div>
                    <span className="text-xs text-muted-foreground">data prevista</span>
                  </div>
                </div>
              </Card>

              {/* Histórico dos Ciclos com visualização de barras */}
              <Card className="gap-0 py-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h4 className="text-sm font-bold text-foreground">Histórico de Notas Anuais — Triênio Atual</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    As 3 notas anuais do triênio compõem a NFC pela média aritmética simples.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  {simulacao.historico_ciclos?.map((h, idx) => {
                    const nota = Number(h.nota);
                    const color = nota >= 70 ? 'emerald' : nota >= 50 ? 'amber' : 'rose';
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-primary px-2 py-1 bg-primary/10 rounded">
                              Ano {idx + 1}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {h.ano ? `(${h.ano})` : ''} Ciclo #{h.ciclo_id}
                            </span>
                          </div>
                          <span className={`font-mono font-black text-lg tabular-nums ${
                            color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {nota.toFixed(2)} pts
                          </span>
                        </div>
                        <ProgressBar value={nota} max={100} color={color} />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0</span>
                          <span className="text-amber-400">corte: 70</span>
                          <span>100</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Linha de média */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      Média (NFC Trienal):
                    </span>
                    <span className="font-mono font-black text-xl text-primary tabular-nums">
                      {Number(simulacao.nfc_projetada).toFixed(2)} pts
                    </span>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-10 w-10 text-muted-foreground" />}
              title="Simulação não disponível"
              description="Não foram encontradas avaliações suficientes para calcular a projeção trienal de progressão."
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA 4 — PLANO DE MELHORIA DE DESEMPENHO (PMD)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pmd' && (
        <div className="space-y-4">
          {pmd ? (
            <>
              {/* Header do PMD */}
              <Card className="p-5 border-border bg-amber-950/20 border-amber-700/40">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-900/60">
                    <GraduationCap className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Plano de Melhoria de Desempenho (PMD) Ativo
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Instrumento de apoio institucional gerado em razão de nota inferior a 70,00 pontos (RF-09 do Regulamento Funcional).
                        </p>
                      </div>
                      <StatusChip
                        label={pmd.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
                        variant={pmd.status === 'concluido' ? 'success' : 'warning'}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Prazos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Prazo do PMD"
                  value={`${pmd.prazo_meses} meses`}
                  icon={<Clock className="h-5 w-5" />}
                  description="Período de acompanhamento"
                  accentColor="amber"
                />
                <StatCard
                  title="Data Limite"
                  value={pmd.data_limite || 'A definir'}
                  icon={<CalendarDays className="h-5 w-5" />}
                  description="Prazo máximo para conclusão"
                  accentColor="rose"
                />
                <StatCard
                  title="Responsável"
                  value="Chefia Imediata"
                  icon={<User className="h-5 w-5" />}
                  description="Acompanhamento e orientação"
                  accentColor="cyan"
                />
              </div>

              {/* Conteúdo do PMD */}
              <Card className="p-5 border-border space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    Diagnóstico de Causas
                  </h4>
                  <div className="p-3 bg-muted/20 rounded-lg border border-border text-sm text-foreground leading-relaxed">
                    {pmd.diagnostico_causas}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    Ações e Metas de Evolução
                  </h4>
                  <div className="p-3 bg-muted/20 rounded-lg border border-border text-sm text-foreground leading-relaxed">
                    {pmd.acoes_desenvolvimento}
                  </div>
                </div>

                {pmd.observacoes_rh && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Observações da Área de RH
                    </h4>
                    <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-700/30 text-xs text-muted-foreground leading-relaxed">
                      {pmd.observacoes_rh}
                    </div>
                  </div>
                )}
              </Card>

              {/* Aviso legal */}
              <div className="flex items-start gap-3 p-4 bg-muted/10 rounded-lg border border-border text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  O PMD não caracteriza punição administrativa, mas é um instrumento de apoio ao desenvolvimento funcional. O servidor que não atingir os objetivos após o período do PMD será submetido a nova avaliação especial (Art. 20 da Lei nº 1.704/2006).
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<GraduationCap className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum Plano de Melhoria de Desempenho ativo"
              description="Você não possui obrigações de PMD pendentes. Seu desempenho atende aos padrões regimentais exigidos para o triênio atual."
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA 5 — MEU RECURSO
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recurso' && (
        <div className="space-y-4">
          {/* Informações sobre o recurso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-amber-500 border-border bg-card col-span-1 sm:col-span-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-950/50 rounded-lg border border-amber-700/30">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Recurso Administrativo à CAD — Arts. 30 e 31</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    O servidor avaliado tem direito a interpor recurso administrativo junto à Comissão de Avaliação de Desempenho (CAD) no prazo de <strong className="text-foreground">10 (dez) dias úteis</strong> a contar da data da ciência eletrônica. A chefia imediata terá 5 dias úteis para apresentar contrarrazões. A CAD julgará soberanamente em sessão colegiada.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px]">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      Prazo: 10 dias úteis
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Hash className="h-3 w-3 mr-1" />
                      Contrarrazões: 5 dias úteis
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Julgamento: CAD (Colegiado)
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Pré-requisito: ciência */}
          {espelho && !espelho.ciencia_servidor_em && (
            <div className="flex items-start gap-3 p-4 bg-rose-950/30 border border-rose-700/40 rounded-lg">
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Ciência Eletrônica Obrigatória</p>
                <p className="text-xs text-rose-400/80 mt-0.5">
                  Para protocolar um recurso administrativo, é necessário primeiro registrar a ciência eletrônica do resultado da avaliação. O prazo recursal de 10 dias úteis só começa a contar a partir da data da ciência.
                </p>
              </div>
            </div>
          )}

          {/* Botão de interpor recurso */}
          {espelho?.pode_recorrer && (
            <Button
              onClick={() => setModalRecursoOpen(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              Interpor Recurso Administrativo (Art. 30)
            </Button>
          )}

          {/* Histórico de recursos */}
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Histórico de Recursos Administrativos</h3>
            </div>
            <EmptyState
              icon={<ScrollText className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum recurso protocolado"
              description="Você ainda não interpôs nenhum recurso administrativo neste ciclo avaliativo."
            />
          </Card>
        </div>
      )}

      {/* ── MODAL: Assinatura Eletrônica de Ciência (Art. 27) ─────────────── */}
      <Modal
        open={modalCienciaOpen}
        onClose={() => setModalCienciaOpen(false)}
        title="Assinatura Eletrônica de Ciência (Art. 27)"
        size="md"
      >
        <div className="space-y-5 py-2 text-xs">
          {/* Aviso legal */}
          <div className="flex items-start gap-3 p-3 bg-indigo-950/40 border border-indigo-700/40 rounded-lg">
            <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              Conforme o <strong className="text-foreground">Art. 27 da Lei nº 1.704/2006</strong>, o resultado da avaliação se torna plenamente eficaz após a ciência digital do servidor, com registro do endereço IP, geolocalização e data/hora oficial UTC-3 (Brasília).
            </p>
          </div>

          {/* Resultado que está sendo assinado */}
          {espelho && (
            <div className="p-3 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sua nota final neste ciclo</span>
                  <div className="font-mono text-2xl font-black text-primary mt-0.5">
                    {Number(espelho.nota_final).toFixed(2)} pts
                  </div>
                </div>
                <StatusChip
                  label={espelho.elegivel_progressao ? 'Apto à Progressão' : 'Abaixo do Corte'}
                  variant={espelho.elegivel_progressao ? 'success' : 'danger'}
                />
              </div>
            </div>
          )}

          {/* Opção de manifestação */}
          <div className="space-y-2">
            <label className="block font-semibold text-foreground">Manifestação do Servidor:</label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  tipoCiencia === 'concordancia'
                    ? 'border-emerald-600 bg-emerald-950/30'
                    : 'border-border bg-muted/10 hover:bg-muted/20'
                }`}
              >
                <input
                  type="radio"
                  name="tipoCiencia"
                  checked={tipoCiencia === 'concordancia'}
                  onChange={() => setTipoCiencia('concordancia')}
                  className="accent-primary mt-0.5"
                />
                <div>
                  <span className="font-bold text-foreground text-sm">Concordância Integral</span>
                  <p className="text-muted-foreground mt-0.5">
                    Concordo com os graus e notas atribuídos pela chefia imediata. Não tenho interesse em interpor recurso administrativo.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  tipoCiencia === 'discordancia_recurso'
                    ? 'border-amber-600 bg-amber-950/30'
                    : 'border-border bg-muted/10 hover:bg-muted/20'
                }`}
              >
                <input
                  type="radio"
                  name="tipoCiencia"
                  checked={tipoCiencia === 'discordancia_recurso'}
                  onChange={() => setTipoCiencia('discordancia_recurso')}
                  className="accent-primary mt-0.5"
                />
                <div>
                  <span className="font-bold text-amber-400 text-sm">Ciência com Discordância (Para Fins Recursais)</span>
                  <p className="text-muted-foreground mt-0.5">
                    Tomo ciência do resultado, mas manifesto inconformidade e pretendo interpor recurso administrativo junto à CAD no prazo de 10 dias úteis.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              Observações do Servidor{' '}
              <span className="text-muted-foreground font-normal">(Opcional)</span>:
            </label>
            <textarea
              rows={3}
              value={observacoesCiencia}
              onChange={(e) => setObservacoesCiencia(e.target.value)}
              placeholder="Digite eventuais considerações sobre a entrevista devolutiva ou o processo avaliativo..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalCienciaOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={assinando}
              onClick={handleAssinarCiencia}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Fingerprint className="h-4 w-4 mr-1.5" />
              {assinando ? 'Assinando Digitalmente...' : 'Confirmar Assinatura Digital'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Interposição de Recurso Administrativo (Arts. 30 e 31) ── */}
      <Modal
        open={modalRecursoOpen}
        onClose={() => setModalRecursoOpen(false)}
        title="Interposição de Recurso Administrativo à CAD (Art. 30)"
        size="lg"
      >
        <form onSubmit={handleSubmeterRecurso} className="space-y-5 py-2 text-xs">
          {/* Alerta de prazo */}
          <div className="flex items-start gap-3 p-3 bg-amber-950/40 border border-amber-700/40 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Prazos Regimentais (Art. 30 e 31)</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>• Servidor: <strong className="text-foreground">10 dias úteis</strong> para interpor o recurso a partir da ciência</li>
                <li>• Chefia: <strong className="text-foreground">5 dias úteis</strong> para apresentar contrarrazões</li>
                <li>• CAD: <strong className="text-foreground">Julgamento soberano</strong> em sessão colegiada</li>
              </ul>
            </div>
          </div>

          {/* Fatores contestados */}
          <div>
            <label className="block font-semibold text-foreground mb-2">
              Fatores da Escala Gráfica Contestados:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {espelho?.fatores?.map((f) => (
                <label
                  key={f.codigo}
                  className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                    fatoresContestados.includes(f.codigo)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fatoresContestados.includes(f.codigo)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFatoresContestados((prev) => [...prev, f.codigo]);
                      } else {
                        setFatoresContestados((prev) => prev.filter((c) => c !== f.codigo));
                      }
                    }}
                    className="accent-primary"
                  />
                  <span className="font-mono font-bold text-primary text-[11px]">{f.codigo}</span>
                  <span className="truncate text-foreground">{f.nome}</span>
                  <span className="ml-auto font-mono font-bold text-muted-foreground shrink-0">
                    Grau {f.grau}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Grau pleiteado */}
          <div className="flex items-end gap-4">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Grau Pleiteado (1 a 5):
              </label>
              <Input
                type="number"
                min={1}
                max={5}
                value={novoGrauDesejado}
                onChange={(e) => setNovoGrauDesejado(Number(e.target.value))}
                className="font-mono w-24"
                required
              />
            </div>
            {novoGrauDesejado >= 1 && novoGrauDesejado <= 5 && (
              <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${getGrauBgColor(novoGrauDesejado)} ${getGrauColor(novoGrauDesejado)}`}>
                {getGrauLabel(novoGrauDesejado)}
              </div>
            )}
          </div>

          {/* Fundamentação */}
          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              Razões Recursais Fundamentadas: <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={5}
              value={fundamentacaoRecurso}
              onChange={(e) => setFundamentacaoRecurso(e.target.value)}
              placeholder="Descreva de forma clara e objetiva os motivos pelos quais a pontuação atribuída deve ser revista, indicando contraprovas, fatos observáveis e evidências documentais que fundamentam o pedido..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {fundamentacaoRecurso.length} caracteres — Seja objetivo e indique fatos concretos.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalRecursoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={enviandoRecurso || !fundamentacaoRecurso.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {enviandoRecurso ? 'Protocolando...' : 'Protocolar Recurso Administrativo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Feedback ────────────────────────────────────────────────── */}
      {feedback && (
        <Modal
          open={feedback.open}
          onClose={() => setFeedback(null)}
          title={feedback.title}
          size="sm"
        >
          <div className="space-y-4 py-2">
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-700/40'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-700/40'
                  : 'bg-rose-950/40 border-rose-700/40'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : feedback.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              <p className="text-sm text-foreground leading-relaxed">{feedback.message}</p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
