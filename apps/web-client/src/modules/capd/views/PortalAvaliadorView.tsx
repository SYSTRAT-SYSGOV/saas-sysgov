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
  Select,
  Modal,
} from '@sysgov/ui';
import {
  UserCheck,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ClipboardEdit,
  Eye,
} from 'lucide-react';
import { AvaliacaoFormModal } from '../AvaliacaoFormModal';
import { EspelhoAvaliacaoModal } from '../EspelhoAvaliacaoModal';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiDiarioBordo,
  ApiRecurso,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type AvaliadorSubTab = 'avaliacoes' | 'cit' | 'devolutivas' | 'contrarrazoes' | 'pmd';

export const PortalAvaliadorView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AvaliadorSubTab>('avaliacoes');
  const [loading, setLoading] = useState<boolean>(true);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);
  const [selectedAvaliadorId, setSelectedAvaliadorId] = useState<string>('todos');

  // Modal de Preenchimento/Visualização da Avaliação
  const [modalAvaliarOpen, setModalAvaliarOpen] = useState<boolean>(false);
  const [modalEspelhoOpen, setModalEspelhoOpen] = useState<boolean>(false);
  const [avaliacaoEmFocoId, setAvaliacaoEmFocoId] = useState<number | null>(null);

  // Modal Novo Incidente CIT
  const [modalCitOpen, setModalCitOpen] = useState<boolean>(false);
  const [citServidorId, setCitServidorId] = useState<string>('');
  const [citFatorId, setCitFatorId] = useState<number>(1);
  const [citTipo, setCitTipo] = useState<'positivo' | 'negativo'>('positivo');
  const [citDataOcorrencia, setCitDataOcorrencia] = useState<string>(new Date().toISOString().split('T')[0]);
  const [citDescricao, setCitDescricao] = useState<string>('');
  const [salvandoCit, setSalvandoCit] = useState<boolean>(false);

  // Modal Registro de Devolutiva Presencial (Art. 27)
  const [modalDevolutivaOpen, setModalDevolutivaOpen] = useState<boolean>(false);
  const [selectedAvaliacaoId, setSelectedAvaliacaoId] = useState<number | null>(null);
  const [dataDevolutiva, setDataDevolutiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resumoEntrevista, setResumoEntrevista] = useState<string>('');
  const [acordosDesenvolvimento, setAcordosDesenvolvimento] = useState<string>('');
  const [salvandoDevolutiva, setSalvandoDevolutiva] = useState<boolean>(false);

  // Modal Contrarrazões Recursais (5 dias)
  const [modalContrarrazaoOpen, setModalContrarrazaoOpen] = useState<boolean>(false);
  const [selectedRecursoId, setSelectedRecursoId] = useState<number | null>(null);
  const [textoContrarrazao, setTextoContrarrazao] = useState<string>('');
  const [manterOuRetificar, setManterOuRetificar] = useState<'manter' | 'reconsiderar'>('manter');
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [salvandoContrarrazao, setSalvandoContrarrazao] = useState<boolean>(false);

  // Feedback Modal
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosAvaliador = useCallback(async (avaliadorId?: string) => {
    setLoading(true);
    try {
      const activeAvaliadorId = avaliadorId !== undefined ? avaliadorId : selectedAvaliadorId;
      const params: { per_page: number; avaliador_id?: number } = { per_page: 100 };
      if (activeAvaliadorId && activeAvaliadorId !== 'todos') {
        params.avaliador_id = Number(activeAvaliadorId);
      }

      const [resAv, resCit, resRec, resServ] = await Promise.all([
        api.capd.listAvaliacoes(params).catch(() => ({ data: [] })),
        api.capd.listDiarioBordo().catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);

      setAvaliacoes(resAv.data || []);
      setIncidentes(resCit.data || []);
      setRecursos(resRec.data || []);
      const servList = Array.isArray(resServ) ? resServ : (resServ.data || []);
      setServidores(servList);

      if (servList[0] && !citServidorId) {
        setCitServidorId(String(servList[0].user_id || servList[0].id));
      }
    } catch (e) {
      console.error('Erro ao carregar dados do avaliador:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedAvaliadorId, citServidorId]);

  useEffect(() => {
    carregarDadosAvaliador();
  }, [carregarDadosAvaliador]);

  const chefiasOptions = React.useMemo(() => {
    const map = new Map<number, string>();
    avaliacoes.forEach((av) => {
      if (av.avaliador_id && av.avaliador?.name) {
        map.set(av.avaliador_id, av.avaliador.name);
      }
    });
    servidores.forEach((s) => {
      if (s.chefia_imediata_id && !map.has(s.chefia_imediata_id)) {
        const lotacao = s.lotacao_fisica || s.orgao_lotacao;
        map.set(s.chefia_imediata_id, lotacao ? `Chefia: ${lotacao}` : `Chefia #${s.chefia_imediata_id}`);
      }
    });

    const opts = [{ value: 'todos', label: 'Todas as Chefias / Departamentos' }];
    map.forEach((label, id) => {
      opts.push({ value: String(id), label });
    });
    return opts;
  }, [avaliacoes, servidores]);

  const handleAvaliadorChange = (val: string) => {
    setSelectedAvaliadorId(val);
    carregarDadosAvaliador(val);
  };

  const handleSalvarCit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citServidorId) return;

    if (citDescricao.trim().length < 30) {
      setFeedback({
        open: true,
        type: 'warning',
        title: 'Descrição Insuficiente',
        message: 'A descrição circunstanciada do fato deve conter no mínimo 30 caracteres para fundamentar a avaliação conforme o art. 24 da Lei nº 1.704/2006.',
      });
      return;
    }

    setSalvandoCit(true);
    try {
      const servidorSelecionado = servidores.find(
        (s) => String(s.user_id) === citServidorId || String(s.id) === citServidorId
      );
      const targetServidorId = servidorSelecionado?.user_id || servidorSelecionado?.id || Number(citServidorId);
      const cicloAtivoId = avaliacoes[0]?.ciclo_id || 3;

      await api.capd.createDiarioBordo({
        ciclo_id: cicloAtivoId,
        servidor_id: Number(targetServidorId),
        fator_id: Number(citFatorId),
        tipo: citTipo,
        data_ocorrencia: citDataOcorrencia,
        descricao_fato: citDescricao.trim(),
      });

      setModalCitOpen(false);
      setCitDescricao('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Incidente Crítico Registrado no Diário de Bordo',
        message: 'O fato observável foi registrado no histórico contínuo do servidor. Caso se trate de nota extrema futura (< 60 ou > 90), o requisito de fundamentação prévia foi satisfeito.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Gravar Apontamento',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha ao salvar incidente.',
      });
    } finally {
      setSalvandoCit(false);
    }
  };

  const handleSalvarDevolutiva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvaliacaoId) return;
    setSalvandoDevolutiva(true);
    try {
      await api.capd.registrarDevolutiva(selectedAvaliacaoId, {
        data_devolutiva: dataDevolutiva,
        resumo_entrevista: resumoEntrevista,
        acordos_desenvolvimento: acordosDesenvolvimento,
      });

      setModalDevolutivaOpen(false);
      setResumoEntrevista('');
      setAcordosDesenvolvimento('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Entrevista Devolutiva Concluída e Registrada',
        message: 'A realização da devolutiva presencial foi arquivada com sucesso, habilitando o servidor a emitir ciência digital nos autos.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Devolutiva',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar devolutiva presencial.',
      });
    } finally {
      setSalvandoDevolutiva(false);
    }
  };

  const handleSalvarContrarrazao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecursoId) return;
    setSalvandoContrarrazao(true);
    try {
      await api.capd.contestarRecursoChefia(selectedRecursoId, {
        contestacao_chefia: textoContrarrazao,
      });

      setModalContrarrazaoOpen(false);
      setTextoContrarrazao('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Contrarrazões Protocoladas com Sucesso',
        message: 'Sua manifestação formal foi registrada e o processo foi redistribuído à Comissão Especial (CAD) para julgamento soberano colegiado.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Contrarrazões',
        message: err?.response?.data?.message || err?.message || 'Falha ao emitir manifestação.',
      });
    } finally {
      setSalvandoContrarrazao(false);
    }
  };

  const columnsAvaliacoes: ColumnDef<ApiAvaliacao>[] = React.useMemo(
    () => [
      {
        id: 'matricula',
        header: 'Matrícula',
        size: 110,
        accessorFn: (row) => row.servidorData?.matricula || (row.servidor as any)?.matricula || `#${row.servidor_id}`,
        cell: ({ row }) => {
          const mat = row.original.servidorData?.matricula || (row.original.servidor as any)?.matricula;
          return (
            <span className="font-mono text-xs font-bold text-primary tabular-nums px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {mat ? `Matr. ${mat}` : `#${row.original.servidor_id}`}
            </span>
          );
        },
      },
      {
        id: 'servidor',
        header: 'Servidor Público',
        size: 220,
        accessorFn: (row) =>
          row.servidorData?.nome_completo ||
          (row.servidor as any)?.nome_completo ||
          (row.servidor as any)?.name ||
          `Servidor #${row.servidor_id}`,
        cell: ({ row }) => {
          const srvData = row.original.servidorData || (row.original.servidor as any);
          const nome =
            srvData?.nome_completo ||
            (row.original.servidor as any)?.name ||
            `Servidor #${row.original.servidor_id}`;
          const email = srvData?.email || (row.original.servidor as any)?.email;
          return (
            <div className="text-left space-y-0.5">
              <div className="font-semibold text-xs text-foreground truncate" title={nome}>
                {nome}
              </div>
              {email && (
                <div className="text-[11px] text-muted-foreground truncate" title={email}>
                  {email}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'cargo',
        header: 'Cargo Efetivo',
        size: 180,
        accessorFn: (row) => row.servidorData?.cargo_efetivo || '—',
        cell: ({ row }) => {
          const cargo = row.original.servidorData?.cargo_efetivo || '—';
          return (
            <div className="text-xs text-foreground/90 truncate text-left" title={cargo}>
              {cargo}
            </div>
          );
        },
      },
      {
        id: 'lotacao',
        header: 'Lotação / Departamento',
        size: 210,
        accessorFn: (row) => row.servidorData?.lotacao_fisica || row.servidorData?.orgao_lotacao || '—',
        cell: ({ row }) => {
          const lotacao = row.original.servidorData?.lotacao_fisica || row.original.servidorData?.orgao_lotacao || '—';
          const orgao = row.original.servidorData?.orgao_lotacao;
          return (
            <div className="text-left space-y-0.5">
              <div className="text-xs text-foreground truncate" title={lotacao}>
                {lotacao}
              </div>
              {orgao && orgao !== lotacao && (
                <div className="text-[10px] text-muted-foreground truncate" title={orgao}>
                  {orgao}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'chefia',
        header: 'Chefia Imediata',
        size: 170,
        accessorFn: (row) => row.avaliador?.name || '—',
        cell: ({ row }) => {
          const chefia = row.original.avaliador?.name || '—';
          return (
            <div className="text-xs text-muted-foreground truncate text-left" title={chefia}>
              {chefia}
            </div>
          );
        },
      },
      {
        id: 'ciclo',
        header: 'Ciclo',
        size: 110,
        accessorFn: (row) => row.ciclo?.ano_referencia || row.ciclo_id,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            Ciclo #{row.original.ciclo_id} {row.original.ciclo?.ano_referencia ? `(${row.original.ciclo.ano_referencia})` : ''}
          </span>
        ),
      },
      {
        id: 'nota_final',
        header: 'Nota Nc',
        size: 110,
        accessorFn: (row) => (row.nota_final ? Number(row.nota_final) : 0),
        cell: ({ row }) => {
          const nota = row.original.nota_final;
          if (!nota) return <span className="text-muted-foreground text-xs font-mono">—</span>;
          const num = Number(nota);
          const isAprovado = num >= 70;
          return (
            <span
              className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                isAprovado
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                  : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
              }`}
            >
              {num.toFixed(2)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Situação',
        size: 140,
        accessorFn: (row) => (row.homologada ? 'Homologada' : row.data_conclusao ? 'Concluída' : 'Rascunho'),
        cell: ({ row }) => {
          const av = row.original;
          if (av.homologada) {
            return (
              <Badge variant="success" className="text-[10px] whitespace-nowrap">
                Homologada
              </Badge>
            );
          }
          if (av.data_conclusao) {
            return <StatusChip label="Concluída" variant="success" />;
          }
          return <StatusChip label="Rascunho" variant="neutral" />;
        },
      },
      {
        id: 'devolutiva',
        header: 'Devolutiva',
        size: 130,
        cell: ({ row }) => {
          const av = row.original;
          if (av.devolutiva_realizada) {
            return (
              <Badge variant="success" className="text-[10px] whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Devolutiva OK
              </Badge>
            );
          }
          return <span className="text-[11px] text-muted-foreground font-medium">Pendente</span>;
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        size: 150,
        cell: ({ row }) => {
          const av = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {!av.homologada && !av.data_conclusao && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvaliacaoEmFocoId(av.id);
                    setModalAvaliarOpen(true);
                  }}
                >
                  <ClipboardEdit className="h-3 w-3 mr-1" />
                  Avaliar
                </Button>
              )}
              {av.data_conclusao && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvaliacaoEmFocoId(av.id);
                    setModalEspelhoOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1 text-primary" />
                  Ver Avaliação
                </Button>
              )}
              {!av.devolutiva_realizada && av.data_conclusao && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAvaliacaoId(av.id);
                    setModalDevolutivaOpen(true);
                  }}
                >
                  <Calendar className="h-3 w-3 mr-1 text-primary" />
                  Devolutiva
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const columnsCit: ColumnDef<ApiDiarioBordo>[] = React.useMemo(
    () => [
      {
        id: 'data_ocorrencia',
        header: 'Data Ocorrência',
        size: 130,
        accessorFn: (row) => row.data_ocorrencia,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {new Date(row.original.data_ocorrencia).toLocaleDateString('pt-BR')}
          </span>
        ),
      },
      {
        id: 'servidor',
        header: 'Servidor',
        size: 220,
        accessorFn: (row) => row.servidor?.nome_completo || `Servidor #${row.servidor_id}`,
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-foreground">
            {row.original.servidor?.nome_completo || `Servidor #${row.original.servidor_id}`}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        size: 130,
        accessorFn: (row) => row.tipo,
        cell: ({ row }) => (
          <Badge
            variant={row.original.tipo === 'positivo' ? 'success' : 'outline'}
            className="text-[10px] uppercase font-bold"
          >
            {row.original.tipo === 'positivo' ? 'Positivo' : 'A Desenvolver'}
          </Badge>
        ),
      },
      {
        id: 'fator',
        header: 'Fator',
        size: 160,
        accessorFn: (row) => row.fator?.nome || `Fator #${row.fator_id}`,
        cell: ({ row }) => (
          <span className="text-xs text-foreground/80">
            {row.original.fator?.nome || `Fator #${row.original.fator_id}`}
          </span>
        ),
      },
      {
        id: 'descricao_fato',
        header: 'Descrição do Fato Observado',
        size: 360,
        accessorFn: (row) => row.descricao_fato,
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground leading-relaxed line-clamp-2 block text-left"
            title={row.original.descricao_fato}
          >
            {row.original.descricao_fato}
          </span>
        ),
      },
    ],
    []
  );

  const subTabItems: TabsItem<AvaliadorSubTab>[] = [
    { key: 'avaliacoes', label: 'Avaliações de Subordinados', icon: <UserCheck className="h-4 w-4" />, badge: avaliacoes.length },
    { key: 'cit', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length },
    { key: 'devolutivas', label: 'Entrevistas de Devolutiva', icon: <Calendar className="h-4 w-4" /> },
    { key: 'contrarrazoes', label: 'Contrarrazões Recursais', icon: <MessageSquare className="h-4 w-4" />, badge: recursos.length },
  ];

  if (loading) {
    return <ScreenState type="loading" title="Carregando portal do avaliador..." />;
  }

  return (
    <div className="space-y-6">
      {/* ── Topo do Portal do Avaliador ───────────────────────────────── */}
      <PageHeader
        title="Portal do Avaliador (Chefia Imediata)"
        subtitle="Avaliação funcional de 90° na Escala Gráfica, Trava Anti-Leniência (CIT), Devolutiva Presencial e Contrarrazões"
        badge="Chefia Imediata"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setModalCitOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Apontamento no CIT
            </Button>
          </div>
        }
      />

      {/* ── Sub-abas de Navegação ──────────────────────────────────────── */}
      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── Sub-Aba 1: Avaliações de Subordinados ──────────────────────── */}
      {activeTab === 'avaliacoes' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Equipe Funcional para Avaliação Periódica</h3>
                <p className="text-xs text-muted-foreground">
                  Notas extremas (&lt; 60 ou &gt; 90 pontos / Graus 1 e 5) são bloqueadas pela Trava Anti-Leniência se não houver CIT prévio.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {chefiasOptions.length > 1 && (
                  <div className="w-72">
                    <Select
                      value={selectedAvaliadorId}
                      onChange={handleAvaliadorChange}
                      options={chefiasOptions}
                      placeholder="Filtrar por Chefia..."
                    />
                  </div>
                )}
                <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
                  Nota de Corte: 70,00 pts
                </Badge>
              </div>
            </div>

            <div className="p-4">
              <DataTable
                columns={columnsAvaliacoes}
                data={avaliacoes}
                loading={loading}
                emptyText="Nenhuma avaliação pendente para a chefia selecionada."
                searchable
                searchPlaceholder="Buscar por matrícula, servidor, cargo, departamento..."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="avaliacoes-equipe-chefia"
                exportTitle="CAPD — Avaliações de Desempenho da Equipe Funcional"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── Sub-Aba 2: Diário de Bordo Contínuo (CIT) ──────────────────── */}
      {activeTab === 'cit' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Diário de Bordo — Fatos Observáveis (CIT)</h4>
                <p className="text-xs text-muted-foreground">
                  Mantenha apontamentos fáticos atualizados durante o ano para permitir a avaliação fidedigna da equipe.
                </p>
              </div>
              <Button size="sm" onClick={() => setModalCitOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Novo Lançamento CIT
              </Button>
            </div>

            <div className="p-4">
              <DataTable
                columns={columnsCit}
                data={incidentes}
                loading={loading}
                emptyText="Nenhum apontamento no Diário de Bordo registrado para esta equipe."
                searchable
                searchPlaceholder="Buscar por servidor, tipo, fator ou descrição..."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="diario-de-bordo-cit"
                exportTitle="CAPD — Diário de Bordo (Técnica do Incidente Crítico)"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── Sub-Aba 3: Devolutivas Presenciais ─────────────────────────── */}
      {activeTab === 'devolutivas' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Devolutivas Presenciais e Feedback (Art. 27)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              A entrevista presencial de feedback é obrigatória por lei antes da ciência eletrônica do servidor. Registre o alinhamento e eventuais planos de melhoria.
            </p>
          </Card>

          <div className="divide-y divide-border bg-card rounded-lg border border-border">
            {avaliacoes.filter((a) => a.data_conclusao).map((av) => (
              <div key={av.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {av.devolutiva_realizada ? 'Devolutiva Realizada' : 'Pendente de Devolutiva'}
                  </div>
                </div>

                <div>
                  {av.devolutiva_realizada ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Entrevista Concluída em {av.devolutiva_em ? new Date(av.devolutiva_em).toLocaleDateString('pt-BR') : 'Data informada'}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAvaliacaoId(av.id);
                        setModalDevolutivaOpen(true);
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Registrar Entrevista Devolutiva
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Aba 4: Contrarrazões Recursais ─────────────────────────── */}
      {activeTab === 'contrarrazoes' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Manifestação de Contrarrazões da Chefia (Arts. 30 e 31)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo regimental de 5 (cinco) dias úteis para manifestação formal sobre recursos interpostos por servidores subordinados.
            </p>
          </Card>

          {recursos.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum recurso pendente de contrarrazões"
              description="Não constam contestações administrativas protocoladas para servidores da sua unidade."
            />
          ) : (
            <div className="space-y-3">
              {recursos.map((rec) => (
                <Card key={rec.id} className="p-4 border-border space-y-3">
                  <div className="flex justify-between items-start border-b border-border pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">Recurso #{rec.id}</span>
                      <h4 className="font-semibold text-sm text-foreground mt-0.5">
                        Fator Contestado: {rec.fatorContestado?.nome || rec.fator_contestado?.nome || `Fator #${rec.fator_contestado_id}`}
                      </h4>
                    </div>
                    <StatusChip
                      label={rec.status.replace('_', ' ').toUpperCase()}
                      variant={rec.status.startsWith('julgado') ? 'success' : 'warning'}
                    />
                  </div>

                  <div className="text-xs space-y-1">
                    <strong className="text-foreground">Razões Recursais do Servidor:</strong>
                    <p className="text-muted-foreground italic bg-muted/20 p-2.5 rounded border border-border/40">
                      "{rec.justificativa_servidor}"
                    </p>
                  </div>

                  {['interposto', 'em_instrucao'].includes(rec.status) && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRecursoId(rec.id);
                          setModalContrarrazaoOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Emitir Contrarrazões (5 dias)
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Preenchimento da Avaliação (Escala Gráfica) ─────────── */}
      <AvaliacaoFormModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalAvaliarOpen}
        onClose={() => setModalAvaliarOpen(false)}
        onSubmitted={() => carregarDadosAvaliador()}
      />

      {/* ── Modal: Visualização do Espelho da Avaliação ────────────────── */}
      <EspelhoAvaliacaoModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalEspelhoOpen}
        onClose={() => setModalEspelhoOpen(false)}
      />

      {/* ── Modal: Novo Apontamento no CIT (Diário de Bordo) ───────────── */}
      <Modal
        open={modalCitOpen}
        onClose={() => setModalCitOpen(false)}
        title="Novo Apontamento no Diário de Bordo Digital (CIT)"
        size="md"
      >
        <form onSubmit={handleSalvarCit} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Servidor Avaliado:</label>
            <Select
              value={citServidorId}
              onChange={setCitServidorId}
              options={servidores.map((s) => ({
                value: String(s.user_id || s.id),
                label: `${s.nome_completo} (${s.cargo_efetivo || 'Servidor'}) — Mat: ${s.matricula}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">Tipo de Incidente:</label>
              <Select
                value={citTipo}
                onChange={(val) => setCitTipo(val as 'positivo' | 'negativo')}
                options={[
                  { value: 'positivo', label: '+ Positivo (Desempenho Notável)' },
                  { value: 'negativo', label: '- Negativo (Ponto a Desenvolver)' },
                ]}
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">Fator de Avaliação Qualitativo:</label>
              <Select
                value={String(citFatorId)}
                onChange={(v) => setCitFatorId(Number(v))}
                options={[
                  { value: '3', label: 'F3 — Eficiência e Produtividade' },
                  { value: '4', label: 'F4 — Comprometimento e Urbanidade' },
                  { value: '5', label: 'F5 — Relacionamento Interpessoal' },
                  { value: '6', label: 'F6 — Iniciativa e Resolução de Problemas' },
                  { value: '7', label: 'F7 — Organização, Método e Cooperação' },
                  { value: '8', label: 'F8 — Zelo Patrimonial' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Ocorrência do Fato:</label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={citDataOcorrencia}
              onChange={(e) => setCitDataOcorrencia(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-foreground">
                Descrição Circunstanciada do Fato (mínimo 30 caracteres):
              </label>
              <span className={`text-[11px] font-mono font-medium ${citDescricao.trim().length >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {citDescricao.trim().length}/30 caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={citDescricao}
              onChange={(e) => setCitDescricao(e.target.value)}
              placeholder="Descreva minuciosamente a conduta observável do servidor, o contexto funcional da ocorrência e o impacto concreto nas rotinas e entregas do setor público..."
              required
              minLength={30}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
            {citDescricao.trim().length > 0 && citDescricao.trim().length < 30 && (
              <p className="text-[11px] text-amber-500 mt-1">
                Faltam {30 - citDescricao.trim().length} caracteres para atingir o mínimo legal exigido pelo art. 24 da Lei nº 1.704/2006.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalCitOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              disabled={salvandoCit || citDescricao.trim().length < 30}
            >
              {salvandoCit ? 'Salvando...' : 'Gravar Apontamento CIT'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Registrar Devolutiva Presencial (Art. 27) ───────────── */}
      <Modal
        open={modalDevolutivaOpen}
        onClose={() => setModalDevolutivaOpen(false)}
        title="Registro de Entrevista de Devolutiva Presencial (Art. 27)"
        size="md"
      >
        <form onSubmit={handleSalvarDevolutiva} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Reunião de Feedback:</label>
            <Input
              type="date"
              value={dataDevolutiva}
              onChange={(e) => setDataDevolutiva(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Resumo da Entrevista Presencial:</label>
            <textarea
              rows={3}
              value={resumoEntrevista}
              onChange={(e) => setResumoEntrevista(e.target.value)}
              placeholder="Principais pontos debatidos na reunião com o servidor..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Acordos de Desenvolvimento e Metas:</label>
            <textarea
              rows={3}
              value={acordosDesenvolvimento}
              onChange={(e) => setAcordosDesenvolvimento(e.target.value)}
              placeholder="Metas pactuadas para superação de pontos a desenvolver no próximo ciclo..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalDevolutivaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoDevolutiva}>
              {salvandoDevolutiva ? 'Registrando...' : 'Confirmar Devolutiva Presencial'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Contrarrazões da Chefia (Arts. 30 e 31) ───────────────── */}
      <Modal
        open={modalContrarrazaoOpen}
        onClose={() => setModalContrarrazaoOpen(false)}
        title="Manifestação Formal de Contrarrazões da Chefia"
        size="md"
      >
        <form onSubmit={handleSalvarContrarrazao} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Posicionamento da Chefia:</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'manter'}
                  onChange={() => setManterOuRetificar('manter')}
                  className="accent-primary"
                />
                <span>Manter Nota Original</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'reconsiderar'}
                  onChange={() => setManterOuRetificar('reconsiderar')}
                  className="accent-primary"
                />
                <span>Reconsiderar Parcialmente</span>
              </label>
            </div>
          </div>

          {manterOuRetificar === 'reconsiderar' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Novo Grau Proposto (1 a 5):</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={novoGrauProposto}
                onChange={(e) => setNovoGrauProposto(Number(e.target.value))}
                className="font-mono w-24"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-foreground mb-1">Fundamentação Técnica das Contrarrazões:</label>
            <textarea
              rows={4}
              value={textoContrarrazao}
              onChange={(e) => setTextoContrarrazao(e.target.value)}
              placeholder="Descreva tecnicamente as razões pelas quais a pontuação inicial deve ser mantida ou os fundamentos da reconsideração proposta..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalContrarrazaoOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoContrarrazao}>
              {salvandoContrarrazao ? 'Protocolando...' : 'Protocolar Contrarrazões'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Feedback ─────────────────────────────────────────────── */}
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
