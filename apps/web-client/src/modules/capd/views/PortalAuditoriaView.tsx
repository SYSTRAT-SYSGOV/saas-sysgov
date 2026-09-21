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
  StatCard,
} from '@sysgov/ui';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FileCheck,
  Hash,
  ExternalLink,
  Plus,
  RefreshCw,
  Download,
  Eye,
  Sliders,
  FileText,
  Copy,
  Check,
  XCircle,
  Activity,
  Layers,
  Scale,
  Calendar,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiImpedimentoAuditoria,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type TrilhaForenseItem,
  type ItemAmostragemAuditoria,
  type LogAcessoLgpd,
  calculateAuditoriaKpis,
  isValidSha256,
  verificarHashNaTrilha,
  maskCpf,
  getMotivoAmostragemLabel,
  getAcaoLgpdLabel,
  gerarCsvTrilhaForense,
  gerarCsvAmostragem,
} from './PortalAuditoriaView.utils';

const api = new SysgovApi();

type AuditoriaSubTab = 'impedimentos' | 'amostragem' | 'trilha-forense' | 'lgpd';

// Dados semente para demonstração e resiliência offline
const INITIAL_TRILHA: TrilhaForenseItem[] = [
  {
    id: 1042,
    acao: 'capd.ciencia_servidor',
    modulo: 'CAPD / Avaliacao',
    entidade: 'capd_avaliacoes',
    entidade_id: 12,
    usuario: 'Carlos Silva (Mat: 4401)',
    ip: '192.168.10.45',
    timestamp: '2026-09-13T14:22:10-03:00',
    hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    integridade: 'valida',
  },
  {
    id: 1041,
    acao: 'capd.devolutiva_presencial',
    modulo: 'CAPD / Devolutiva',
    entidade: 'capd_avaliacoes',
    entidade_id: 12,
    usuario: 'Mariana Lima (Chefia Mat: 1102)',
    ip: '192.168.10.12',
    timestamp: '2026-09-13T13:45:00-03:00',
    hash_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    integridade: 'valida',
  },
  {
    id: 1040,
    acao: 'capd.recurso_julgado',
    modulo: 'CAPD / CAD',
    entidade: 'capd_recursos',
    entidade_id: 4,
    usuario: 'Comissão CAD (Sessão Deliberativa #2)',
    ip: '192.168.10.5',
    timestamp: '2026-09-13T11:15:33-03:00',
    hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    integridade: 'valida',
  },
  {
    id: 1039,
    acao: 'capd.diario_bordo_criado',
    modulo: 'CAPD / CIT',
    entidade: 'capd_diario_bordo',
    entidade_id: 88,
    usuario: 'Mariana Lima (Chefia Mat: 1102)',
    ip: '192.168.10.12',
    timestamp: '2026-09-12T16:08:21-03:00',
    hash_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    integridade: 'valida',
  },
  {
    id: 1038,
    acao: 'capd.homologacao_exportada',
    modulo: 'CAPD / Folha',
    entidade: 'capd_homologacoes',
    entidade_id: 205,
    usuario: 'Roberto Souza (DRH)',
    ip: '192.168.10.20',
    timestamp: '2026-09-12T10:14:05-03:00',
    hash_sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    integridade: 'valida',
  },
];

const INITIAL_AMOSTRAGEM: ItemAmostragemAuditoria[] = [
  {
    id: 1,
    avaliacao_id: 101,
    servidor_nome: 'Fernanda Rocha Ribeiro',
    matricula: 'MAT-2024-0012',
    cargo: 'Fiscal de Tributos Municipais',
    avaliador_nome: 'Carlos Eduardo Silveira',
    nota_final: 9.85,
    motivo_auditoria: 'nota_extrema_alta',
    possui_cit: true,
    qtd_incidentes_cit: 4,
    status_parecer: 'pendente',
    parecer_texto: null,
  },
  {
    id: 2,
    avaliacao_id: 102,
    servidor_nome: 'Marcos Vinicius de Souza',
    matricula: 'MAT-2023-0881',
    cargo: 'Motorista de Veículos Pesados',
    avaliador_nome: 'Carlos Eduardo Silveira',
    nota_final: 3.40,
    motivo_auditoria: 'nota_extrema_baixa',
    possui_cit: false,
    qtd_incidentes_cit: 0,
    status_parecer: 'reavaliacao',
    parecer_texto: 'Ausência de apontamentos prévios no Diário de Bordo (CIT) para respaldo da nota de Grau 1.',
    analisado_em: '2026-09-18T15:30:00Z',
  },
  {
    id: 3,
    avaliacao_id: 103,
    servidor_nome: 'Juliana Mendes Santos',
    matricula: 'MAT-2022-0450',
    cargo: 'Analista de Gestão Pública',
    avaliador_nome: 'Ana Beatriz Ramos',
    nota_final: 8.60,
    motivo_auditoria: 'amostragem_10',
    possui_cit: true,
    qtd_incidentes_cit: 2,
    status_parecer: 'aprovado',
    parecer_texto: 'Amostragem regular sorteada para prestação de contas ao Tribunal de Contas Municipal.',
    analisado_em: '2026-09-17T09:15:00Z',
  },
  {
    id: 4,
    avaliacao_id: 104,
    servidor_nome: 'Paulo Henrique Nogueira',
    matricula: 'MAT-2025-0119',
    cargo: 'Engenheiro Civil',
    avaliador_nome: 'Ana Beatriz Ramos',
    nota_final: 9.90,
    motivo_auditoria: 'sem_diario_cit',
    possui_cit: false,
    qtd_incidentes_cit: 0,
    status_parecer: 'pendente',
    parecer_texto: null,
  },
];

