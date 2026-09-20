import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  AlertCard,
  StatusChip,
  Select,
  StatCard,
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
  Copy,
  Check,
  FileCheck,
  Paperclip,
  Printer,
  Scale,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiEspelhoAvaliacao,
  ApiDiarioBordo,
  ApiAvaliacao,
  ApiRecurso,
  ApiFator,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { MatrizEscalaGrafica, type RespostaItem } from '../components/MatrizEscalaGrafica';
import { useAuth } from '@/core/auth/useAuth';

const api = new SysgovApi();

type ServidorSubTab = 'espelho' | 'cit' | 'recurso';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ServidorSubTab>('espelho');
  const [loading, setLoading] = useState<boolean>(true);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [selectedAvalId, setSelectedAvalId] = useState<number | null>(null);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [fatoresCadastrados, setFatoresCadastrados] = useState<ApiFator[]>([]);
  const [detalheRecursoModal, setDetalheRecursoModal] = useState<ApiRecurso | null>(null);
  const [filtroRecursoStatus, setFiltroRecursoStatus] = useState<string>('todos');
  const [fatorRecursoId, setFatorRecursoId] = useState<number | null>(null);

  const [citVisualizacao, setCitVisualizacao] = useState<'timeline' | 'tabela'>('tabela');
  const [filtroCitBusca, setFiltroCitBusca] = useState('');
  const [filtroCitTipo, setFiltroCitTipo] = useState<'todos' | 'positivo' | 'negativo'>('todos');
  const [filtroCitFator, setFiltroCitFator] = useState<string>('todos');
  const [filtroCitDataInicio, setFiltroCitDataInicio] = useState<string>('');
  const [filtroCitDataFim, setFiltroCitDataFim] = useState<string>('');
  const [detalheCitModal, setDetalheCitModal] = useState<ApiDiarioBordo | null>(null);
  const [copiadoHash, setCopiadoHash] = useState<boolean>(false);
  const [modalCienciaOpen, setModalCienciaOpen] = useState<boolean>(false);
  const [tipoCiencia, setTipoCiencia] = useState<'concordancia' | 'discordancia_recurso'>('concordancia');
  const [observacoesCiencia, setObservacoesCiencia] = useState<string>('');
  const [assinando, setAssinando] = useState<boolean>(false);
  const [modalRecursoOpen, setModalRecursoOpen] = useState<boolean>(false);
  const [fundamentacaoRecurso, setFundamentacaoRecurso] = useState<string>('');
  const [novoGrauDesejado, setNovoGrauDesejado] = useState<number>(4);
  const [enviandoRecurso, setEnviandoRecurso] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const carregarListaAvaliacoes = useCallback(async () => {
    setLoading(true);
    try {
      let lista: ApiAvaliacao[] = [];
      if (user?.id) {
        const res = await api.capd.listAvaliacoes({ servidor_id: user.id });
        lista = res.data || [];
      }
      if (lista.length === 0) {
        // Conta sem avaliação própria vinculada (ex.: login administrativo usado para
        // pré-visualizar o portal) — cai para a listagem geral, mesmo padrão de
        // fallback já usado no Portal do Avaliador.
        const fallback = await api.capd.listAvaliacoes();
        lista = fallback.data || [];
      }
      setAvaliacoes(lista);
      if (lista.length > 0) {
        setSelectedAvalId(lista[0].id);
      }
    } catch (e) {
      console.error('Erro ao carregar avaliações:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const carregarDadosAvaliacao = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const aval = avaliacoes.find(a => a.id === id);
      const servidorId = aval?.servidor_id;
      if (!servidorId) return;

      const [esp, resCit, resRecursos, listaFatores] = await Promise.all([
        api.capd.obterEspelhoAvaliacao(id).catch(() => null),
        api.capd.listDiarioBordo({ servidor_id: servidorId }).catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listFatores().catch(() => []),
      ]);
      setEspelho(esp);
      setIncidentes(resCit.data || []);
      setRecursos(resRecursos.data || []);
      setFatoresCadastrados(listaFatores || []);
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

  const fatoresCitOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: 'todos', label: 'Todos os Fatores' }];
    const map = new Map<string, string>();

    for (const inc of incidentes) {
      const chave = inc.fator?.codigo || (inc.fator_id ? String(inc.fator_id) : '');
      const rotulo = inc.fator?.nome || (inc.fator_id ? `Fator #${inc.fator_id}` : '');
      if (chave && rotulo && !map.has(chave)) {
        map.set(chave, rotulo);
      }
    }

    if (espelho?.fatores) {
      for (const f of espelho.fatores) {
        const chave = f.codigo;
        const rotulo = f.nome ? `${f.codigo} - ${f.nome}` : f.codigo;
        if (chave && !map.has(chave)) {
          map.set(chave, rotulo);
        }
      }
    }

    map.forEach((label, val) => {
      opts.push({ value: val, label });
    });
    return opts;
  }, [espelho, incidentes]);

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter((inc) => {
      if (filtroCitTipo === 'positivo' && inc.tipo !== 'positivo') return false;
      if (filtroCitTipo === 'negativo' && inc.tipo === 'positivo') return false;

      if (filtroCitFator !== 'todos') {
        const matchCod = inc.fator?.codigo === filtroCitFator;
        const matchId = inc.fator_id?.toString() === filtroCitFator;
        if (!matchCod && !matchId) {
          return false;
        }
      }

      if (filtroCitDataInicio) {
        const dataInc = inc.data_ocorrencia ? inc.data_ocorrencia.substring(0, 10) : '';
        if (dataInc && dataInc < filtroCitDataInicio) return false;
      }

      if (filtroCitDataFim) {
        const dataInc = inc.data_ocorrencia ? inc.data_ocorrencia.substring(0, 10) : '';
        if (dataInc && dataInc > filtroCitDataFim) return false;
      }

      if (filtroCitBusca.trim()) {
        const term = filtroCitBusca.toLowerCase().trim();
        const matchDesc = inc.descricao_fato?.toLowerCase().includes(term);
        const matchFator = inc.fator?.nome?.toLowerCase().includes(term);
        const matchHash = inc.hash_sha256?.toLowerCase().includes(term);
        const matchId = inc.id?.toString().includes(term);
        if (!matchDesc && !matchFator && !matchHash && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [incidentes, filtroCitTipo, filtroCitFator, filtroCitDataInicio, filtroCitDataFim, filtroCitBusca]);

  const columnsCit: ColumnDef<ApiDiarioBordo>[] = useMemo(
    () => [
      {
        id: 'data_ocorrencia',
        header: 'Data Ocorrência',
        size: 120,
        accessorFn: (row) => row.data_ocorrencia,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
            {new Date(row.original.data_ocorrencia).toLocaleDateString('pt-BR')}
          </span>
        ),
        meta: {
          exportHeader: 'Data Ocorrência',
          exportValue: (row) => new Date(row.data_ocorrencia).toLocaleDateString('pt-BR'),
        },
      },
      {
        id: 'tipo',
        header: 'Classificação CIT',
        size: 150,
        accessorFn: (row) => row.tipo,
        cell: ({ row }) => {
          const isPositivo = row.original.tipo === 'positivo';
          return (
            <Badge
              variant={isPositivo ? 'success' : 'outline'}
              className={`text-[10px] uppercase font-bold flex items-center gap-1 w-fit ${
                !isPositivo
                  ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                  : ''
              }`}
            >
              {isPositivo ? (
                <>
                  <ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" />
                  Fato Positivo
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" />
                  A Desenvolver
                </>
              )}
            </Badge>
          );
        },
        meta: {
          exportHeader: 'Classificação',
          exportValue: (row) => (row.tipo === 'positivo' ? 'Fato Positivo' : 'Ponto a Desenvolver'),
        },
      },
      {
        id: 'fator',
        header: 'Fator Vinculado',
        size: 180,
        accessorFn: (row) => row.fator?.nome || `Fator #${row.fator_id}`,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground/90">
            {row.original.fator?.nome || `Fator #${row.original.fator_id}`}
          </span>
        ),
        meta: {
          exportHeader: 'Fator',
          exportValue: (row) => row.fator?.nome || `Fator #${row.fator_id}`,
        },
      },
      {
        id: 'descricao_fato',
        header: 'Conduta Fática Registrada',
        size: 340,
        accessorFn: (row) => row.descricao_fato,
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground leading-relaxed line-clamp-2 block text-left"
            title={row.original.descricao_fato}
          >
            {row.original.descricao_fato}
          </span>
        ),
        meta: {
          exportHeader: 'Descrição do Fato',
          exportValue: (row) => row.descricao_fato,
        },
      },
      {
        id: 'hash_sha256',
        header: 'Hash SHA-256',
        size: 130,
        accessorFn: (row) => row.hash_sha256,
        cell: ({ row }) => {
          const h = row.original.hash_sha256;
          return h ? (
            <span
              className="font-mono text-[10px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 cursor-pointer hover:text-foreground"
              title={`Hash Digital Completo: ${h} (Clique para copiar)`}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(h);
              }}
            >
              {h.slice(0, 8)}...{h.slice(-4)}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-mono">—</span>
          );
        },
        meta: {
          exportHeader: 'Hash SHA-256',
          exportValue: (row) => row.hash_sha256 || '—',
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 hover:bg-primary/10"
            onClick={() => setDetalheCitModal(row.original)}
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            Ver Ficha
          </Button>
        ),
      },
    ],
    []
  );

  const handleImprimirTermoCit = useCallback((incidente: ApiDiarioBordo) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const dataFormatada = new Date(incidente.data_ocorrencia).toLocaleDateString('pt-BR');
    const servidorNome = espelho?.servidor?.nome || incidente.servidor?.nome_completo || 'Servidor Avaliado';
    const matricula = espelho?.servidor?.matricula || incidente.servidor?.matricula || '—';
    const cargo = espelho?.servidor?.cargo || incidente.servidor?.cargo_efetivo || 'Servidor Público';
    const fatorNome = incidente.fator?.nome || `Fator #${incidente.fator_id}`;
    const isPositivo = incidente.tipo === 'positivo';

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha do Apontamento CIT - #${incidente.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
          .label { color: #6b7280; font-size: 11px; }
          .value { font-weight: 600; margin-top: 2px; }
          .hash { font-family: monospace; font-size: 11px; background: #f9fafb; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 4px; word-break: break-all; }
          .box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 14px; border-radius: 6px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .badge-pos { background: #d1fae5; color: #065f46; }
          .badge-neg { background: #fef3c7; color: #92400e; }
          .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Diário de Bordo — Ficha Circunstanciada de Incidente Crítico (CIT)</h1>
          <div class="subtitle">Sistema de Gestão de Desempenho e Avaliação Funcional (CAPD / SYSGOV)</div>
        </div>
        <div class="section">
          <div class="section-title">Identificação do Servidor Avaliado</div>
          <div class="grid">
            <div><div class="label">Nome Completo:</div><div class="value">${servidorNome}</div></div>
            <div><div class="label">Matrícula Funcional:</div><div class="value">${matricula}</div></div>
            <div><div class="label">Cargo Efetivo:</div><div class="value">${cargo}</div></div>
            <div><div class="label">Data da Ocorrência:</div><div class="value">${dataFormatada}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Classificação Metodológica</div>
          <div class="grid">
            <div>
              <div class="label">Natureza da Conduta:</div>
              <div class="value"><span class="badge ${isPositivo ? 'badge-pos' : 'badge-neg'}">${isPositivo ? 'Fato Positivo (Superação)' : 'Ponto a Desenvolver'}</span></div>
            </div>
            <div><div class="label">Fator Vinculado:</div><div class="value">${fatorNome}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Relato Circunstanciado do Fato</div>
          <div class="box">${incidente.descricao_fato}</div>
        </div>
        <div class="section">
          <div class="section-title">Protocolo e Blindagem de Auditoria</div>
          <div class="hash">SHA-256: ${incidente.hash_sha256 || 'Protocolo Digital Imutável'}</div>
        </div>
        <div class="footer">
          Documento emitido eletronicamente em ${new Date().toLocaleString('pt-BR')} • Válido para instrução probatória do estágio probatório.
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }, [espelho]);

  const temFiltrosCitAtivos = Boolean(
    filtroCitBusca.trim() ||
    filtroCitTipo !== 'todos' ||
    filtroCitFator !== 'todos' ||
    filtroCitDataInicio ||
    filtroCitDataFim
  );

  const handleLimparFiltrosCit = useCallback(() => {
    setFiltroCitBusca('');
    setFiltroCitTipo('todos');
    setFiltroCitFator('todos');
    setFiltroCitDataInicio('');
    setFiltroCitDataFim('');
  }, []);

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

  const { espelhoNotaPontos, espelhoIsElegivel } = useMemo(() => {
    const raw = Number(espelho?.nota_final || 0);
    const pontos = raw <= 10 && raw > 0 ? raw * 10 : raw;
    const elegivel = typeof espelho?.elegivel_progressao === 'boolean'
      ? (espelho.elegivel_progressao || pontos >= 70)
      : (pontos >= 70);
    return { espelhoNotaPontos: pontos, espelhoIsElegivel: elegivel };
  }, [espelho]);

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

  const prazoRecursal = useMemo(() => {
    if (!espelho?.ciencia_servidor_em) return null;
    const dataCiencia = new Date(espelho.ciencia_servidor_em);
    const dataLimite = new Date(dataCiencia);
    let diasAdicionados = 0;
    while (diasAdicionados < 10) {
      dataLimite.setDate(dataLimite.getDate() + 1);
      const diaSemana = dataLimite.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }
    const hoje = new Date();
    const expirado = hoje.getTime() > dataLimite.getTime();
    const diffMs = dataLimite.getTime() - hoje.getTime();
    const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      dataCiencia,
      dataLimite,
      expirado,
      diasRestantes,
    };
  }, [espelho]);

  const fatoresDisponiveisRecurso = useMemo(() => {
    if (fatoresCadastrados.length > 0) {
      return fatoresCadastrados.map((f) => {
        const espFator = espelho?.fatores?.find((ef) => ef.codigo === f.codigo);
        return {
          id: f.id,
          codigo: f.codigo,
          nome: f.nome,
          descricao: f.descricao,
          peso: espFator?.peso ?? f.peso_geral,
          grauAtual: espFator?.grau ?? null,
          notaAtual: espFator?.nota ?? null,
          justificativaAtual: espFator?.justificativa ?? null,
        };
      });
    }
    return (espelho?.fatores || []).map((ef, idx) => ({
      id: idx + 1,
      codigo: ef.codigo,
      nome: ef.nome,
      descricao: ef.descricao || '',
      peso: ef.peso,
      grauAtual: ef.grau ?? null,
      notaAtual: ef.nota ?? null,
      justificativaAtual: ef.justificativa ?? null,
    }));
  }, [fatoresCadastrados, espelho]);

  useEffect(() => {
    if (!fatorRecursoId && fatoresDisponiveisRecurso.length > 0) {
      setFatorRecursoId(fatoresDisponiveisRecurso[0].id);
    }
  }, [fatorRecursoId, fatoresDisponiveisRecurso]);

  const fatorSelecionadoRecurso = useMemo(() => {
    return fatoresDisponiveisRecurso.find((f) => f.id === fatorRecursoId) || fatoresDisponiveisRecurso[0];
  }, [fatoresDisponiveisRecurso, fatorRecursoId]);

  const fatoresRecursoOptions: SelectOption[] = useMemo(() => {
    return fatoresDisponiveisRecurso.map((f) => ({
      value: String(f.id),
      label: `${f.codigo} — ${f.nome} (Grau atual: ${f.grauAtual ?? '—'}, Peso: ${f.peso}%)`,
    }));
  }, [fatoresDisponiveisRecurso]);

  const filtroStatusRecursoOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'interposto', label: 'Interposto / Aguardando Chefia' },
    { value: 'em_instrucao', label: 'Em Instrução / Relatoria' },
    { value: 'pautado', label: 'Pautado para Julgamento' },
    { value: 'julgado_provido', label: 'Julgado Provido (Deferido)' },
    { value: 'julgado_desprovido', label: 'Julgado Desprovido (Mantido)' },
  ];

  const totalRecursos = recursos.length;
  const recursosEmTramitacao = useMemo(() => {
    return recursos.filter((r) => ['interposto', 'em_instrucao', 'pautado'].includes(r.status)).length;
  }, [recursos]);
  const recursosJulgados = useMemo(() => {
    return recursos.filter((r) => ['julgado_provido', 'julgado_desprovido'].includes(r.status)).length;
  }, [recursos]);

  const recursosFiltrados = useMemo(() => {
    return recursos.filter((rec) => {
      if (filtroRecursoStatus !== 'todos' && rec.status !== filtroRecursoStatus) {
        return false;
      }
      return true;
    });
  }, [recursos, filtroRecursoStatus]);

  const getStatusRecursoBadge = (status: string) => {
    switch (status) {
      case 'interposto':
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10"
          >
            <Clock className="h-3 w-3 mr-1 text-amber-600" />
            Interposto / Aguardando Chefia
          </Badge>
        );
      case 'em_instrucao':
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-500/10"
          >
            <FileText className="h-3 w-3 mr-1 text-blue-600" />
            Em Instrução / Relatoria
          </Badge>
        );
      case 'pautado':
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold border-purple-500/50 text-purple-700 dark:text-purple-400 bg-purple-500/10"
          >
            <Calendar className="h-3 w-3 mr-1 text-purple-600" />
            Pautado para Julgamento
          </Badge>
        );
      case 'julgado_provido':
        return (
          <Badge
            variant="success"
            className="text-[10px] uppercase font-bold"
          >
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
            Julgado Provido (Deferido)
          </Badge>
        );
      case 'julgado_desprovido':
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold border-rose-500/50 text-rose-700 dark:text-rose-400 bg-rose-500/10"
          >
            <XCircle className="h-3 w-3 mr-1 text-rose-600" />
            Julgado Desprovido (Mantido)
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-medium text-muted-foreground"
          >
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  const handleImprimirRecurso = useCallback(
    (rec: ApiRecurso) => {
      const win = window.open('', '_blank');
      if (!win) return;
      const dataFormatada = new Date(rec.created_at).toLocaleDateString('pt-BR');
      const servidorNome = espelho?.servidor?.nome || rec.servidor?.nome_completo || 'Servidor Avaliado';
      const matricula = espelho?.servidor?.matricula || rec.servidor?.matricula || '—';
      const cargo = espelho?.servidor?.cargo || rec.servidor?.cargo_efetivo || 'Servidor Público';
      const fatorNome =
        rec.fatorContestado?.nome || rec.fator_contestado?.nome || `Fator #${rec.fator_contestado_id}`;
      const statusLabel =
        rec.status === 'julgado_provido'
          ? 'Julgado Provido (Deferido)'
          : rec.status === 'julgado_desprovido'
          ? 'Julgado Desprovido (Mantido)'
          : rec.status === 'pautado'
          ? 'Pautado para Julgamento'
          : rec.status === 'em_instrucao'
          ? 'Em Instrução na CAD'
          : 'Interposto / Aguardando Chefia';

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Petição de Recurso Administrativo - #${rec.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.5; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
            .label { color: #6b7280; font-size: 11px; }
            .value { font-weight: 600; margin-top: 2px; }
            .box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 14px; border-radius: 6px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .badge-status { background: #e0e7ff; color: #3730a3; }
            .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Termo de Interposição de Recurso Administrativo</h1>
            <div class="subtitle">Comissão de Avaliação de Desempenho (CAD) — Arts. 30 e 31 da Lei nº 1.704/2006</div>
          </div>
          <div class="section">
            <div class="section-title">Dados do Processo e Recorrente</div>
            <div class="grid">
              <div><div class="label">Protocolo do Recurso:</div><div class="value">#REC-${rec.id}</div></div>
              <div><div class="label">Data de Protocolo:</div><div class="value">${dataFormatada}</div></div>
              <div><div class="label">Servidor Recorrente:</div><div class="value">${servidorNome}</div></div>
              <div><div class="label">Matrícula Funcional:</div><div class="value">${matricula}</div></div>
              <div><div class="label">Cargo Efetivo:</div><div class="value">${cargo}</div></div>
              <div><div class="label">Status Processual:</div><div class="value"><span class="badge badge-status">${statusLabel}</span></div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Fator Funcional Objeto da Impugnação</div>
            <div class="box"><strong>Fator Contestado:</strong> ${fatorNome}</div>
          </div>
          <div class="section">
            <div class="section-title">Razões e Fundamentação do Servidor (Art. 30)</div>
            <div class="box">${rec.justificativa_servidor}</div>
          </div>
          ${
            rec.contestacao_chefia
              ? `
          <div class="section">
            <div class="section-title">Contrarrazões da Chefia Imediata (Art. 31)</div>
            <div class="box">${rec.contestacao_chefia}</div>
          </div>
          `
              : ''
          }
          ${
            rec.relator
              ? `
          <div class="section">
            <div class="section-title">Instrução Colegiada (CAD)</div>
            <div class="grid">
              <div><div class="label">Relator Designado:</div><div class="value">${
                rec.relator.nome_completo || rec.relator.name || 'Membro da Comissão'
              }</div></div>
              <div><div class="label">Prazo de Relatoria:</div><div class="value">${
                rec.prazo_relator_ate ? new Date(rec.prazo_relator_ate).toLocaleDateString('pt-BR') : 'Regimental'
              }</div></div>
            </div>
          </div>
          `
              : ''
          }
          <div class="footer">
            Documento emitido eletronicamente via SYSGOV em ${new Date().toLocaleString(
              'pt-BR'
            )} • Válido para instrução probatória e recurso junto à CAD.
          </div>
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    },
    [espelho]
  );

  const columnsRecursos: ColumnDef<ApiRecurso>[] = useMemo(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo / Data',
        size: 140,
        accessorFn: (row) => row.id,
        cell: ({ row }) => (
          <div className="space-y-0.5 text-left">
            <span className="font-mono text-xs font-bold text-foreground block">
              #REC-{String(row.original.id).padStart(4, '0')}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(row.original.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        ),
        meta: {
          exportHeader: 'Protocolo',
          exportValue: (row) => `#REC-${row.id}`,
        },
      },
      {
        id: 'fator',
        header: 'Fator Contestado',
        size: 220,
        accessorFn: (row) =>
          row.fatorContestado?.nome || row.fator_contestado?.nome || `Fator #${row.fator_contestado_id}`,
        cell: ({ row }) => {
          const cod = row.original.fatorContestado?.codigo || row.original.fator_contestado?.codigo;
          const nome =
            row.original.fatorContestado?.nome ||
            row.original.fator_contestado?.nome ||
            `Fator #${row.original.fator_contestado_id}`;
          return (
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1.5">
                {cod && (
                  <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 text-primary border-primary/30">
                    {cod}
                  </Badge>
                )}
                <span className="text-xs font-semibold text-foreground truncate max-w-[180px]" title={nome}>
                  {nome}
                </span>
              </div>
            </div>
          );
        },
        meta: {
          exportHeader: 'Fator Contestado',
          exportValue: (row) =>
            row.fatorContestado?.nome || row.fator_contestado?.nome || `Fator #${row.fator_contestado_id}`,
        },
      },
      {
        id: 'status',
        header: 'Status Processual',
        size: 180,
        accessorFn: (row) => row.status,
        cell: ({ row }) => getStatusRecursoBadge(row.original.status),
        meta: {
          exportHeader: 'Status',
          exportValue: (row) => row.status,
        },
      },
      {
        id: 'relator',
        header: 'Relator da CAD',
        size: 160,
        accessorFn: (row) => row.relator?.nome_completo || row.relator?.name || 'Aguardando',
        cell: ({ row }) => {
          const nome = row.original.relator?.nome_completo || row.original.relator?.name;
          return nome ? (
            <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[130px]" title={nome}>
                {nome}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground/60" />
              Aguardando sorteio
            </span>
          );
        },
        meta: {
          exportHeader: 'Relator',
          exportValue: (row) => row.relator?.nome_completo || row.relator?.name || 'Aguardando sorteio',
        },
      },
      {
        id: 'fase',
        header: 'Fase Regimental',
        size: 170,
        cell: ({ row }) => {
          const st = row.original.status;
          if (st === 'interposto') {
            return (
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Contrarrazões Chefia (Art. 31)
              </span>
            );
          }
          if (st === 'em_instrucao') {
            return (
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                Elaboração de Voto / CAD
              </span>
            );
          }
          if (st === 'pautado') {
            return (
              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                Pauta de Sessão Colegiada
              </span>
            );
          }
          if (st === 'julgado_provido' || st === 'julgado_desprovido') {
            return (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Decisão Homologada
              </span>
            );
          }
          return <span className="text-[11px] text-muted-foreground">—</span>;
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-semibold px-2 rounded-md flex items-center gap-1 hover:bg-primary/10"
              onClick={() => setDetalheRecursoModal(row.original)}
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              Ver Autos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-1.5 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title="Imprimir Petição e Termo de Recurso (PDF)"
              onClick={() => handleImprimirRecurso(row.original)}
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [handleImprimirRecurso]
  );

  const handleSubmeterRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espelho) return;
    if (!fatorRecursoId) {
      setFeedback({
        open: true,
        type: 'warning',
        title: 'Fator Não Selecionado',
        message: 'Selecione o fator da avaliação funcional que você deseja contestar.',
      });
      return;
    }
    if (fundamentacaoRecurso.trim().length < 50) {
      setFeedback({
        open: true,
        type: 'warning',
        title: 'Fundamentação Insuficiente',
        message: 'A justificativa do recurso deve conter no mínimo 50 caracteres para instrução válida (Art. 30).',
      });
      return;
    }
    setEnviandoRecurso(true);
    try {
      const fObj = fatoresDisponiveisRecurso.find((f) => f.id === fatorRecursoId);
      const justificativaFormatada = `[Grau Pleiteado: Grau ${novoGrauDesejado} - ${getGrauLabel(novoGrauDesejado)} | Fator Contestado: ${fObj?.codigo || ''} - ${fObj?.nome || ''}]\n\n${fundamentacaoRecurso.trim()}`;
      await api.capd.createRecurso({
        avaliacao_id: espelho.avaliacao_id,
        fator_contestado_id: fatorRecursoId,
        justificativa_servidor: justificativaFormatada,
      });
      setModalRecursoOpen(false);
      setFundamentacaoRecurso('');
      await carregarDadosAvaliacao(selectedAvalId!);
      setFeedback({
        open: true,
        type: 'success',
        title: 'Recurso Administrativo Protocolado',
        message:
          'Seu recurso foi protocolado com sucesso e encaminhado para manifestação e contrarrazões da chefia imediata (Art. 31 da Lei nº 1.704/2006).',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro no Protocolo do Recurso',
        message: err?.response?.data?.message || 'Falha ao protocolar o recurso administrativo.',
      });
    } finally {
      setEnviandoRecurso(false);
    }
  };

  const subTabItems: TabsItem<ServidorSubTab>[] = [
    { key: 'espelho', label: 'Espelho da Avaliação', icon: <FileText className="h-4 w-4" /> },
    { key: 'cit', label: 'Diário de Bordo', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length || undefined },
    { key: 'recurso', label: 'Meu Recurso', icon: <Scale className="h-4 w-4" />, badge: recursos.length || undefined },
  ];

  if (loading && !espelho) return <ScreenState type="loading" title="Carregando portal do servidor avaliado..." />;

  const cycleOptions: SelectOption[] = avaliacoes.map((av) => ({
    value: av.id.toString(),
    label: `Ciclo ${av.ciclo?.ano_referencia || av.ciclo?.nome || av.id}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal do Servidor Avaliado"
        subtitle="Consulta ao espelho funcional de desempenho, diário de bordo e acompanhamento recursal"
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
                <StatCard
                  label="Nota Final do Ciclo (Nc)"
                  value={`${espelhoNotaPontos.toFixed(2)} pts`}
                  caption={espelhoIsElegivel ? 'Acima do corte ≥ 70 pts' : 'Abaixo do corte < 70 pts'}
                  accentClassName={espelhoIsElegivel ? 'border-l-emerald-500' : 'border-l-rose-500'}
                  valueClassName={espelhoIsElegivel ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                  captionClassName={espelhoIsElegivel ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                />
                <StatCard
                  label="Ciclo de Referência"
                  value={espelho.ciclo?.ano_referencia?.toString() || 'Vigente'}
                  caption={espelho.ciclo?.nome || 'Ciclo Anual de Avaliação'}
                  accentClassName="border-l-cyan-500"
                />
                <StatCard
                  label="Devolutiva Presencial"
                  value={espelho.devolutiva_realizada ? 'Realizada' : 'Pendente'}
                  caption={`Gestor: ${espelho.avaliador?.nome || 'Chefia Imediata'}`}
                  accentClassName={espelho.devolutiva_realizada ? 'border-l-emerald-500' : 'border-l-amber-500'}
                  valueClassName={espelho.devolutiva_realizada ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
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
                  <StatusChip label={espelhoIsElegivel ? 'Apto à Progressão' : 'Abaixo do Corte'} variant={espelhoIsElegivel ? 'success' : 'danger'} />
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>0 pts</span> <span className="text-foreground font-bold">{espelhoNotaPontos.toFixed(2)} pts</span> <span>100 pts</span>
                  </div>
                  <div className="relative">
                    <ProgressBar value={espelhoNotaPontos} max={100} color={espelhoIsElegivel ? 'emerald' : 'rose'} />
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
                    <span className="font-mono text-xl font-black text-foreground tabular-nums">{espelhoNotaPontos.toFixed(2)}</span>
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
            <StatCard
              label="Total de Registros"
              value={incidentes.length.toString()}
              caption="Apontamentos fáticos do período"
              accentClassName="border-l-cyan-500"
            />
            <StatCard
              label="Fatos Positivos"
              value={incidentesPositivos.length.toString()}
              caption="Desempenhos exemplares (superação)"
              accentClassName="border-l-emerald-500"
              valueClassName="text-emerald-600 dark:text-emerald-400"
              captionClassName="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Pontos a Desenvolver"
              value={incidentesNegativos.length.toString()}
              caption="Oportunidades de orientação e melhoria"
              accentClassName="border-l-amber-500"
              valueClassName="text-amber-600 dark:text-amber-400"
              captionClassName="text-amber-600 dark:text-amber-400"
            />
          </div>

          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-foreground">Diário de Bordo — Fatos Observáveis (CIT)</h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {incidentesFiltrados.length === incidentes.length
                      ? `${incidentes.length} registros`
                      : `${incidentesFiltrados.length} de ${incidentes.length} registros`}
                  </Badge>
                </div>

                <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCitVisualizacao('tabela')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      citVisualizacao === 'tabela'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5" />
                    Tabela Dinâmica
                  </button>
                  <button
                    type="button"
                    onClick={() => setCitVisualizacao('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      citVisualizacao === 'timeline'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    Linha do Tempo
                  </button>
                </div>
              </div>

              {/* Barra de Filtros Dinâmicos Avançados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/50">
                {/* Busca Textual */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={filtroCitBusca}
                    onChange={(e) => setFiltroCitBusca(e.target.value)}
                    placeholder="Pesquisar fato, fator ou hash..."
                    className="pl-8 pr-8 h-8 text-xs"
                  />
                  {filtroCitBusca && (
                    <button
                      type="button"
                      onClick={() => setFiltroCitBusca('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro de Fator */}
                <div>
                  <Select
                    value={filtroCitFator}
                    onChange={(v) => setFiltroCitFator(v || 'todos')}
                    options={fatoresCitOptions}
                    className="w-full h-8 text-xs"
                  />
                </div>

                {/* Filtro de Período (De / Até) */}
                <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground w-1/2">
                    <span className="text-[11px] font-medium shrink-0">De:</span>
                    <Input
                      type="date"
                      value={filtroCitDataInicio}
                      onChange={(e) => setFiltroCitDataInicio(e.target.value)}
                      className="h-8 text-xs font-mono w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground w-1/2">
                    <span className="text-[11px] font-medium shrink-0">Até:</span>
                    <Input
                      type="date"
                      value={filtroCitDataFim}
                      onChange={(e) => setFiltroCitDataFim(e.target.value)}
                      className="h-8 text-xs font-mono w-full"
                    />
                  </div>
                  {temFiltrosCitAtivos && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0 px-2 cursor-pointer"
                      title="Limpar filtros"
                      onClick={handleLimparFiltrosCit}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Chips de Classificação Metodológica */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { key: 'todos', label: 'Todos os Registros', count: incidentes.length },
                  { key: 'positivo', label: 'Fatos Positivos (Superação)', count: incidentesPositivos.length, dot: 'bg-emerald-500' },
                  { key: 'negativo', label: 'Pontos a Desenvolver', count: incidentesNegativos.length, dot: 'bg-amber-500' },
                ].map((chip) => {
                  const ativo = filtroCitTipo === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFiltroCitTipo(chip.key as any)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
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
            </div>

            {/* Conteúdo Dinâmico: Timeline ou Tabela Analítica */}
            <div className="p-4 bg-muted/10">
              {incidentesFiltrados.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum apontamento encontrado"
                  description="Não constam registros no Diário de Bordo para os filtros selecionados."
                  actionLabel={temFiltrosCitAtivos ? 'Limpar Filtros' : undefined}
                  onAction={temFiltrosCitAtivos ? handleLimparFiltrosCit : undefined}
                />
              ) : citVisualizacao === 'timeline' ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {incidentesFiltrados.map((inc) => {
                    const isPositivo = inc.tipo === 'positivo';
                    const dataObj = new Date(inc.data_ocorrencia);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

                    const servidorNome = espelho?.servidor?.nome || inc.servidor?.nome_completo || 'Servidor Avaliado';
                    const matricula = espelho?.servidor?.matricula || inc.servidor?.matricula || '—';
                    const cargo = espelho?.servidor?.cargo || inc.servidor?.cargo_efetivo || 'Servidor Público Municipal';
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
                                  title={`Hash SHA-256 Imutável: ${hash} (Clique para copiar)`}
                                  onClick={() => {
                                    navigator.clipboard?.writeText(hash);
                                    setFeedback({ open: true, type: 'success', title: 'Hash Copiado', message: `SHA-256 copiado: ${hash}` });
                                  }}
                                >
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  sha256: {hash.slice(0, 10)}...{hash.slice(-6)}
                                </span>
                              )}
                              <span className="text-muted-foreground/70 hidden md:inline">• Válido para fundamentar Graus 1, 2 ou 5</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 self-end sm:self-auto hover:bg-primary/10"
                              onClick={() => setDetalheCitModal(inc)}
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" /> Ver Ficha Completa
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── MODO 2: Tabela Analítica (DataTable) ─────────────────────────── */
                <DataTable
                  columns={columnsCit}
                  data={incidentesFiltrados}
                  loading={loading}
                  emptyText="Nenhum apontamento no Diário de Bordo atende aos filtros aplicados."
                  searchable={false}
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="diario-de-bordo-cit-servidor"
                  exportTitle="CAPD — Diário de Bordo do Servidor Avaliado (CIT)"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'recurso' && (
        <div className="space-y-6">
          {/* ── Banner de Admissibilidade / Tempestividade ──────────────────────── */}
          {!espelho?.ciencia_servidor_em ? (
            <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Ciência Eletrônica Obrigatória (Art. 27 da Lei nº 1.704/2006)
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Para protocolar um recurso administrativo contra as notas da avaliação funcional, é obrigatório registrar previamente a assinatura eletrônica de ciência no espelho. O prazo legal de 10 dias úteis é deflagrado a partir da ciência.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => setModalCienciaOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    <Fingerprint className="h-3.5 w-3.5 mr-1.5" />
                    Registrar Ciência Agora
                  </Button>
                </div>
              </div>
            </div>
          ) : prazoRecursal?.expirado ? (
            <div className="flex items-start gap-4 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10">
              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Prazo Recursal Expirado (Preclusão Administrativa)
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  O prazo legal de 10 dias úteis para interposição de recurso administrativo encerrou-se em{' '}
                  <span className="font-mono font-bold tabular-nums">
                    {prazoRecursal.dataLimite.toLocaleDateString('pt-BR')}
                  </span>
                  . A ciência foi lavrada em{' '}
                  <span className="font-mono font-bold tabular-nums">
                    {prazoRecursal.dataCiencia.toLocaleDateString('pt-BR')}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 shrink-0 mt-0.5">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                    Prazo Recursal Aberto — Tempestividade Preservada (Art. 30)
                  </h4>
                  <Badge variant="outline" className="font-mono text-xs font-bold border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/10">
                    {prazoRecursal?.diasRestantes ?? 0} dias úteis restantes
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ciência protocolada em{' '}
                  <span className="font-mono font-bold text-foreground">
                    {prazoRecursal ? prazoRecursal.dataCiencia.toLocaleDateString('pt-BR') : '—'}
                  </span>
                  . Prazo fatal para protocolo de recurso à CAD:{' '}
                  <span className="font-mono font-bold text-foreground">
                    {prazoRecursal ? prazoRecursal.dataLimite.toLocaleDateString('pt-BR') : '—'}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* ── KPI Cards de Acompanhamento ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total de Recursos"
              value={String(totalRecursos)}
              caption="Interpostos neste ciclo funcional"
              accentClassName="border-l-cyan-500"
            />
            <StatCard
              label="Em Tramitação"
              value={String(recursosEmTramitacao)}
              caption={
                recursosEmTramitacao > 0
                  ? 'Processamento ativo — instrução, chefia ou relatoria'
                  : 'Sem pendências — instrução, chefia ou relatoria'
              }
              accentClassName="border-l-amber-500"
              valueClassName="text-amber-600 dark:text-amber-400"
              captionClassName={recursosEmTramitacao > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}
            />
            <StatCard
              label="Decisões Homologadas"
              value={String(recursosJulgados)}
              caption={
                recursosJulgados > 0
                  ? 'Concluídos — julgados colegiados da CAD'
                  : 'Nenhum julgado — julgados colegiados da CAD'
              }
              accentClassName="border-l-emerald-500"
              valueClassName="text-emerald-600 dark:text-emerald-400"
              captionClassName={recursosJulgados > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
            />
          </div>

          {/* ── Card Institucional e Ação de Interposição ─────────────────────────── */}
          <Card className="p-5 border-l-4 border-l-primary border-border bg-card space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Recurso Administrativo à CAD — Arts. 30 e 31 da Lei nº 1.704/2006
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Garantia do contraditório e da ampla defesa no processo de avaliação funcional de estágio probatório.
                    </p>
                  </div>
                </div>
                <div className="pt-2 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>
                    • <strong className="text-foreground">Prazo Recursal (Art. 30):</strong> 10 dias úteis a contar da ciência eletrônica no espelho de avaliação.
                  </p>
                  <p>
                    • <strong className="text-foreground">Contrarrazões da Chefia Imediata (Art. 31):</strong> A chefia dispõe de 5 dias úteis para prestar esclarecimentos circunstanciados e juntar provas.
                  </p>
                  <p>
                    • <strong className="text-foreground">Julgamento Colegiado (CAD):</strong> Sorteio de relator imparcial na Comissão e deliberação em sessão plenária com emissão de parecer e resolução final.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    if (!espelho?.ciencia_servidor_em) {
                      setFeedback({
                        open: true,
                        type: 'warning',
                        title: 'Ciência Necessária',
                        message: 'Por favor, assine a ciência eletrônica antes de protocolar o recurso.',
                      });
                      return;
                    }
                    if (prazoRecursal?.expirado) {
                      setFeedback({
                        open: true,
                        type: 'warning',
                        title: 'Prazo Precluso',
                        message: 'O prazo regulamentar de 10 dias úteis para interposição de recurso já expirou.',
                      });
                      return;
                    }
                    setModalRecursoOpen(true);
                  }}
                  disabled={!espelho?.ciencia_servidor_em || Boolean(prazoRecursal?.expirado)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-sm cursor-pointer"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Interpor Recurso Administrativo
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Listagem / Histórico de Recursos ───────────────────────────────── */}
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Processos e Recursos Protocolados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acompanhe a instrução processual, manifestação da chefia e decisões colegiadas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Filtrar:</span>
                <Select
                  value={filtroRecursoStatus}
                  onChange={(val) => setFiltroRecursoStatus(val || 'todos')}
                  options={filtroStatusRecursoOptions}
                  className="w-56 text-xs"
                />
              </div>
            </div>

            <div className="p-4">
              {recursosFiltrados.length === 0 ? (
                <EmptyState
                  icon={<Scale className="h-10 w-10 text-muted-foreground" />}
                  title={recursos.length === 0 ? 'Nenhum recurso protocolado' : 'Nenhum recurso encontrado'}
                  description={
                    recursos.length === 0
                      ? 'Caso discorde dos graus atribuídos pela chefia imediata em algum fator, você pode interpor recurso administrativo no prazo de 10 dias úteis.'
                      : 'Não há recursos cadastrados com o status selecionado no filtro.'
                  }
                  actionLabel={
                    espelho?.ciencia_servidor_em && !prazoRecursal?.expirado && recursos.length === 0
                      ? 'Interpor Primeiro Recurso'
                      : undefined
                  }
                  onAction={() => setModalRecursoOpen(true)}
                />
              ) : (
                <DataTable
                  columns={columnsRecursos}
                  data={recursosFiltrados}
                  loading={loading}
                  emptyText="Nenhum recurso encontrado."
                  searchable={false}
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="recursos-administrativos-capd"
                  exportTitle="CAPD — Recursos Administrativos do Servidor"
                />
              )}
            </div>
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
                  <div className="font-mono text-2xl font-black text-foreground mt-0.5">{espelhoNotaPontos.toFixed(2)} pts</div>
                </div>
                <StatusChip label={espelhoIsElegivel ? 'Apto' : 'Abaixo do Corte'} variant={espelhoIsElegivel ? 'success' : 'danger'} />
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

      <Modal
        open={modalRecursoOpen}
        onClose={() => setModalRecursoOpen(false)}
        title="Interposição de Recurso Administrativo à CAD (Art. 30)"
        size="lg"
      >
        <form onSubmit={handleSubmeterRecurso} className="space-y-4 py-2 text-xs">
          <div className="flex items-start gap-3 p-3 bg-status-info-bg border border-status-info-border rounded-lg">
            <Info className="h-4 w-4 text-status-info shrink-0 mt-0.5" />
            <div className="flex-1 text-muted-foreground leading-relaxed">
              Conforme o <strong className="text-foreground">Art. 30 da Lei nº 1.704/2006</strong>, o recurso deve indicar expressamente o fator funcional contestado, o grau pleiteado e as razões de fato e de direito que justificam a revisão da nota.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-foreground">
              Selecione o Fator Funcional Objeto do Recurso: <span className="text-status-danger">*</span>
            </label>
            <Select
              value={fatorRecursoId ? String(fatorRecursoId) : null}
              onChange={(val) => setFatorRecursoId(Number(val))}
              options={fatoresRecursoOptions}
              className="w-full"
            />
          </div>

          {fatorSelecionadoRecurso && (
            <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs">
                  Situação Atual do Fator no Espelho:
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Peso Regimental: <strong className="text-foreground">{fatorSelecionadoRecurso.peso}%</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded bg-background border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Grau Atribuído pela Chefia</span>
                  <div className="font-mono text-base font-bold text-foreground mt-0.5">
                    {fatorSelecionadoRecurso.grauAtual ? `Grau ${fatorSelecionadoRecurso.grauAtual}` : 'Não avaliado'}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nota Ponderada Atual</span>
                  <div className="font-mono text-base font-bold text-foreground mt-0.5">
                    {fatorSelecionadoRecurso.notaAtual !== null ? `${Number(fatorSelecionadoRecurso.notaAtual).toFixed(2)} pts` : '—'}
                  </div>
                </div>
              </div>
              {fatorSelecionadoRecurso.justificativaAtual && (
                <div className="text-[11px] text-muted-foreground bg-background p-2 rounded border border-border/70">
                  <span className="font-semibold text-foreground mr-1">Justificativa da chefia:</span>
                  {fatorSelecionadoRecurso.justificativaAtual}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-foreground">
              Grau Pleiteado na Revisão (1 a 5): <span className="text-status-danger">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNovoGrauDesejado(g)}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    novoGrauDesejado === g
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="font-mono font-bold text-sm text-foreground">Grau {g}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{getGrauLabel(g)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-foreground">
                Razões Recursais Fundamentadas: <span className="text-status-danger">*</span>
              </label>
              <span
                className={`font-mono text-[11px] ${
                  fundamentacaoRecurso.trim().length >= 50 ? 'text-status-success font-semibold' : 'text-status-danger'
                }`}
              >
                {fundamentacaoRecurso.trim().length}/5000 (mínimo de 50 caracteres)
              </span>
            </div>
            <textarea
              rows={5}
              value={fundamentacaoRecurso}
              onChange={(e) => setFundamentacaoRecurso(e.target.value)}
              placeholder="Descreva fundamentadamente os fatos, atividades desenvolvidas e evidências que justificam a alteração da nota..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
            />
            {fundamentacaoRecurso.trim().length > 0 && fundamentacaoRecurso.trim().length < 50 && (
              <p className="text-[11px] text-status-danger flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Faltam {50 - fundamentacaoRecurso.trim().length} caracteres para atingir o mínimo exigido pelo regulamento.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setModalRecursoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={enviandoRecurso || fundamentacaoRecurso.trim().length < 50}
              className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {enviandoRecurso ? 'Protocolando...' : 'Protocolar Recurso'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Autos e Tramitação do Recurso Administrativo ─────────────── */}
      <Modal
        open={!!detalheRecursoModal}
        onClose={() => setDetalheRecursoModal(null)}
        title="Autos do Recurso Administrativo à CAD (Arts. 30 e 31)"
        size="2xl"
      >
        {detalheRecursoModal && (
          <div className="space-y-4 py-2 text-xs">
            {/* Header com Protocolo e Status */}
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">
                    Protocolo #REC-{String(detalheRecursoModal.id).padStart(4, '0')}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Protocolado em: {new Date(detalheRecursoModal.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status Atual:</span>
                  {getStatusRecursoBadge(detalheRecursoModal.status)}
                </div>
                {detalheRecursoModal.prazo_julgamento && (
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Prazo Limite para Julgamento: {new Date(detalheRecursoModal.prazo_julgamento).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            {/* Fases Regimentais da Tramitação */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Fluxo Regimental de Tramitação (Arts. 30 e 31)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-lg border border-status-success-border bg-status-success-bg text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 font-bold text-status-success text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    1. Interposição
                  </div>
                  <p className="text-[10px] text-muted-foreground">Protocolado pelo servidor</p>
                </div>
                <div className={`p-2.5 rounded-lg border text-center space-y-1 ${
                  detalheRecursoModal.contestacao_chefia
                    ? 'border-status-success-border bg-status-success-bg'
                    : 'border-border bg-muted/20'
                }`}>
                  <div className={`flex items-center justify-center gap-1 font-bold text-[11px] ${
                    detalheRecursoModal.contestacao_chefia ? 'text-status-success' : 'text-muted-foreground'
                  }`}>
                    {detalheRecursoModal.contestacao_chefia ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    2. Chefia Imediata
                  </div>
                  <p className="text-[10px] text-muted-foreground">Contrarrazões (Art. 31)</p>
                </div>
                <div className={`p-2.5 rounded-lg border text-center space-y-1 ${
                  detalheRecursoModal.relator
                    ? 'border-status-success-border bg-status-success-bg'
                    : 'border-border bg-muted/20'
                }`}>
                  <div className={`flex items-center justify-center gap-1 font-bold text-[11px] ${
                    detalheRecursoModal.relator ? 'text-status-success' : 'text-muted-foreground'
                  }`}>
                    {detalheRecursoModal.relator ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    3. Relatoria CAD
                  </div>
                  <p className="text-[10px] text-muted-foreground">Distribuição e parecer</p>
                </div>
                <div className={`p-2.5 rounded-lg border text-center space-y-1 ${
                  ['julgado_provido', 'julgado_desprovido'].includes(detalheRecursoModal.status)
                    ? 'border-status-success-border bg-status-success-bg'
                    : 'border-border bg-muted/20'
                }`}>
                  <div className={`flex items-center justify-center gap-1 font-bold text-[11px] ${
                    ['julgado_provido', 'julgado_desprovido'].includes(detalheRecursoModal.status)
                      ? 'text-status-success'
                      : 'text-muted-foreground'
                  }`}>
                    {['julgado_provido', 'julgado_desprovido'].includes(detalheRecursoModal.status) ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    4. Julgamento
                  </div>
                  <p className="text-[10px] text-muted-foreground">Decisão colegiada</p>
                </div>
              </div>
            </div>

            {/* Fator Contestado */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Fator Objeto da Contestação
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-foreground">
                  {detalheRecursoModal.fatorContestado?.nome ||
                    detalheRecursoModal.fator_contestado?.nome ||
                    `Fator #${detalheRecursoModal.fator_contestado_id}`}
                </div>
                {(detalheRecursoModal.fatorContestado?.codigo || detalheRecursoModal.fator_contestado?.codigo) && (
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                    {detalheRecursoModal.fatorContestado?.codigo || detalheRecursoModal.fator_contestado?.codigo}
                  </Badge>
                )}
              </div>
            </div>

            {/* Razões Recursais do Servidor */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Razões e Fundamentação do Servidor (Art. 30):</span>
              </div>
              <div className="bg-muted/20 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {detalheRecursoModal.justificativa_servidor}
              </div>
            </div>

            {/* Manifestação / Contrarrazões da Chefia Imediata (Art. 31) */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  <span>Contrarrazões da Chefia Imediata (Art. 31):</span>
                </div>
                <Badge
                  variant={detalheRecursoModal.contestacao_chefia ? 'success' : 'outline'}
                  className="text-[10px]"
                >
                  {detalheRecursoModal.contestacao_chefia ? 'Juntada nos Autos' : 'Pendente (Prazo: 5 dias úteis)'}
                </Badge>
              </div>
              {detalheRecursoModal.contestacao_chefia ? (
                <div className="bg-muted/20 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {detalheRecursoModal.contestacao_chefia}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/10 border border-dashed border-border text-center text-[11px] text-muted-foreground">
                  A chefia imediata ainda não prestou as contrarrazões regimentais no prazo de 5 dias úteis.
                </div>
              )}
            </div>

            {/* Relatoria e Sessão Colegiada */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>Instrução na Comissão de Avaliação de Desempenho (CAD):</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {detalheRecursoModal.relator ? 'Relator Designado' : 'Aguardando Sorteio'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Relator Designado:</span>
                  <span className="font-semibold text-foreground">
                    {detalheRecursoModal.relator?.nome_completo || detalheRecursoModal.relator?.name || 'Aguardando distribuição'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Prazo de Conclusão do Voto:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {detalheRecursoModal.prazo_relator_ate
                      ? new Date(detalheRecursoModal.prazo_relator_ate).toLocaleDateString('pt-BR')
                      : 'Conforme pauta regimental'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium cursor-pointer border-primary/40 hover:bg-primary/5 text-primary"
                onClick={() => handleImprimirRecurso(detalheRecursoModal)}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Imprimir Termo de Recurso (PDF)
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-4 cursor-pointer"
                onClick={() => setDetalheRecursoModal(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Ficha Circunstanciada do Incidente Crítico (CIT) ──────── */}
      <Modal
        open={!!detalheCitModal}
        onClose={() => {
          setDetalheCitModal(null);
          setCopiadoHash(false);
        }}
        title="Ficha Circunstanciada do Incidente Crítico (CIT)"
        size="2xl"
      >
        {detalheCitModal && (
          <div className="space-y-4 py-2 text-xs">
            {/* Banner com Hash SHA-256 e Integridade */}
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-foreground">Protocolo Digital de Auditoria Imutável</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ID #{detalheCitModal.id}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Registrado em: {new Date(detalheCitModal.created_at || detalheCitModal.data_ocorrencia).toLocaleString('pt-BR')}
                </div>
              </div>

              {detalheCitModal.hash_sha256 && (
                <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-lg border border-border/80">
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    <span className="text-foreground/70 font-semibold mr-1">SHA-256:</span>
                    {detalheCitModal.hash_sha256}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard?.writeText(detalheCitModal.hash_sha256 || '');
                      setCopiadoHash(true);
                      setTimeout(() => setCopiadoHash(false), 2000);
                    }}
                  >
                    {copiadoHash ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Grid com Dados do Servidor e Classificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card Servidor */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Servidor Avaliado
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-foreground">
                    {espelho?.servidor?.nome || detalheCitModal.servidor?.nome_completo || `Servidor #${detalheCitModal.servidor_id}`}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Matrícula:</span>
                    <span className="font-mono font-bold text-foreground">
                      {espelho?.servidor?.matricula || detalheCitModal.servidor?.matricula || '—'}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Cargo:</span>{' '}
                    <span className="text-foreground font-medium">
                      {espelho?.servidor?.cargo || detalheCitModal.servidor?.cargo_efetivo || 'Servidor Público'}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Lotação:</span>{' '}
                    <span className="text-foreground font-medium">
                      {detalheCitModal.servidor?.lotacao_fisica || detalheCitModal.servidor?.orgao_lotacao || 'Órgão de Origem'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Metadados do Fato */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Classificação Metodológica
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Natureza da Conduta:</span>
                    <Badge
                      variant={detalheCitModal.tipo === 'positivo' ? 'success' : 'outline'}
                      className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                        detalheCitModal.tipo !== 'positivo'
                          ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                          : ''
                      }`}
                    >
                      {detalheCitModal.tipo === 'positivo' ? (
                        <>
                          <ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" />
                          Fato Positivo (Superação)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" />
                          Ponto a Desenvolver
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fator Vinculado:</span>
                    <span className="font-bold text-foreground">
                      {detalheCitModal.fator?.nome || `Fator #${detalheCitModal.fator_id}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Data da Ocorrência:</span>
                    <span className="font-mono font-bold text-foreground">
                      {new Date(detalheCitModal.data_ocorrencia).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Efeito na Avaliação:</span>
                    <span className="font-semibold text-primary">
                      {detalheCitModal.tipo === 'positivo' ? 'Habilita Graus 4 ou 5' : 'Habilita Graus 1 ou 2'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição Circunstanciada do Fato */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Descrição Circunstanciada do Fato Observado:</span>
              </div>
              <div className="bg-muted/20 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden">
                {detalheCitModal.descricao_fato}
              </div>
            </div>

            {/* Evidências Documentais Vinculadas */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span>Evidências e Documentos Probatórios Vinculados:</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {(detalheCitModal.evidencias?.length || 0)} anexo(s)
                </Badge>
              </div>

              {detalheCitModal.evidencias && detalheCitModal.evidencias.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detalheCitModal.evidencias.map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/80 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-foreground truncate">{ev.nome_original || 'Documento Comprobatório'}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            SHA: {ev.hash_sha256 ? `${ev.hash_sha256.substring(0, 16)}...` : 'Certificado'}
                          </div>
                        </div>
                      </div>
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-primary hover:bg-primary/10 rounded cursor-pointer shrink-0 text-[11px] font-medium"
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/10 border border-dashed border-border/80 text-center text-[11px] text-muted-foreground">
                  Nenhum arquivo digital anexado a este apontamento. O registro é fundamentado na declaração circunstanciada da chefia imediata com protocolo digital de auditoria imutável.
                </div>
              )}
            </div>

            {/* Fundamentação Legal e Blindagem da Trava Anti-Leniência */}
            <div className="rounded-xl border-l-4 border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/20 p-3.5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                Fundamento Regulamentar e Trava Anti-Leniência
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-indigo-300">
                Este apontamento integra o prontuário permanente do servidor durante o estágio probatório. Em cumprimento à metodologia canônica da Escala Gráfica combinada com a Técnica do Incidente Crítico (CIT), notas extremas (Graus 1, 2 ou 5) no fator correlato exigem esta evidência documental prévia para validade homologatória perante a Comissão Permanente (CAPD).
              </p>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium cursor-pointer border-primary/40 hover:bg-primary/5 text-primary"
                onClick={() => handleImprimirTermoCit(detalheCitModal)}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Imprimir Termo Oficial (PDF)
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-4"
                onClick={() => setDetalheCitModal(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
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
