import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  ChevronRight,
  Download,
  DollarSign,
  FileCheck,
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

type ServidorSubTab = 'espelho' | 'cit' | 'recurso' | 'simulador' | 'pmd';

export const PortalServidorView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ServidorSubTab>('espelho');
  const [loading, setLoading] = useState<boolean>(true);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [simulacao, setSimulacao] = useState<ApiSimulacaoProgressao | null>(null);
  const [pmd, setPmd] = useState<any | null>(null);

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

  // Alerta de feedback
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosServidor = useCallback(async () => {
    setLoading(true);
    try {
      // Busca avaliações do servidor autenticado
      const listaAv = await api.capd.listAvaliacoes();
      const avAtual = listaAv.data?.[0];

      if (avAtual) {
        // Carrega espelho detalhado
        const esp = await api.capd.obterEspelhoAvaliacao(avAtual.id).catch(() => null);
        setEspelho(esp);

        // Carrega incidentes do CIT
        const resCit = await api.capd.listDiarioBordo({ servidor_id: avAtual.servidor_id }).catch(() => ({ data: [] }));
        setIncidentes(resCit.data || []);

        // Carrega simulação de progressão
        const sim = await api.capd.simularProgressao(avAtual.servidor_id).catch(() => null);
        setSimulacao(sim);

        // Carrega PMD se houver
        const listaPmd = await api.capd.listPmds({ servidor_id: avAtual.servidor_id }).catch(() => ({ data: [] }));
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
        message: `Sua assinatura digital foi protocolada com sucesso com registro de data/hora oficial UTC-3 e endereço IP. Assinatura Hash: ${res.hash_sha256.substring(0, 16)}...`,
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
    { key: 'cit', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length },
    { key: 'simulador', label: 'Simulador de Progressão', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'pmd', label: 'Plano de Melhoria (PMD)', icon: <GraduationCap className="h-4 w-4" />, badge: pmd ? 1 : undefined },
  ];

  if (loading) {
    return <ScreenState type="loading" title="Carregando portal do servidor avaliado..." />;
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho do Portal do Servidor ───────────────────────────── */}
      <PageHeader
        title="Portal do Servidor Avaliado"
        subtitle="Consulta ao espelho funcional de desempenho, ciência eletrônica, linha do tempo CIT e simulação de progressão"
        badge="Área do Servidor"
        actions={
          <div className="flex items-center gap-2">
            {espelho && !espelho.ciencia_servidor_em && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setModalCienciaOpen(true)}
              >
                <FileCheck className="h-4 w-4 mr-1.5" />
                Assinar Ciência Digital
              </Button>
            )}

            {espelho && espelho.pode_recorrer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalRecursoOpen(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
                Interpor Recurso (Art. 30)
              </Button>
            )}
          </div>
        }
      />

      {/* ── Sub-abas de Navegação Interna ─────────────────────────────── */}
      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── Sub-Aba 1: Espelho Individual da Avaliação ─────────────────── */}
      {activeTab === 'espelho' && (
        <div className="space-y-6">
          {espelho ? (
            <>
              {/* Card de Resumo e Nota Final */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-border bg-muted/20">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Nota Final do Ciclo (Nc)</span>
                  <div className="font-mono text-3xl font-black text-primary mt-1">
                    {Number(espelho.nota_final).toFixed(2)} pts
                  </div>
                  <div className="mt-2">
                    <StatusChip
                      label={espelho.elegivel_progressao ? 'Apto à Progressão' : 'Abaixo do Corte (PMD)'}
                      variant={espelho.elegivel_progressao ? 'success' : 'warning'}
                    />
                  </div>
                </Card>

                <Card className="p-4 border-border bg-muted/20">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Ciclo de Referência</span>
                  <div className="font-semibold text-sm text-foreground mt-1">
                    {espelho.ciclo?.nome || 'Ciclo Anual'}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    Ano: {espelho.ciclo?.ano_referencia || 'Vigente'}
                  </div>
                </Card>

                <Card className="p-4 border-border bg-muted/20">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Chefia Avaliadora</span>
                  <div className="font-semibold text-sm text-foreground mt-1">
                    {espelho.avaliador?.nome || 'Chefia Imediata'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Devolutiva Presencial: {espelho.devolutiva_realizada ? 'Realizada' : 'Pendente'}
                  </div>
                </Card>

                <Card className="p-4 border-border bg-muted/20">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Ciência Eletrônica</span>
                  <div className="mt-1">
                    {espelho.ciencia_servidor_em ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Assinado em {new Date(espelho.ciencia_servidor_em).toLocaleDateString('pt-BR')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-status-warning border-status-warning-border">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente de Assinatura
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {espelho.ciencia_tipo ? `Tipo: ${espelho.ciencia_tipo}` : 'Aguardando ciência'}
                  </div>
                </Card>
              </div>

              {/* Parecer do Avaliador e Devolutiva Presencial */}
              {espelho.parecer_avaliador && (
                <Card className="p-4 border-border bg-card">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Parecer Descritivo do Gestor
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "{espelho.parecer_avaliador}"
                  </p>
                  {espelho.devolutiva_resumo && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      <strong className="text-foreground">Acordos de Devolutiva Presencial:</strong> {espelho.devolutiva_resumo}
                    </div>
                  )}
                </Card>
              )}

              {/* Tabela dos 8 Fatores Avaliados */}
              <Card className="gap-0 py-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-foreground">
                    Fatores Funcionais da Escala Gráfica de Chiavenato
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Pontuação centesimal (0 a 100) com peso percentual
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {espelho.fatores.map((f) => (
                    <div key={f.codigo} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                            {f.codigo}
                          </span>
                          <span className="font-semibold text-sm text-foreground">{f.nome}</span>
                        </div>
                        {f.descricao && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.descricao}</p>
                        )}
                        {f.justificativa && (
                          <div className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/50 mt-1">
                            Justificativa do Avaliador: {f.justificativa}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {f.grau && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Grau</span>
                            <span className="font-mono text-sm font-bold text-foreground">Grau {f.grau}</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Peso</span>
                          <span className="font-mono text-sm font-semibold text-foreground">{f.peso}%</span>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nota</span>
                          <span className="font-mono text-base font-black text-primary tabular-nums">
                            {Number(f.nota).toFixed(1)}
                          </span>
                        </div>
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

      {/* ── Sub-Aba 2: Linha do Tempo do CIT (Diário de Bordo) ─────────── */}
      {activeTab === 'cit' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Linha do Tempo de Incidentes Críticos (CIT - Art. 24)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fatos observáveis, desempenhos exemplares e pontos a desenvolver registrados pela chefia imediata ao longo do período avaliativo.
            </p>
          </Card>

          {incidentes.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum incidente registrado no Diário de Bordo"
              description="Não constam registros de fatos observáveis ou incidentes críticos neste período avaliativo."
            />
          ) : (
            <div className="relative border-l-2 border-primary/30 ml-4 space-y-6 py-2">
              {incidentes.map((inc) => (
                <div key={inc.id} className="relative pl-6">
                  {/* Marcador da Timeline */}
                  <div
                    className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-background ${
                      inc.tipo === 'positivo' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />

                  <Card className="p-4 border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={inc.tipo === 'positivo' ? 'success' : 'outline'}
                          className="text-[10px] font-semibold uppercase"
                        >
                          {inc.tipo === 'positivo' ? 'Fato Positivo' : 'Ponto a Desenvolver'}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">
                          {inc.fator?.nome || `Fator #${inc.fator_id}`}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        Data do Fato: {new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">
                      {inc.descricao_fato}
                    </p>

                    {inc.evidencias && inc.evidencias.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground">Evidências Anexadas:</span>
                        {inc.evidencias.map((ev) => (
                          <a
                            key={ev.id}
                            href={ev.url_armazenamento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono"
                          >
                            <Download className="h-3 w-3" />
                            {ev.nome_arquivo}
                          </a>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Aba 3: Simulador de Progressão e Histórico Trienal ─────── */}
      {activeTab === 'simulador' && (
        <div className="space-y-6">
          {simulacao ? (
            <>
              {/* Projeção da NFC e Elegibilidade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-border bg-card">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Nota Final Consolidada (NFC Trienal)</span>
                  <div className="font-mono text-3xl font-black text-primary mt-1">
                    {Number(simulacao.nfc_projetada).toFixed(2)} pts
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Média aritmética dos 3 ciclos anuais do triênio
                  </p>
                </Card>

                <Card className="p-4 border-border bg-card">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Elegibilidade Regimental</span>
                  <div className="mt-2">
                    <StatusChip
                      label={simulacao.elegivel_progressao ? 'Apto para Progressão (+10%)' : 'Inapto (Abaixo de 70 pts)'}
                      variant={simulacao.elegivel_progressao ? 'success' : 'danger'}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nota de corte legal: <strong className="font-mono text-foreground">70,00 pontos</strong>
                  </p>
                </Card>

                <Card className="p-4 border-border bg-card">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Impacto Salarial Projetado</span>
                  <div className="font-mono text-3xl font-black text-emerald-600 mt-1">
                    +{simulacao.percentual_total_aumento.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +10% de progressão horizontal + {simulacao.quinquenios.percentual_total}% de quinquênios (Art. 17)
                  </p>
                </Card>
              </div>

              {/* Detalhamento dos Quinquênios */}
              <Card className="p-4 border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Cálculo de Quinquênios e Vencimento (Art. 17 da Lei nº 1.704/2006)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-muted/20 rounded border border-border">
                    <span className="text-muted-foreground">Quinquênios Adquiridos:</span>
                    <div className="font-mono font-bold text-base text-foreground mt-0.5">
                      {simulacao.quinquenios.qtd_quinquenios} quinquênio(s)
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded border border-border">
                    <span className="text-muted-foreground">Adicional por Tempo de Serviço:</span>
                    <div className="font-mono font-bold text-base text-emerald-600 mt-0.5">
                      +{simulacao.quinquenios.percentual_total.toFixed(1)}% sobre o básico
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded border border-border">
                    <span className="text-muted-foreground">Próximo Quinquênio Previsto:</span>
                    <div className="font-mono font-bold text-base text-foreground mt-0.5">
                      {simulacao.quinquenios.proximo_em || 'Em apuração'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Histórico dos 3 Ciclos Anuais */}
              <Card className="gap-0 py-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h4 className="text-sm font-bold text-foreground">Histórico de Notas Anuais do Triênio Atual</h4>
                </div>
                <div className="p-4 space-y-3">
                  {simulacao.historico_ciclos.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-primary px-2 py-1 bg-primary/10 rounded">
                          Ano {idx + 1} ({h.ano || 'Anual'})
                        </span>
                        <span className="text-xs text-muted-foreground">Ciclo #{h.ciclo_id}</span>
                      </div>
                      <div className="font-mono text-base font-black text-foreground tabular-nums">
                        {Number(h.nota).toFixed(2)} pts
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-10 w-10 text-muted-foreground" />}
              title="Simulação não disponível"
              description="Não foram encontradas avaliações suficientes para calcular a projeção trienal."
            />
          )}
        </div>
      )}

      {/* ── Sub-Aba 4: Acompanhamento de PMD ───────────────────────────── */}
      {activeTab === 'pmd' && (
        <div className="space-y-4">
          {pmd ? (
            <Card className="p-6 border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Plano de Melhoria de Desempenho (PMD) Ativo</h3>
                  <p className="text-xs text-muted-foreground">
                    Instrumento de apoio institucional gerado em razão de nota inferior a 70,00 pontos (RF-09).
                  </p>
                </div>
                <StatusChip label={pmd.status} variant={pmd.status === 'concluido' ? 'success' : 'warning'} />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <strong className="text-foreground">Diagnóstico de Causas:</strong>
                  <p className="text-muted-foreground mt-0.5">{pmd.diagnostico_causas}</p>
                </div>

                <div>
                  <strong className="text-foreground">Ações e Metas de Evolução:</strong>
                  <p className="text-muted-foreground mt-0.5">{pmd.acoes_desenvolvimento}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-muted/20 rounded border border-border">
                    <span className="text-muted-foreground">Prazo Limite:</span>
                    <div className="font-mono font-bold text-foreground mt-0.5">{pmd.prazo_meses} meses</div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded border border-border">
                    <span className="text-muted-foreground">Data Final:</span>
                    <div className="font-mono font-bold text-foreground mt-0.5">{pmd.data_limite}</div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={<GraduationCap className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum Plano de Melhoria de Desempenho ativo"
              description="Você não possui obrigações de PMD pendentes. Seu desempenho atende aos padrões regimentais exigidos."
            />
          )}
        </div>
      )}

      {/* ── Modal: Assinatura Eletrônica e Ciência (Art. 27) ───────────── */}
      <Modal
        open={modalCienciaOpen}
        onClose={() => setModalCienciaOpen(false)}
        title="Assinatura Eletrônica de Ciência (Art. 27)"
        size="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Conforme o Art. 27 da Lei nº 1.704/2006, o resultado da avaliação se torna plenamente eficaz após a ciência digital do servidor, com registro do endereço IP e data/hora oficial UTC-3.
          </p>

          <div className="space-y-2">
            <label className="block font-semibold text-foreground">Manifestação do Servidor:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded border border-border bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="tipoCiencia"
                  checked={tipoCiencia === 'concordancia'}
                  onChange={() => setTipoCiencia('concordancia')}
                  className="accent-primary"
                />
                <div>
                  <span className="font-bold text-foreground">Concordância Integral</span>
                  <p className="text-muted-foreground text-[11px]">Concordo com os graus e notas atribuídos pela chefia imediata.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded border border-border bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="tipoCiencia"
                  checked={tipoCiencia === 'discordancia_recurso'}
                  onChange={() => setTipoCiencia('discordancia_recurso')}
                  className="accent-primary"
                />
                <div>
                  <span className="font-bold text-amber-700">Ciência com Discordância (Para Fins Recursais)</span>
                  <p className="text-muted-foreground text-[11px]">Tomo ciência do resultado, mas manifesto inconformidade para interposição de recurso administrativo.</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Observações do Servidor (Opcional):</label>
            <textarea
              rows={3}
              value={observacoesCiencia}
              onChange={(e) => setObservacoesCiencia(e.target.value)}
              placeholder="Digite eventuais considerações sobre a entrevista devolutiva..."
              className="w-full rounded-md border border-input bg-background p-2 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalCienciaOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={assinando}
              onClick={handleAssinarCiencia}
            >
              {assinando ? 'Assinando Digitalmente...' : 'Confirmar Assinatura Digital'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Interposição de Recurso Administrativo (Arts. 30 e 31) ── */}
      <Modal
        open={modalRecursoOpen}
        onClose={() => setModalRecursoOpen(false)}
        title="Interposição de Recurso Administrativo à CAD (Art. 30)"
        size="lg"
      >
        <form onSubmit={handleSubmeterRecurso} className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded">
            <strong>Prazo Regimental:</strong> 10 (dez) dias úteis a contar da ciência. A chefia imediata terá 5 dias para manifestar contrarrazões, e a CAD julgará soberanamente em sessão colegiada.
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Fatores da Escala Gráfica Contestados:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {espelho?.fatores.map((f) => (
                <label key={f.codigo} className="flex items-center gap-2 p-2 border border-border rounded hover:bg-muted/10">
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
                  <span className="font-mono font-bold text-primary">{f.codigo}</span>
                  <span className="truncate">{f.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
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

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Razões Recursais Fundamentadas:
            </label>
            <textarea
              rows={4}
              value={fundamentacaoRecurso}
              onChange={(e) => setFundamentacaoRecurso(e.target.value)}
              placeholder="Descreva de forma clara e objetiva os motivos pelos quais a pontuação atribuída deve ser revista, indicando contraprovas e fatos observáveis..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalRecursoOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              disabled={enviandoRecurso || !fundamentacaoRecurso.trim()}
            >
              {enviandoRecurso ? 'Protocolando...' : 'Protocolar Recurso Administrativo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de Feedback ─────────────────────────────────────────── */}
      {feedback && (
        <Modal
          open={feedback.open}
          onClose={() => setFeedback(null)}
          title={feedback.title}
          size="sm"
        >
          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground leading-relaxed">{feedback.message}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                OK
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