const INITIAL_LGPD_LOGS: LogAcessoLgpd[] = [
  {
    id: 201,
    usuario: 'Roberto Souza (Gestor DRH)',
    cargo_usuario: 'Diretor de Recursos Humanos',
    acao: 'exportacao_dados',
    servidor_alvo: 'Quadro Geral de Servidores Efetivos',
    matricula_alvo: 'LOTE-COMPLETO',
    ip: '192.168.10.20',
    timestamp: '2026-09-20T16:15:00-03:00',
    justificativa: 'Exportação oficial da folha de pagamento para aplicação do reajuste funcional (+10%).',
  },
  {
    id: 202,
    usuario: 'Mariana Lima (Membro Comissão CAD)',
    cargo_usuario: 'Presidente da Comissão Especial',
    acao: 'consulta_prontuario',
    servidor_alvo: 'Fernanda Rocha Ribeiro',
    matricula_alvo: 'MAT-2024-0012',
    ip: '192.168.10.12',
    timestamp: '2026-09-20T14:40:00-03:00',
    justificativa: 'Instrução do julgamento de recurso ordinário interposto tempestivamente.',
  },
  {
    id: 203,
    usuario: 'Carlos Silva (Servidor Avaliado)',
    cargo_usuario: 'Técnico Administrativo',
    acao: 'visualizacao_espelho',
    servidor_alvo: 'Carlos Silva',
    matricula_alvo: 'MAT-2024-4401',
    ip: '192.168.10.45',
    timestamp: '2026-09-19T11:20:00-03:00',
    justificativa: 'Consulta individual ao espelho de avaliação através do portal embutido com token.',
  },
];

export interface PortalAuditoriaViewProps {
  portalSelector?: React.ReactNode;
}

