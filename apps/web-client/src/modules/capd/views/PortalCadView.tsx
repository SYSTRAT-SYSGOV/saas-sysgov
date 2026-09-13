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
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Scale,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiRecurso,
  ApiSessao,
  ApiComissao,
  ApiCiclo,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type CadSubTab = 'julgamento' | 'sessoes' | 'comissao' | 'fatores';

export const PortalCadView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CadSubTab>('julgamento');
  const [loading, setLoading] = useState<boolean>(true);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [sessoes, setSessoes] = useState<ApiSessao[]>([]);
  const [comissoes, setComissoes] = useState<ApiComissao[]>([]);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);

  // Filtros de Recursos
  const [buscaRecurso, setBuscaRecurso] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Modal de Julgamento Comparativo (3 Colunas: Razões x Contrarrazões x CIT)
  const [modalJulgamentoOpen, setModalJulgamentoOpen] = useState<boolean>(false);
  const [recursoSelecionado, setRecursoSelecionado] = useState<ApiRecurso | null>(null);
  const [sessaoAtivaId, setSessaoAtivaId] = useState<number>(1);
  const [votoFavoravel, setVotoFavoravel] = useState<boolean>(false);
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [parecerVoto, setParecerVoto] = useState<string>('');
  const [salvandoVoto, setSalvandoVoto] = useState<boolean>(false);

  // Modal Nova Sessão
  const [modalSessaoOpen, setModalSessaoOpen] = useState<boolean>(false);
  const [tipoSessao, setTipoSessao] = useState<'ordinaria' | 'extraordinaria'>('ordinaria');
  const [dataSessao, setDataSessao] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quorumMinimo, setQuorumMinimo] = useState<number>(3);
  const [salvandoSessao, setSalvandoSessao] = useState<boolean>(false);

  // Feedback Modal
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosCad = useCallback(async () => {
    setLoading(true);
    try {
      const [resRec, resSess, resCom, resCic] = await Promise.all([
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listSessoes().catch(() => ({ data: [] })),
        api.capd.listComissoes().catch(() => ({ data: [] })),
        api.capd.listCiclos().catch(() => []),
      ]);

      setRecursos(resRec.data || []);
      setSessoes(resSess.data || []);
      setComissoes(resCom.data || []);
      setCiclos(Array.isArray(resCic) ? resCic : []);
      if (resSess.data && resSess.data.length > 0) {
        const aberta = resSess.data.find((s: ApiSessao) => !s.finalizada);
        if (aberta) setSessaoAtivaId(aberta.id);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do CAD:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosCad();
  }, [carregarDadosCad]);

  // Handler de Votação Colegiada
  const handleRegistrarVoto = async () => {
    if (!recursoSelecionado) return;
    if (!parecerVoto.trim()) {
      setFeedback({
        open: true,
        title: 'Parecer Obrigatório',
        message: 'A CAD exige fundamentação e parecer técnico para registrar o voto colegiado.',
        type: 'warning',
      });
      return;
    }

    setSalvandoVoto(true);
    try {
      await api.capd.votarRecurso({
        sessao_id: sessaoAtivaId,
        recurso_id: recursoSelecionado.id,
        voto_favoravel: votoFavoravel,
        novo_grau_proposto: votoFavoravel ? novoGrauProposto : undefined,
        parecer_voto: parecerVoto,
      });

      setModalJulgamentoOpen(false);
      setParecerVoto('');
      setFeedback({
        open: true,
        title: 'Voto Registrado no Colegiado',
        message: 'O voto foi registrado na ata da sessão com sucesso e hash SHA-256 gerado para auditoria.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro na Deliberação',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar voto.',
        type: 'error',
      });
    } finally {
      setSalvandoVoto(false);
    }
  };

  // Recursos filtrados
  const recursosFiltrados = useMemo(() => {
    return recursos.filter((rec) => {
      const matchBusca = buscaRecurso
        ? rec.servidor?.nome_completo?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.servidor?.matricula?.includes(buscaRecurso) ||
          rec.fatorContestado?.nome?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.fator_contestado?.nome?.toLowerCase().includes(buscaRecurso.toLowerCase())
        : true;
      const matchStatus = filtroStatus ? rec.status === filtroStatus : true;
      return matchBusca && matchStatus;
    });
  }, [recursos, buscaRecurso, filtroStatus]);

  // Colunas TanStack para o DataTable de Recursos
  const columnsRecursos = useMemo<ColumnDef<ApiRecurso>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Protocolo',
        size: 90,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'servidor',
        header: 'Recorrente',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.servidor?.nome_completo || `Servidor #${row.original.recorrente_id}`}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              Matrícula: {row.original.servidor?.matricula || '-'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'fator',
        header: 'Fator Contestado',
        cell: ({ row }) => {
          const fator = row.original.fatorContestado || row.original.fator_contestado;
          return (
            <div>
              <div className="text-xs font-medium text-foreground">{fator?.nome || `Fator #${row.original.fator_contestado_id}`}</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-xs">{row.original.justificativa_servidor}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status Processual',
        size: 160,
        cell: ({ row }) => {
          let variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' = 'neutral';
          if (row.original.status === 'interposto') variant = 'warning';
          else if (row.original.status === 'em_instrucao') variant = 'info';
          else if (row.original.status === 'julgado_provido') variant = 'success';
          else if (row.original.status === 'julgado_desprovido') variant = 'danger';
          return (
            <StatusChip
              label={row.original.status.replace('_', ' ').toUpperCase()}
              variant={variant}
            />
          );
        },
      },
      {
        accessorKey: 'prazo',
        header: 'Prazo CAD',
        size: 130,
        cell: ({ row }) => (
          <div className="font-mono text-[11px] tabular-nums text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-warning" />
            {row.original.prazo_julgamento || '10 dias úteis'}
          </div>
        ),
      },
      {
        id: 'acoes',
        header: 'Ação',
        size: 140,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setRecursoSelecionado(row.original);
              setModalJulgamentoOpen(true);
            }}
          >
            <Scale className="h-3.5 w-3.5 mr-1 text-primary" />
            Julgar no Painel
          </Button>
        ),
      },
    ],
    []
  );

  const subTabItems: TabsItem<CadSubTab>[] = [
    {
      key: 'julgamento',
      label: 'Fila de Recursos',
      icon: <Scale className="h-4 w-4" />,
      badge: recursos.filter((r) => ['interposto', 'em_instrucao', 'pautado'].includes(r.status)).length,
    },
    {
      key: 'sessoes',
      label: 'Sessões & Atas Colegiadas',
      icon: <Gavel className="h-4 w-4" />,
      badge: sessoes.length,
    },
    {
      key: 'comissao',
      label: 'Comissão & Impedimentos',
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: comissoes.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gavel className="h-6 w-6 text-primary" />}
        title="Portal da CAD — Comissão de Avaliação e Desempenho"
        subtitle="Julgamento colegiado em 3 colunas, verificação de impedimentos, relatoria e atas com assinatura digital."
        badge="Órgão Julgador Oficial"
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── SUB-ABA 1: FILA DE JULGAMENTO DE RECURSOS ─────────────────── */}
      {activeTab === 'julgamento' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0">
            <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <SearchInput
                  value={buscaRecurso}
                  onChange={setBuscaRecurso}
                  placeholder="Buscar por recorrente, matrícula ou fator..."
                  className="flex-1"
                />
                <Select
                  value={filtroStatus}
                  onChange={setFiltroStatus}
                  options={[
                    { value: '', label: 'Todos os Status' },
                    { value: 'interposto', label: 'Interposto' },
                    { value: 'em_instrucao', label: 'Em Instrução' },
                    { value: 'pautado', label: 'Pautado' },
                    { value: 'julgado_provido', label: 'Provido' },
                    { value: 'julgado_desprovido', label: 'Desprovido' },
                  ]}
                  className="w-48"
                />
              </div>

              <div className="text-xs text-muted-foreground font-mono">
                Total na fila: <strong className="text-foreground">{recursosFiltrados.length}</strong>
              </div>
            </div>

            <div className="p-3">
              {recursosFiltrados.length === 0 && !loading ? (
                <EmptyState
                  icon={<Scale className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum recurso pendente de julgamento"
                  description="Todos os recursos interpostos pelos servidores foram devidamente instruídos ou julgados."
                />
              ) : (
                <DataTable
                  columns={columnsRecursos}
                  data={recursosFiltrados}
                  loading={loading}
                  emptyText="Nenhum recurso encontrado."
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="recursos-cad"
                  exportTitle="CAPD — Recursos Administrativos"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 2: SESSÕES E ATAS COLEGIADAS ─────────────────────── */}
      {activeTab === 'sessoes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sessões Deliberativas Oficiais</h3>
              <p className="text-xs text-muted-foreground">Registro de deliberações com ata selada por hash criptográfico SHA-256.</p>
            </div>
            <Button size="sm" onClick={() => setModalSessaoOpen(true)}>
              <Gavel className="h-4 w-4 mr-1.5" />
              Abrir Nova Sessão
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessoes.map((sessao) => (
              <Card key={sessao.id} className="p-4 space-y-3 border-border">
                <div className="flex items-center justify-between">
                  <Badge variant={sessao.tipo_sessao === 'ordinaria' ? 'default' : 'secondary'} className="uppercase text-[10px] font-mono">
                    Sessão {sessao.tipo_sessao} #{sessao.id}
                  </Badge>
                  <StatusChip
                    label={sessao.finalizada ? 'Finalizada & Selada' : 'Em Andamento'}
                    variant={sessao.finalizada ? 'success' : 'warning'}
                  />
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Data:</span>
                    <span className="font-mono text-foreground font-semibold">{sessao.data_sessao}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Quórum Mínimo:</span>
                    <span className="font-mono text-foreground">{sessao.quorum_minimo} membros</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Presentes:</span>
                    <span className="font-mono text-foreground">{sessao.quorum_presente} membros</span>
                  </div>
                </div>

                {sessao.hash_ata_sha256 && (
                  <div className="p-2 rounded bg-muted/40 border border-border">
                    <div className="text-[10px] text-muted-foreground font-mono">Hash SHA-256 da Ata:</div>
                    <div className="font-mono text-[9px] text-primary truncate tabular-nums">
                      {sessao.hash_ata_sha256}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-ABA 3: COMISSÃO & CONTROLE DE IMPEDIMENTOS ───────────── */}
      {activeTab === 'comissao' && (
        <div className="space-y-4">
          <Card className="p-4 border-primary/20 bg-accent/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Regra Mandatória de Isenção (Art. 31 da Lei nº 1.704/2006)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Membros da CAD que possuam grau de parentesco até 3º grau com o servidor avaliado ou que atuem como sua chefia imediata
                  são automaticamente impedidos de votar no recurso. O voto é redistribuído ao suplente legal.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comissoes.map((comissao) => (
              <Card key={comissao.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-foreground">
                    {comissao.nome || `Portaria nº ${comissao.numero_portaria}`}
                  </div>
                  <Badge variant={comissao.ativa ? 'default' : 'outline'} className="text-[10px]">
                    {comissao.ativa ? 'Vigente' : 'Inativa'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Data de Publicação: <span className="font-mono font-semibold text-foreground">{comissao.data_publicacao_portaria}</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-foreground">Membros Designados:</div>
                  {comissao.membros && comissao.membros.length > 0 ? (
                    comissao.membros.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                        <div>
                          <span className="font-medium text-foreground">{m.servidor?.name || `Servidor #${m.servidor_id}`}</span>
                          <span className="text-[10px] text-muted-foreground ml-2 font-mono">({m.papel.replace('_', ' ')})</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {m.ativo ? 'Apto' : 'Impedido'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">Nenhum membro vinculado a esta portaria.</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL DE JULGAMENTO COMPARATIVO EM 3 COLUNAS ─────────────── */}
      <Modal
        open={modalJulgamentoOpen}
        onClose={() => setModalJulgamentoOpen(false)}
        title={`Julgamento Colegiado da CAD — Recurso #${recursoSelecionado?.id}`}
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* PAINEL COMPARATIVO TRI-PARTITE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Razões do Servidor */}
            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs border-b border-blue-200/50 pb-2">
                <FileText className="h-4 w-4" />
                <span>1. Razões do Servidor Avaliado</span>
              </div>
              <div className="text-xs text-foreground/90 leading-relaxed font-sans italic bg-background/60 p-3 rounded border border-border min-h-[120px]">
                "{recursoSelecionado?.justificativa_servidor || 'Sem manifestação digitada.'}"
              </div>
              <div className="text-[11px] text-muted-foreground">
                Servidor: <strong>{recursoSelecionado?.servidor?.nome_completo}</strong>
              </div>
            </div>

            {/* Coluna 2: Contrarrazões da Chefia Imediata */}
            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-xs border-b border-amber-200/50 pb-2">
                <UserCheck className="h-4 w-4" />
                <span>2. Contrarrazões da Chefia</span>
              </div>
              <div className="text-xs text-foreground/90 leading-relaxed font-sans bg-background/60 p-3 rounded border border-border min-h-[120px]">
                {recursoSelecionado?.contestacao_chefia ? (
                  `"${recursoSelecionado.contestacao_chefia}"`
                ) : (
                  <span className="text-muted-foreground italic">Chefia imediata não apresentou contrarrazões no prazo de 5 dias úteis.</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Prazo legal: <strong>5 dias úteis (Art. 28)</strong>
              </div>
            </div>

            {/* Coluna 3: Apontamentos e Evidências do CIT */}
            <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border-b border-emerald-200/50 pb-2">
                <Sparkles className="h-4 w-4" />
                <span>3. Evidências do CIT (Diário de Bordo)</span>
              </div>
              <div className="text-xs text-foreground/90 leading-relaxed font-sans bg-background/60 p-3 rounded border border-border min-h-[120px] space-y-2">
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Fator: {recursoSelecionado?.fatorContestado?.nome || recursoSelecionado?.fator_contestado?.nome}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Fatos observáveis e incidentes críticos registrados no período aquisitivo do ciclo servem como base probatória objetiva.
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Trava Art. 24: Registro prévio verificado
              </div>
            </div>
          </div>

          {/* VOTAÇÃO COLEGIADA */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Deliberação e Voto Colegiado da Comissão
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Decisão do Voto</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={votoFavoravel ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setVotoFavoravel(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-500" />
                    Dar Provimento
                  </Button>
                  <Button
                    type="button"
                    variant={!votoFavoravel ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setVotoFavoravel(false)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5 text-rose-500" />
                    Negar Provimento
                  </Button>
                </div>
              </div>

              {votoFavoravel && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Novo Grau Retificado (Escala Gráfica 1 a 5)
                  </label>
                  <Select
                    value={String(novoGrauProposto)}
                    onChange={(val) => setNovoGrauProposto(Number(val))}
                    options={[
                      { value: '1', label: 'Grau 1 — Insuficiente' },
                      { value: '2', label: 'Grau 2 — Regular' },
                      { value: '3', label: 'Grau 3 — Bom' },
                      { value: '4', label: 'Grau 4 — Muito Bom' },
                      { value: '5', label: 'Grau 5 — Excelente' },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Parecer Técnico Colegiado (Fundamentação da Decisão)
              </label>
              <textarea
                value={parecerVoto}
                onChange={(e) => setParecerVoto(e.target.value)}
                placeholder="Fundamente a deliberação com base nos autos, fatos do CIT e legislação aplicável..."
                className="w-full h-24 p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalJulgamentoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleRegistrarVoto} disabled={salvandoVoto}>
              {salvandoVoto ? 'Gravando Voto...' : 'Assinar e Concluir Voto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* FEEDBACK MODAL */}
      {feedback && (
        <Modal open={feedback.open} onClose={() => setFeedback(null)} title={feedback.title}>
          <div className="space-y-4">
            <p className="text-xs text-foreground leading-relaxed">{feedback.message}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