export const PortalAuditoriaView: React.FC<PortalAuditoriaViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<AuditoriaSubTab>('impedimentos');
  const [loading, setLoading] = useState<boolean>(true);
  const [impedimentos, setImpedimentos] = useState<ApiImpedimentoAuditoria[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);
  const [trilhaForense, setTrilhaForense] = useState<TrilhaForenseItem[]>(INITIAL_TRILHA);
  const [amostragem, setAmostragem] = useState<ItemAmostragemAuditoria[]>(INITIAL_AMOSTRAGEM);
  const [lgpdLogs, setLgpdLogs] = useState<LogAcessoLgpd[]>(INITIAL_LGPD_LOGS);

  // Filtros
  const [filtroStatusImpedimento, setFiltroStatusImpedimento] = useState<string>('todos');
  const [filtroModuloTrilha, setFiltroModuloTrilha] = useState<string>('todos');
  const [buscaTrilha, setBuscaTrilha] = useState<string>('');

  // Verificador de Integridade SHA-256
  const [verificandoHash, setVerificandoHash] = useState<boolean>(false);
  const [hashParaVerificar, setHashParaVerificar] = useState<string>('');
  const [resultadoVerificacao, setResultadoVerificacao] = useState<{
    valido: boolean;
    mensagem: string;
    registro?: any;
  } | null>(null);

  // Modais
  const [modalDeclararOpen, setModalDeclararOpen] = useState<boolean>(false);
  const [servidorAlvoId, setServidorAlvoId] = useState<string>('');
  const [tipoImpedimento, setTipoImpedimento] = useState<string>('parentesco_3_grau');
  const [motivoDeclaracao, setMotivoDeclaracao] = useState<string>('');
  const [salvandoDeclaracao, setSalvandoDeclaracao] = useState<boolean>(false);

  // Modal de Parecer de Auditoria (Amostragem)
  const [modalParecerOpen, setModalParecerOpen] = useState<boolean>(false);
  const [itemAmostraSelecionado, setItemAmostraSelecionado] = useState<ItemAmostragemAuditoria | null>(null);
  const [novoParecerStatus, setNovoParecerStatus] = useState<ItemAmostragemAuditoria['status_parecer']>('aprovado');
  const [novoParecerTexto, setNovoParecerTexto] = useState<string>('');

  // Modal de Desativação / Resolução de Impedimento
  const [modalDesativarImpOpen, setModalDesativarImpOpen] = useState<boolean>(false);
  const [impedimentoParaDesativar, setImpedimentoParaDesativar] = useState<ApiImpedimentoAuditoria | null>(null);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Carregar dados de auditoria
  const carregarDadosAuditoria = useCallback(async () => {
    setLoading(true);
    try {
      const [resImp, resServ] = await Promise.all([
        api.capd.listarImpedimentosAuditoria().catch(() => []),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);

      if (Array.isArray(resImp) && resImp.length > 0) {
        setImpedimentos(resImp);
      } else {
        // Mock semente de impedimentos para demonstração inicial se vazio
        setImpedimentos([
          {
            id: 1,
            servidor_alvo_id: 12,
            servidor_alvo: { id: 12, nome_completo: 'Carlos Silva Santos', matricula: 'MAT-4401' },
            declarado_por: 'Comissão Especial de Avaliação',
            substituto_designado: { id: 14, nome_completo: 'Roberto Albuquerque', matricula: 'MAT-3320' },
            tipo_impedimento: 'parentesco_3_grau',
            motivo: 'Avaliador é tio consanguíneo do avaliado (vedação expressa do Art. 31 da Lei 1.704/2006).',
            status: 'ativo',
            declarado_em: '12/09/2026 14:10',
          },
          {
            id: 2,
            servidor_alvo_id: 19,
            servidor_alvo: { id: 19, nome_completo: 'Juliana Mendes Nogueira', matricula: 'MAT-2204' },
            declarado_por: 'Auditoria e Controle Interno',
            substituto_designado: { id: 25, nome_completo: 'Patricia Vasconcelos', matricula: 'MAT-1109' },
            tipo_impedimento: 'interesse_direto',
            motivo: 'Membro da comissão é coautor em processo contencioso com o avaliado.',
            status: 'ativo',
            declarado_em: '10/09/2026 09:30',
          },
        ]);
      }
      setServidores(Array.isArray(resServ) ? resServ : resServ.data || []);
    } catch (e) {
      console.warn('Utilizando dados locais de auditoria:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosAuditoria();
  }, [carregarDadosAuditoria]);

  // KPIs consolidados
  const kpis = useMemo(() => {
    return calculateAuditoriaKpis(impedimentos, trilhaForense, amostragem);
  }, [impedimentos, trilhaForense, amostragem]);

  // Filtragem de Impedimentos
  const filteredImpedimentos = useMemo(() => {
    return impedimentos.filter((imp) => {
      if (filtroStatusImpedimento === 'todos') return true;
      return imp.status === filtroStatusImpedimento;
    });
  }, [impedimentos, filtroStatusImpedimento]);

  // Filtragem de Trilha Forense
  const filteredTrilha = useMemo(() => {
    return trilhaForense.filter((t) => {
      const matchBusca =
        !buscaTrilha ||
        t.acao.toLowerCase().includes(buscaTrilha.toLowerCase()) ||
        t.usuario.toLowerCase().includes(buscaTrilha.toLowerCase()) ||
        t.ip.includes(buscaTrilha) ||
        t.hash_sha256.toLowerCase().includes(buscaTrilha.toLowerCase());

      const matchModulo = filtroModuloTrilha === 'todos' || t.modulo.toLowerCase().includes(filtroModuloTrilha.toLowerCase());

      return matchBusca && matchModulo;
    });
  }, [trilhaForense, buscaTrilha, filtroModuloTrilha]);

  // Handlers de Ações
  const handleDeclararImpedimento = async () => {
    if (!servidorAlvoId || !motivoDeclaracao.trim()) {
      showToast('Selecione o servidor e preencha a fundamentação fática.');
      return;
    }

    setSalvandoDeclaracao(true);
    try {
      const targetServ = servidores.find((s) => String(s.id) === servidorAlvoId);
      const novo: ApiImpedimentoAuditoria = {
        id: Date.now(),
        servidor_alvo_id: Number(servidorAlvoId),
        servidor_alvo: targetServ ? { id: targetServ.id, nome_completo: targetServ.nome_completo, matricula: targetServ.matricula } : 'Servidor',
        substituto_designado: { id: 99, nome_completo: 'Substituto Legal Automático', matricula: 'MAT-SUB-01' },
        tipo_impedimento: tipoImpedimento,
        motivo: motivoDeclaracao,
        declarado_por: 'Controle Interno Municipal',
        status: 'ativo',
        declarado_em: new Date().toLocaleString('pt-BR'),
      };

      setImpedimentos([novo, ...impedimentos]);
      setModalDeclararOpen(false);
      setMotivoDeclaracao('');
      setServidorAlvoId('');
      showToast('Impedimento lavrado com sucesso no prontuário de auditoria!');
    } finally {
      setSalvandoDeclaracao(false);
    }
  };

  const handleConfirmarDesativacao = (justificativa: string) => {
    if (!impedimentoParaDesativar) return;

    setImpedimentos((prev) =>
      prev.map((i) =>
        i.id === impedimentoParaDesativar.id
          ? { ...i, status: 'resolvido', motivo: `${i.motivo} [RESOLVIDO: ${justificativa}]` }
          : i
      )
    );
    setModalDesativarImpOpen(false);
    setImpedimentoParaDesativar(null);
    showToast('Impedimento homologado como resolvido pelo Controle Interno.');
  };

  const handleSalvarParecerAmostragem = () => {
    if (!itemAmostraSelecionado) return;

    setAmostragem((prev) =>
      prev.map((a) =>
        a.id === itemAmostraSelecionado.id
          ? {
              ...a,
              status_parecer: novoParecerStatus,
              parecer_texto: novoParecerTexto,
              analisado_em: new Date().toISOString(),
            }
          : a
      )
    );
    setModalParecerOpen(false);
    setItemAmostraSelecionado(null);
    showToast('Parecer de auditoria lavrado com sucesso!');
  };

  const handleVerificarHash = () => {
    if (!hashParaVerificar.trim()) return;
    setVerificandoHash(true);
    setTimeout(() => {
      const res = verificarHashNaTrilha(hashParaVerificar, trilhaForense);
      setResultadoVerificacao(res);
      setVerificandoHash(false);
    }, 250);
  };

  const handleExportarCsvTrilha = () => {
    const csv = gerarCsvTrilhaForense(filteredTrilha);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trilha-forense-capd-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Dossiê da Trilha Forense exportado com sucesso!');
  };

  const handleExportarCsvAmostragem = () => {
    const csv = gerarCsvAmostragem(amostragem);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amostragem-tcm-capd-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Relatório de Amostragem exportado com sucesso!');
  };

  // Colunas do DataTable de Impedimentos
  const columnsImpedimentos = useMemo<ColumnDef<ApiImpedimentoAuditoria>[]>(
    () => [
      {
        accessorKey: 'tipo_impedimento',
        header: 'Tipo do Impedimento',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.tipo_impedimento.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-[11px] text-muted-foreground line-clamp-1">{row.original.motivo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'servidor_alvo',
        header: 'Servidor Alvo',
        cell: ({ row }) => {
          const alvo = row.original.servidor_alvo;
          const nome = typeof alvo === 'string' ? alvo : alvo?.nome_completo || `ID #${row.original.servidor_alvo_id}`;
          const mat = typeof alvo === 'object' ? alvo?.matricula : '-';
          return (
            <div>
              <div className="font-semibold text-xs text-foreground">{nome}</div>
              <div className="font-mono text-[11px] text-muted-foreground">Mat: {mat}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'substituto_designado',
        header: 'Substituto Designado',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.substituto_designado?.nome_completo || 'Substituto Legal'}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Competência transferida</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 110,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.status.toUpperCase()}
            variant={row.original.status === 'ativo' ? 'warning' : 'neutral'}
          />
        ),
      },
      {
        accessorKey: 'declarado_em',
        header: 'Data Registro',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.original.declarado_em}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        cell: ({ row }) => (
          row.original.status === 'ativo' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] text-amber-600 hover:text-amber-700"
              onClick={() => {
                setImpedimentoParaDesativar(row.original);
                setModalDesativarImpOpen(true);
              }}
            >
              Resolver
            </Button>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Arquivado</Badge>
          )
        ),
      },
    ],
    []
  );

  // Colunas do DataTable da Amostragem / Anti-Leniência
  const columnsAmostragem: ColumnDef<ItemAmostragemAuditoria>[] = [
    {
      accessorKey: 'servidor_nome',
      header: 'Servidor / Matrícula',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.original.servidor_nome}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{row.original.matricula} • {row.original.cargo}</div>
        </div>
      ),
    },
    {
      accessorKey: 'avaliador_nome',
      header: 'Avaliador da Unidade',
      cell: ({ row }) => (
        <span className="text-xs text-foreground font-medium">{row.original.avaliador_nome}</span>
      ),
    },
    {
      accessorKey: 'nota_final',
      header: 'Nota Final',
      size: 100,
      cell: ({ row }) => {
        const nota = row.original.nota_final;
        const color = nota >= 9.5 ? 'text-amber-600 font-bold' : nota < 4 ? 'text-rose-600 font-bold' : 'text-foreground';
        return (
          <span className={`font-mono text-xs tabular-nums ${color}`}>
            {nota.toFixed(2)} pts
          </span>
        );
      },
    },
    {
      accessorKey: 'motivo_auditoria',
      header: 'Enquadramento Auditoria',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[11px]">
          {getMotivoAmostragemLabel(row.original.motivo_auditoria)}
        </Badge>
      ),
    },
    {
      accessorKey: 'possui_cit',
      header: 'Diário CIT?',
      size: 120,
      cell: ({ row }) => (
        row.original.possui_cit ? (
          <Badge variant="success" className="text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> {row.original.qtd_incidentes_cit} CIT(s)
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3" /> Sem Apontamento
          </Badge>
        )
      ),
    },
    {
      accessorKey: 'status_parecer',
      header: 'Parecer Auditoria',
      size: 120,
      cell: ({ row }) => {
        const s = row.original.status_parecer;
        if (s === 'aprovado') return <Badge variant="success" className="text-[10px]">Aprovado</Badge>;
        if (s === 'reavaliacao') return <Badge variant="destructive" className="text-[10px]">Reavaliação</Badge>;
        if (s === 'diligencia') return <Badge variant="warning" className="text-[10px]">Diligência</Badge>;
        return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
      },
    },
    {
      id: 'acoes',
      header: 'Ações',
      size: 100,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => {
            setItemAmostraSelecionado(row.original);
            setNovoParecerStatus(row.original.status_parecer === 'pendente' ? 'aprovado' : row.original.status_parecer);
            setNovoParecerTexto(row.original.parecer_texto || '');
            setModalParecerOpen(true);
          }}
        >
          <Eye className="h-3 w-3" /> Parecer
        </Button>
      ),
    },
  ];

  // Colunas do DataTable da Trilha Forense
  const columnsTrilha = useMemo<ColumnDef<TrilhaForenseItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Log #',
        size: 75,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'acao',
        header: 'Ação Auditada & Módulo',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">{row.original.acao}</div>
            <div className="text-[11px] text-muted-foreground">{row.original.modulo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'usuario',
        header: 'Agente Responsável & IP',
        cell: ({ row }) => (
          <div>
            <div className="text-xs text-foreground font-medium">{row.original.usuario}</div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{row.original.ip}</div>
          </div>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Carimbo UTC-3',
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {new Date(row.original.timestamp).toLocaleString('pt-BR')}
          </span>
        ),
      },
      {
        accessorKey: 'hash_sha256',
        header: 'Assinatura SHA-256',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 font-mono text-[10px] text-primary truncate max-w-xs tabular-nums">
            <span className="truncate">{row.original.hash_sha256}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(row.original.hash_sha256);
                showToast('Hash SHA-256 copiado!');
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
      {
        accessorKey: 'integridade',
        header: 'Integridade',
        size: 110,
        cell: ({ row }) => (
          row.original.integridade === 'valida' ? (
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Íntegra
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] font-mono flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Violada
            </Badge>
          )
        ),
      },
    ],
    []
  );

  // Colunas do DataTable de Acessos LGPD
  const columnsLgpd: ColumnDef<LogAcessoLgpd>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Data / Hora',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {new Date(row.original.timestamp).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      accessorKey: 'usuario',
      header: 'Operador / Cargo',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.original.usuario}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.cargo_usuario}</div>
        </div>
      ),
    },
    {
      accessorKey: 'acao',
      header: 'Ação Realizada',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {getAcaoLgpdLabel(row.original.acao)}
        </Badge>
      ),
    },
    {
      accessorKey: 'servidor_alvo',
      header: 'Dado Sensível Consultado',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.original.servidor_alvo}</div>
          <div className="font-mono text-[10px] text-muted-foreground">CPF Mascarado: {maskCpf('12345678900')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'ip',
      header: 'IP de Acesso',
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{row.original.ip}</span>
      ),
    },
    {
      accessorKey: 'justificativa',
      header: 'Finalidade Legal (LGPD)',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground line-clamp-1">{row.original.justificativa}</span>
      ),
    },
  ];

  const subTabItems: TabsItem<AuditoriaSubTab>[] = [
    { key: 'impedimentos', label: 'Impedimentos & Parentesco', icon: <UserX className="h-4 w-4" />, badge: impedimentos.length },
    { key: 'amostragem', label: 'Fila de Amostragem & Anti-Leniência', icon: <Scale className="h-4 w-4" />, badge: kpis.totalFilaAmostragem },
    { key: 'trilha-forense', label: 'Trilha Forense & SHA-256', icon: <Hash className="h-4 w-4" />, badge: trilhaForense.length },
    { key: 'lgpd', label: 'Conformidade LGPD & Acessos', icon: <Lock className="h-4 w-4" />, badge: lgpdLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 rounded-lg text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setToastMessage(null)} className="h-6 w-6 p-0">
            ×
          </Button>
        </div>
      )}

      {/* HEADER DA PÁGINA */}
      <PageHeader
        icon={<ShieldAlert className="h-6 w-6 text-primary" />}
        title="Portal de Auditoria e Controle Interno"
        subtitle="Fiscalização de impedimentos de parentesco (Art. 31), amostragem mandatória, trava anti-leniência e rastro criptográfico SHA-256."
        badge="Controle Interno Municipal"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {portalSelector}
            <Button size="sm" variant="outline" onClick={carregarDadosAuditoria} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Trilha
            </Button>
            <Button size="sm" onClick={() => setModalDeclararOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Declarar Impedimento
            </Button>
          </div>
        }
      />

      {/* ── PAINEL EXECUTIVO: KPIS DE CONTROLE INTERNO ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Impedimentos & Suspeições"
          value={`${kpis.impedimentosAtivos} Ativos`}
          caption="Vedações de parentesco até 3º grau"
          accentClassName="border-l-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400 font-mono tabular-nums"
        />
        <StatCard
          label="Trilha Forense Imutável"
          value={String(kpis.totalEventosForenses)}
          caption="Eventos auditados com carimbo UTC"
          accentClassName="border-l-indigo-500"
          valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums"
        />
        <StatCard
          label="Fila de Amostragem & Anti-Leniência"
          value={`${kpis.totalFilaAmostragem} Pendentes`}
          caption="Notas extremas em escrutínio"
          accentClassName="border-l-rose-500"
          valueClassName="text-rose-600 dark:text-rose-400 font-mono tabular-nums"
        />
        <StatCard
          label="Integridade Criptográfica"
          value={`${kpis.taxaIntegridadeSha256}%`}
          caption="Assinaturas digitais conformes"
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums"
        />
      </div>

      {/* SUB-NAVEGAÇÃO POR ABAS */}
      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── SUB-ABA 1: MONITOR DE IMPEDIMENTOS E PARENTESCO ─────────── */}
      {activeTab === 'impedimentos' && (
        <div className="space-y-4">
          <Card className="p-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Bloqueio Legal de Vínculos de Parentesco (Art. 31 da Lei nº 1.704/2006)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Chefias imediatas ou membros de comissão com grau de parentesco até 3º grau (cônjuge, pais, filhos, irmãos, tios, sobrinhos)
                  com servidores avaliados são impedidos de avaliar ou julgar. O sistema redireciona o fluxo para o substituto oficial da unidade.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Impedimentos Funcionais Registrados</h4>
                <p className="text-xs text-muted-foreground">Fiscalização permanente da matriz de conflitos de interesse da comissão.</p>
              </div>

              <div className="w-48">
                <Select
                  value={filtroStatusImpedimento}
                  onChange={(val) => setFiltroStatusImpedimento(val)}
                  options={[
                    { value: 'todos', label: 'Todos os Status' },
                    { value: 'ativo', label: 'Apenas Ativos' },
                    { value: 'resolvido', label: 'Resolvidos / Baixados' },
                  ]}
                />
              </div>
            </div>

            {filteredImpedimentos.length === 0 && !loading ? (
              <EmptyState
                icon={<ShieldCheck className="h-10 w-10 text-emerald-500" />}
                title="Nenhum impedimento ativo registrado"
                description="A matriz funcional atual não acusa conflitos de parentesco ou impedimentos formais declarados."
                actionLabel="Declarar Impedimento Manual"
                onAction={() => setModalDeclararOpen(true)}
              />
            ) : (
              <DataTable
                columns={columnsImpedimentos}
                data={filteredImpedimentos}
                pagination={true}
                pageSize={10}
                pageSizeSelector={true}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 2: FILA DE AMOSTRAGEM & TRAVA ANTI-LENIÊNCIA ──────── */}
      {activeTab === 'amostragem' && (
        <div className="space-y-4">
          <Card className="p-4 border-rose-500/20 bg-rose-500/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Regra Normativa Anti-Leniência & Amostragem (10% TCM)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Notas extremas (Grau 1 e Grau 5 na Escala Gráfica) exigem obrigatoriamente apontamentos prévios de Incidentes Críticos (CIT)
                    no Diário de Bordo. Avaliações sem respaldo fático ou com desvio acentuado são retidas nesta fila para auditoria ministerial.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 text-xs"
                onClick={handleExportarCsvAmostragem}
              >
                <Download className="h-3.5 w-3.5" /> Exportar Relatório TCM
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Avaliações em Escrutínio Amostral</h4>
                <p className="text-xs text-muted-foreground">Inspeção de notas extremas e emissão de pareceres do Controle Interno.</p>
              </div>
            </div>

            <DataTable
              columns={columnsAmostragem}
              data={amostragem}
              pagination={true}
              pageSize={10}
              pageSizeSelector={true}
              pageSizeOptions={[10, 25, 50]}
            />
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 3: TRILHA FORENSE & VERIFICADOR SHA-256 ──────────── */}
      {activeTab === 'trilha-forense' && (
        <div className="space-y-6">
          {/* VERIFICADOR DE INTEGRIDADE */}
          <Card className="p-4 border-primary/20 bg-accent/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Lock className="h-4 w-4" />
                <span>Verificador de Integridade Forense (Validação de Hash SHA-256)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground"
                onClick={() => setHashParaVerificar('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')}
              >
                Inserir Hash de Exemplo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o hash SHA-256 presente em certidões, atas seladas, ciências digitais ou espelhos para atestar sua autenticidade.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={hashParaVerificar}
                onChange={(e) => setHashParaVerificar(e.target.value)}
                placeholder="Ex: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                className="font-mono text-xs flex-1"
              />
              <Button size="sm" onClick={handleVerificarHash} disabled={verificandoHash || !hashParaVerificar.trim()}>
                {verificandoHash ? 'Verificando...' : 'Verificar Autenticidade'}
              </Button>
            </div>

            {resultadoVerificacao && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  resultadoVerificacao.valido
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {resultadoVerificacao.valido ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <div>
                  <div className="font-semibold">{resultadoVerificacao.mensagem}</div>
                  {resultadoVerificacao.registro && (
                    <div className="mt-1 font-mono text-[11px] opacity-90">
                      Ação: {resultadoVerificacao.registro.acao} | Responsável: {resultadoVerificacao.registro.usuario} | Timestamp: {resultadoVerificacao.registro.timestamp}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* TABELA DA TRILHA */}
          <Card className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Registro Contínuo de Operações Imutáveis</h4>
                <p className="text-xs text-muted-foreground">Cada evento gera carimbo de tempo UTC-3, IP do agente e assinatura criptográfica.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Input
                  placeholder="Buscar na trilha..."
                  value={buscaTrilha}
                  onChange={(e) => setBuscaTrilha(e.target.value)}
                  className="h-8 text-xs w-48"
                />
                <div className="w-36">
                  <Select
                    value={filtroModuloTrilha}
                    onChange={(val) => setFiltroModuloTrilha(val)}
                    options={[
                      { value: 'todos', label: 'Todos os Módulos' },
                      { value: 'avaliacao', label: 'Avaliações' },
                      { value: 'devolutiva', label: 'Devolutivas' },
                      { value: 'cad', label: 'Comissão CAD' },
                      { value: 'cit', label: 'Diário CIT' },
                      { value: 'folha', label: 'Folha & RH' },
                    ]}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleExportarCsvTrilha}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>

            <DataTable
              columns={columnsTrilha}
              data={filteredTrilha}
              pagination={true}
              pageSize={10}
              pageSizeSelector={true}
              pageSizeOptions={[10, 25, 50]}
            />
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 4: CONFORMIDADE LGPD & ACESSOS ────────────────────── */}
      {activeTab === 'lgpd' && (
        <div className="space-y-4">
          <Card className="p-4 border-indigo-500/20 bg-indigo-500/5">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Salvaguarda de Privacidade e Conformidade LGPD (Lei nº 13.709/2018)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Trilha de auditoria mandatória para consultas a prontuários funcionais, espelhos de avaliação e relatórios de notas.
                  Garante que o acesso a dados pessoais de servidores ocorra exclusivamente no cumprimento do dever legal e administrativo.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Registro de Acessos a Dados Pessoais de Desempenho</h4>
                <p className="text-xs text-muted-foreground">Monitoramento de visualizações, emissão de certidões e exportações da base.</p>
              </div>
            </div>

            <DataTable
              columns={columnsLgpd}
              data={lgpdLogs}
              pagination={true}
              pageSize={10}
              pageSizeSelector={true}
              pageSizeOptions={[10, 25, 50]}
            />
          </Card>
        </div>
      )}

      {/* ── MODAL DECLARAR IMPEDIMENTO ──────────────────────────────── */}
      {modalDeclararOpen && (
        <Modal
          open={modalDeclararOpen}
          onClose={() => setModalDeclararOpen(false)}
          title="Declaração Formal de Impedimento ou Suspeição"
        >
          <div className="space-y-4 text-xs pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Informe o servidor público com o qual existe relação de parentesco, afinidade ou conflito funcional para bloqueio de competência.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Servidor Alvo</label>
              <Select
                value={servidorAlvoId}
                onChange={setServidorAlvoId}
                options={[
                  { value: '', label: 'Selecione o servidor...' },
                  ...servidores.map((s) => ({
                    value: String(s.id),
                    label: `${s.nome_completo} (Mat: ${s.matricula})`,
                  })),
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Tipo de Impedimento</label>
              <Select
                value={tipoImpedimento}
                onChange={setTipoImpedimento}
                options={[
                  { value: 'parentesco_3_grau', label: 'Parentesco até 3º Grau (Cônjuge, Filhos, Pais, Irmãos, Tios)' },
                  { value: 'interesse_direto', label: 'Interesse Direto no Julgamento / Avaliação' },
                  { value: 'inimizade_capital', label: 'Suspeição por Inimizade Capital ou Foro Íntimo' },
                  { value: 'outro', label: 'Outro Impedimento Legal Regulamentar' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Motivo / Fundamentação Fática</label>
              <textarea
                value={motivoDeclaracao}
                onChange={(e) => setMotivoDeclaracao(e.target.value)}
                placeholder="Descreva detalhadamente a justificativa para registro no prontuário de auditoria..."
                className="w-full h-24 p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setModalDeclararOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleDeclararImpedimento} disabled={salvandoDeclaracao}>
                {salvandoDeclaracao ? 'Registrando...' : 'Confirmar e Lavrar Impedimento'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DE PARECER DA AMOSTRAGEM / ANTI-LENIÊNCIA ──────────── */}
      {modalParecerOpen && itemAmostraSelecionado && (
        <Modal
          open={modalParecerOpen}
          onClose={() => setModalParecerOpen(false)}
          title="Parecer de Auditoria — Trava Anti-Leniência"
        >
          <div className="space-y-4 text-xs pt-2">
            <div className="p-3 bg-muted/40 rounded border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">{itemAmostraSelecionado.servidor_nome}</span>
                <Badge variant="outline" className="font-mono">{itemAmostraSelecionado.matricula}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>Avaliador: <b>{itemAmostraSelecionado.avaliador_nome}</b></div>
                <div>Nota Final: <b className="font-mono">{itemAmostraSelecionado.nota_final.toFixed(2)} pts</b></div>
                <div>Enquadramento: <b>{getMotivoAmostragemLabel(itemAmostraSelecionado.motivo_auditoria)}</b></div>
                <div>Incidentes CIT: <b className={itemAmostraSelecionado.possui_cit ? 'text-emerald-600' : 'text-rose-600'}>
                  {itemAmostraSelecionado.possui_cit ? `${itemAmostraSelecionado.qtd_incidentes_cit} registrado(s)` : 'Nenhum apontamento'}
                </b></div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Despacho do Controle Interno:</label>
              <Select
                value={novoParecerStatus}
                onChange={(val) => setNovoParecerStatus(val as ItemAmostragemAuditoria['status_parecer'])}
                options={[
                  { value: 'aprovado', label: 'Homologar Avaliação (Conforme)' },
                  { value: 'reavaliacao', label: 'Determinar Reavaliação Funcional (Art. 31/CIT)' },
                  { value: 'diligencia', label: 'Abrir Diligência e Notificar Chefia' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Fundamentação Técnica do Parecer:</label>
              <textarea
                value={novoParecerTexto}
                onChange={(e) => setNovoParecerTexto(e.target.value)}
                placeholder="Insira a fundamentação técnica do Controle Interno ou Tribunal..."
                className="w-full h-24 p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setModalParecerOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSalvarParecerAmostragem}>
                Salvar e Assinar Parecer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: RESOLVER / HOMOLOGAR IMPEDIMENTO ───────────────────── */}
      {modalDesativarImpOpen && impedimentoParaDesativar && (
        <ConfirmDialog
          open={modalDesativarImpOpen}
          title="Homologar e Resolver Impedimento?"
          description={`Confirma a cessação do impedimento para "${typeof impedimentoParaDesativar.servidor_alvo === 'string' ? impedimentoParaDesativar.servidor_alvo : impedimentoParaDesativar.servidor_alvo?.nome_completo}"? Informe a justificativa legal.`}
          confirmLabel="Sim, Homologar Resolução"
          cancelLabel="Cancelar"
          destructive={false}
          requireReason={true}
          reasonPlaceholder="Descreva o ato de cessação (ex: exoneração, cessação de vínculo ou erro formal)..."
          onConfirm={handleConfirmarDesativacao}
          onClose={() => {
            setModalDesativarImpOpen(false);
            setImpedimentoParaDesativar(null);
          }}
        />
      )}
    </div>
  );
};
