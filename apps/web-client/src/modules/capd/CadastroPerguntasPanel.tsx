import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Switch,
  StatCard,
} from '@sysgov/ui';
import {
  Plus,
  Trash2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FileQuestion,
  Shield,
  HeartPulse,
  GraduationCap,
  Building2,
  Eye,
  Info,
  Search,
  Filter,
  Check,
  Scale,
  Edit3,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario, ApiPergunta, TipoPergunta } from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';

const api = new SysgovApi();

// Definição visual e metadados dos 4 Grupos Funcionais Canônicos
export interface GrupoFuncionalMeta {
  key: string;
  nome: string;
  codigoModelo: string;
  leiReferencia: string;
  descricao: string;
  publicoAlvo: string;
  icon: React.ComponentType<{ className?: string }>;
  corBadge: string;
}

export const GRUPOS_FUNCIONAIS: Record<string, GrupoFuncionalMeta> = {
  seguranca: {
    key: 'seguranca',
    nome: 'Segurança Pública',
    codigoModelo: 'FORM_SEGURANCA_V1',
    leiReferencia: 'Lei nº 2.012/2011 e Lei Federal nº 13.022/2014',
    descricao: 'Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito e Defesa Social (SMSP).',
    publicoAlvo: 'Guarda Municipal (1ª, 2ª e 3ª Classe), Agentes de Trânsito, Vigilantes e servidores da SMSP.',
    icon: Shield,
    corBadge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  saude: {
    key: 'saude',
    nome: 'Saúde',
    codigoModelo: 'FORM_SAUDE_V1',
    leiReferencia: 'Lei nº 1.940/2009 e Sistema Único de Saúde (SUS)',
    descricao: 'Médicos, Enfermagem, Odontologia, Farmácia, Técnicos, ACS/ACE e servidores da SMS.',
    publicoAlvo: 'Médicos, Enfermeiros, Técnicos de Enfermagem, Dentistas, ACS, ACE, Farmacêuticos e SMS.',
    icon: HeartPulse,
    corBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  magisterio: {
    key: 'magisterio',
    nome: 'Magistério',
    codigoModelo: 'FORM_MAGISTERIO_V1',
    leiReferencia: 'Lei Municipal nº 1.835/2008 (Plano de Carreira da Educação)',
    descricao: 'Professores de Educação Infantil, Ensino Fundamental, Pedagogos, Educadores e SMED.',
    publicoAlvo: 'Professores, Docentes, Pedagogos, Educadores Infantis e servidores da Secretaria de Educação.',
    icon: GraduationCap,
    corBadge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  },
  geral: {
    key: 'geral',
    nome: 'Quadro Geral',
    codigoModelo: 'FORM_GERAL_V1',
    leiReferencia: 'Lei Municipal nº 1.704/2006 (Estatuto dos Servidores Municipais)',
    descricao: 'Cargos Administrativos, Operacionais, Obras, Finanças, Planejamento e demais secretarias.',
    publicoAlvo: 'Assistentes Administrativos, Fiscais, Técnicos, Operacionais e secretarias em geral.',
    icon: Building2,
    corBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
};

// Detalhamento canônico dos 5 Graus da Escala Gráfica de Chiavenato
export const GRAUS_CHIAVENATO = [
  {
    grau: 1,
    rotulo: 'Grau 1 - Insuficiente',
    descricao: 'Desempenho nitidamente abaixo do padrão regulamentar exigido, demandando supervisão constante e retrabalho.',
    travaCit: true,
    travaDesc: 'Obrigatório registro prévio de incidente negativo no Diário de Bordo Digital (CIT)',
    cor: 'text-status-danger bg-status-danger-bg border-status-danger-border',
  },
  {
    grau: 2,
    rotulo: 'Grau 2 - Regular',
    descricao: 'Atende parcialmente aos padrões do cargo, apresentando oscilações pontuais que demandam orientação corretiva.',
    travaCit: false,
    travaDesc: 'Aviso pedagógico; registro no Diário de Bordo recomendado para embasamento',
    cor: 'text-status-warning bg-status-warning-bg border-status-warning-border',
  },
  {
    grau: 3,
    rotulo: 'Grau 3 - Bom (Padrão)',
    descricao: 'Cumpre plenamente e com regularidade todos os deveres funcionais, rotinas e prazos estatutários.',
    travaCit: false,
    travaDesc: 'Padrão institucional regulamentar — dispensa justificativa circunstanciada',
    cor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    grau: 4,
    rotulo: 'Grau 4 - Muito Bom',
    descricao: 'Supera com presteza, autonomia e zelo as expectativas habituais da função pública.',
    travaCit: false,
    travaDesc: 'Desempenho de destaque positivo — dispensa trava restritiva',
    cor: 'text-status-success bg-status-success-bg border-status-success-border',
  },
  {
    grau: 5,
    rotulo: 'Grau 5 - Excelente',
    descricao: 'Desempenho exemplar de referência municipal, com impacto de inovação, alta resolutividade e dedicação extraordinária.',
    travaCit: true,
    travaDesc: 'Obrigatório registro prévio de incidente positivo / elogio no Diário de Bordo Digital (CIT)',
    cor: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
];

export interface PerguntaComGrupo extends ApiPergunta {
  grupoFuncionalKey?: string;
  grupoFuncionalNome?: string;
  modeloCodigo?: string;
  modeloNome?: string;
}

export const CadastroPerguntasPanel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [modelos, setModelos] = useState<ApiModeloFormulario[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos');
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(null);

  // Filtros avançados da tabela DataTable
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroTravaCit, setFiltroTravaCit] = useState<string>('todos');

  // Modal de cadastro/edição de pergunta
  const [showModalPergunta, setShowModalPergunta] = useState<boolean>(false);
  const [editingPerguntaId, setEditingPerguntaId] = useState<number | null>(null);
  const [perguntaModeloId, setPerguntaModeloId] = useState<number | null>(null);
  const [perguntaCodigo, setPerguntaCodigo] = useState<string>('');
  const [perguntaEnunciado, setPerguntaEnunciado] = useState<string>('');
  const [perguntaTipo, setPerguntaTipo] = useState<TipoPergunta>('escala_grafica');
  const [perguntaGrupo, setPerguntaGrupo] = useState<string>('competencias');
  const [perguntaPeso, setPerguntaPeso] = useState<number>(1.5);
  const [perguntaObrigatoria, setPerguntaObrigatoria] = useState<boolean>(true);
  const [perguntaExigeEvidencia, setPerguntaExigeEvidencia] = useState<boolean>(false);
  const [savingPergunta, setSavingPergunta] = useState<boolean>(false);

  // Modais de apoio: Graus de Chiavenato e Simulador de Avaliação
  const [showModalGraus, setShowModalGraus] = useState<boolean>(false);
  const [showSimuladorModal, setShowSimuladorModal] = useState<boolean>(false);
  const [simuladorModelo, setSimuladorModelo] = useState<ApiModeloFormulario | null>(null);
  const [simuladorRespostas, setSimuladorRespostas] = useState<Record<string, number>>({});

  // Estados de confirmação e alertas estilizados (padrão SYSGOV)
  const [showConfirmSeedModal, setShowConfirmSeedModal] = useState<boolean>(false);
  const [loadingSeed, setLoadingSeed] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    perguntaId: number;
    codigo: string;
    modeloId?: number;
  } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    details?: Array<{ label: string; value: string; code?: boolean }>;
  } | null>(null);

  // Carrega todos os modelos cadastrados
  const fetchModelos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.capd.listModelosFormulario();
      setModelos(data);
      if (data.length > 0 && !selectedModeloId) {
        setSelectedModeloId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedModeloId]);

  useEffect(() => {
    fetchModelos();
  }, [fetchModelos]);

  // Modelo atualmente em foco para detalhes/edição
  const selectedModelo = useMemo(() => {
    if (!selectedModeloId) return modelos[0] || null;
    return modelos.find((m) => m.id === selectedModeloId) || modelos[0] || null;
  }, [modelos, selectedModeloId]);

  // Identifica o grupo funcional de um modelo com base no código
  const getGrupoFuncionalFromModelo = useCallback((m: ApiModeloFormulario): GrupoFuncionalMeta => {
    const cod = (m.codigo || '').toUpperCase();
    if (cod.includes('SEGURANCA')) return GRUPOS_FUNCIONAIS.seguranca;
    if (cod.includes('SAUDE')) return GRUPOS_FUNCIONAIS.saude;
    if (cod.includes('MAGISTERIO')) return GRUPOS_FUNCIONAIS.magisterio;
    return GRUPOS_FUNCIONAIS.geral;
  }, []);

  // Lista consolidada de todas as perguntas ativas com os metadados do grupo funcional
  const todasPerguntas = useMemo<PerguntaComGrupo[]>(() => {
    const lista: PerguntaComGrupo[] = [];
    for (const m of modelos) {
      const grupoMeta = getGrupoFuncionalFromModelo(m);
      if (m.perguntas_ativas && Array.isArray(m.perguntas_ativas)) {
        for (const p of m.perguntas_ativas) {
          lista.push({
            ...p,
            grupoFuncionalKey: grupoMeta.key,
            grupoFuncionalNome: grupoMeta.nome,
            modeloCodigo: m.codigo,
            modeloNome: m.nome,
          });
        }
      }
    }
    return lista;
  }, [modelos, getGrupoFuncionalFromModelo]);

  // Filtragem avançada para o DataTable primário
  const perguntasFiltradas = useMemo<PerguntaComGrupo[]>(() => {
    return todasPerguntas.filter((p) => {
      // Filtro por grupo funcional da aba
      if (selectedGrupo !== 'todos' && p.grupoFuncionalKey !== selectedGrupo) {
        return false;
      }
      // Filtro textual
      if (buscaTexto.trim()) {
        const t = buscaTexto.toLowerCase();
        const cod = (p.codigo || '').toLowerCase();
        const enun = (p.enunciado || '').toLowerCase();
        const mod = (p.modeloNome || '').toLowerCase();
        const grp = (p.grupo_key || '').toLowerCase();
        if (!cod.includes(t) && !enun.includes(t) && !mod.includes(t) && !grp.includes(t)) {
          return false;
        }
      }
      // Filtro por categoria (assiduidade, disciplina, competencias)
      if (filtroCategoria !== 'todos') {
        const cat = (p.grupo_key || '').toLowerCase();
        if (!cat.includes(filtroCategoria.toLowerCase())) {
          return false;
        }
      }
      // Filtro por trava CIT
      if (filtroTravaCit === 'com_trava' && !p.exige_evidencia) return false;
      if (filtroTravaCit === 'sem_trava' && p.exige_evidencia) return false;

      return true;
    });
  }, [todasPerguntas, selectedGrupo, buscaTexto, filtroCategoria, filtroTravaCit]);

  // KPIs agregados do banco de perguntas
  const kpis = useMemo(() => {
    const totalModelos = modelos.length;
    const totalPerguntas = todasPerguntas.length;
    const totalComCit = todasPerguntas.filter((p) => p.exige_evidencia).length;
    const gruposRepresentados = new Set(todasPerguntas.map((p) => p.grupoFuncionalKey)).size;

    return {
      totalModelos,
      totalPerguntas,
      totalComCit,
      gruposRepresentados,
    };
  }, [modelos, todasPerguntas]);

  // Abre modal para criação de nova pergunta
  const handleAbrirNovaPergunta = (modeloAlvoId?: number) => {
    const mId = modeloAlvoId || selectedModelo?.id || modelos[0]?.id || null;
    setEditingPerguntaId(null);
    setPerguntaModeloId(mId);
    setPerguntaCodigo(`P${(perguntasFiltradas.length || 0) + 1}`);
    setPerguntaEnunciado('');
    setPerguntaTipo('escala_grafica');
    setPerguntaGrupo('competencias');
    setPerguntaPeso(1.5);
    setPerguntaObrigatoria(true);
    setPerguntaExigeEvidencia(false);
    setShowModalPergunta(true);
  };

  // Abre modal para edição de pergunta existente
  const handleEditarPergunta = (p: PerguntaComGrupo) => {
    setEditingPerguntaId(p.id);
    setPerguntaModeloId(p.modelo_id);
    setPerguntaCodigo(p.codigo);
    setPerguntaEnunciado(p.enunciado);
    setPerguntaTipo(p.tipo as TipoPergunta);
    setPerguntaGrupo(p.grupo_key || 'competencias');
    setPerguntaPeso(Number(p.peso || 1.5));
    setPerguntaObrigatoria(p.obrigatoria);
    setPerguntaExigeEvidencia(p.exige_evidencia);
    setShowModalPergunta(true);
  };

  // Salvar pergunta (criação ou edição)
  const handleSalvarPergunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perguntaModeloId) return;
    setSavingPergunta(true);

    try {
      await api.capd.savePergunta(perguntaModeloId, {
        id: editingPerguntaId || undefined,
        codigo: perguntaCodigo,
        enunciado: perguntaEnunciado,
        tipo: perguntaTipo,
        grupo_key: perguntaGrupo,
        peso: perguntaPeso,
        obrigatoria: perguntaObrigatoria,
        exige_evidencia: perguntaExigeEvidencia,
        opcoes:
          perguntaTipo === 'escala_grafica'
            ? [
                { valor: 1, rotulo: 'Grau 1 - Insuficiente', descricao: 'Desempenho abaixo do padrão exigido.' },
                { valor: 2, rotulo: 'Grau 2 - Regular', descricao: 'Desempenho regular com necessidades pontuais.' },
                { valor: 3, rotulo: 'Grau 3 - Bom', descricao: 'Desempenho satisfatório, atende plenamente.' },
                { valor: 4, rotulo: 'Grau 4 - Muito Bom', descricao: 'Supera as expectativas habituais com presteza.' },
                { valor: 5, rotulo: 'Grau 5 - Excelente', descricao: 'Desempenho exemplar de referência institucional.' },
              ]
            : null,
      });

      setShowModalPergunta(false);
      await fetchModelos();

      setFeedbackModal({
        open: true,
        type: 'success',
        title: editingPerguntaId ? 'Pergunta Atualizada' : 'Pergunta Cadastrada com Sucesso',
        message: `O fator ${perguntaCodigo} foi integrado com sucesso ao instrumento de avaliação.`,
      });
    } catch (err: any) {
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Erro ao Salvar Pergunta',
        message: err?.message || 'Verifique os dados preenchidos e tente novamente.',
      });
    } finally {
      setSavingPergunta(false);
    }
  };

  // Exclusão de pergunta
  const handleConfirmarExclusaoPergunta = async () => {
    if (!confirmDeleteModal) return;
    try {
      await api.capd.destroyPergunta(confirmDeleteModal.perguntaId);
      const cod = confirmDeleteModal.codigo;
      setConfirmDeleteModal(null);
      await fetchModelos();
      setFeedbackModal({
        open: true,
        type: 'success',
        title: 'Pergunta Removida',
        message: `A pergunta ${cod} foi removida com sucesso do banco de instrumentos.`,
      });
    } catch (err: any) {
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: err?.message || 'Não foi possível remover a pergunta.',
      });
    }
  };

  // Sincronização / Carga do Seed Canônico dos 4 Grupos
  const handleConfirmSeedPadrao = async () => {
    setLoadingSeed(true);
    try {
      await api.capd.seedPerguntasPadrao();
      await fetchModelos();
      setShowConfirmSeedModal(false);
      setFeedbackModal({
        open: true,
        type: 'success',
        title: 'Banco de Perguntas Atualizado com os 4 Grupos!',
        message: 'Os 4 instrumentos oficiais da metodologia da Escala Gráfica de Chiavenato foram provisionados e sincronizados com sucesso.',
        details: [
          { label: '🛡️ Segurança Pública', value: 'FORM_SEGURANCA_V1 (Guarda Municipal e Agentes)', code: true },
          { label: '🩺 Saúde Pública', value: 'FORM_SAUDE_V1 (Médicos, Enfermagem, Odonto, ACS/ACE)', code: true },
          { label: '📚 Magistério', value: 'FORM_MAGISTERIO_V1 (Professores, Pedagogos, SMED)', code: true },
          { label: '🏛️ Quadro Geral', value: 'FORM_GERAL_V1 (Administrativo, Operacional, Finanças)', code: true },
          { label: 'Metodologia', value: 'Escala Gráfica de Desempenho (Chiavenato, Graus 1 a 5)' },
          { label: 'Trava Anti-Leniência (CIT)', value: 'Ativa (Graus 1 e 5 exigem Diário de Bordo)' },
        ],
      });
    } catch (err: any) {
      setShowConfirmSeedModal(false);
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Falha na Sincronização',
        message: err?.message || 'Erro ao sincronizar os modelos oficiais.',
      });
    } finally {
      setLoadingSeed(false);
    }
  };

  // Abre simulador / espelho do instrumento
  const handleAbrirSimulador = (m: ApiModeloFormulario) => {
    setSimuladorModelo(m);
    // Inicializa com grau 3 em todas as perguntas
    const initial: Record<string, number> = {};
    m.perguntas_ativas?.forEach((p) => {
      initial[p.codigo] = 3;
    });
    setSimuladorRespostas(initial);
    setShowSimuladorModal(true);
  };

  // Colunas TanStack do DataTable Primário
  const columns = useMemo<ColumnDef<PerguntaComGrupo>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Cód.',
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono font-bold text-foreground">
            {row.original.codigo}
          </span>
        ),
      },
      {
        accessorKey: 'grupoFuncionalNome',
        header: 'Grupo Funcional / Carreira',
        size: 190,
        cell: ({ row }) => {
          const gKey = row.original.grupoFuncionalKey || 'geral';
          const meta = GRUPOS_FUNCIONAIS[gKey] || GRUPOS_FUNCIONAIS.geral;
          const Icon = meta.icon;
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`font-semibold text-xs py-0.5 px-2 flex items-center gap-1.5 ${meta.corBadge}`}>
                <Icon className="h-3 w-3 shrink-0" />
                <span>{meta.nome}</span>
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'enunciado',
        header: 'Fator Avaliado & Descrição Operacional',
        cell: ({ row }) => (
          <div className="space-y-0.5 py-1">
            <div className="font-medium text-foreground text-xs leading-snug">
              {row.original.enunciado}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">Modelo: {row.original.modeloCodigo}</span>
              <span>•</span>
              <span className="capitalize">Grupo: {row.original.grupo_key}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'peso',
        header: 'Peso',
        size: 90,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="font-mono tabular-nums font-bold text-foreground text-xs">
              {Number(row.original.peso).toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">pts</span>
          </div>
        ),
      },
      {
        accessorKey: 'exige_evidencia',
        header: 'Trava CIT',
        size: 140,
        cell: ({ row }) =>
          row.original.exige_evidencia ? (
            <StatusChip label="Exige CIT (Graus 1 e 5)" variant="warning" />
          ) : (
            <StatusChip label="Escala Padrão" variant="neutral" />
          ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleEditarPergunta(row.original)}
              title="Editar fator / pergunta"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() =>
                setConfirmDeleteModal({
                  open: true,
                  perguntaId: row.original.id,
                  codigo: row.original.codigo,
                  modeloId: row.original.modelo_id,
                })
              }
              title="Remover fator"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* ── Topo: Cabeçalho Canônico PageHeader ───────────────────────── */}
      <PageHeader
        title="Banco de Perguntas & Instrumentos por Grupo Funcional"
        subtitle="Escala Gráfica de Chiavenato parametrizada para Segurança Pública, Saúde, Magistério e Quadro Geral"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModalGraus(true)}
              className="border-border text-foreground font-semibold"
            >
              <Scale className="h-4 w-4 mr-1.5 text-primary" />
              Estrutura dos 5 Graus
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmSeedModal(true)}
              className="border-border text-foreground font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
              Carregar Banco Padrão (4 Grupos)
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleAbrirNovaPergunta()}
              className="bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Fator / Pergunta
            </Button>
          </div>
        }
      />

      {/* ── Top KPIs do Banco de Instrumentos ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Grupos Funcionais"
          value={kpis.totalModelos || 4}
          caption="Segurança, Saúde, Magistério e Geral"
          accentClassName="border-l-primary"
        />

        <StatCard
          label="Fatores Cadastrados"
          value={kpis.totalPerguntas}
          caption="Média de ~7 a 8 fatores por grupo funcional"
          accentClassName="border-l-indigo-500"
        />

        <StatCard
          label="Metodologia Oficial"
          value="Escala Gráfica (1 a 5)"
          caption="Chiavenato + Diário de Bordo (CIT)"
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          label="Trava 100% de Pesos"
          value="100%"
          caption="Assiduidade, Disciplina e Competências"
          accentClassName="border-l-emerald-500"
          valueClassName="text-status-success"
          captionClassName="text-status-success"
        />
      </div>

      {/* ── Seletor Rápido em Abas/Pills por Grupo Funcional ──────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtrar por Carreira / Grupo do Servidor
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            Exibindo: <strong className="text-foreground">{perguntasFiltradas.length}</strong> de{' '}
            <strong className="text-foreground">{todasPerguntas.length}</strong> fatores
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Aba: Todos */}
          <button
            type="button"
            onClick={() => setSelectedGrupo('todos')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedGrupo === 'todos'
                ? 'bg-primary/10 border-primary text-primary shadow-xs'
                : 'bg-card border-border hover:bg-muted/40 text-foreground'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold">Todos os Grupos</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {todasPerguntas.length}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Visão geral de todos os instrumentos
            </p>
          </button>

          {/* Abas: Segurança Pública, Saúde, Magistério, Quadro Geral */}
          {Object.entries(GRUPOS_FUNCIONAIS).map(([gKey, meta]) => {
            const Icon = meta.icon;
            const count = todasPerguntas.filter((p) => p.grupoFuncionalKey === gKey).length;
            const isSelected = selectedGrupo === gKey;
            return (
              <button
                key={gKey}
                type="button"
                onClick={() => setSelectedGrupo(gKey)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                    : 'bg-card border-border hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-xs font-bold truncate">{meta.nome}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {count}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {meta.publicoAlvo}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Banner Informativo do Grupo Selecionado ───────────────────── */}
      {selectedGrupo !== 'todos' && GRUPOS_FUNCIONAIS[selectedGrupo] && (
        <Card className="p-4 bg-muted/15 border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = GRUPOS_FUNCIONAIS[selectedGrupo].icon;
                return (
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })()}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Grupo Funcional: {GRUPOS_FUNCIONAIS[selectedGrupo].nome}
                  </h4>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {GRUPOS_FUNCIONAIS[selectedGrupo].codigoModelo}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {GRUPOS_FUNCIONAIS[selectedGrupo].descricao}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Base Legal: {GRUPOS_FUNCIONAIS[selectedGrupo].leiReferencia}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const m = modelos.find((mod) => getGrupoFuncionalFromModelo(mod).key === selectedGrupo);
                if (!m) return null;
                return (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirSimulador(m)}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Simular Formulário
                  </Button>
                );
              })()}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  const m = modelos.find((mod) => getGrupoFuncionalFromModelo(mod).key === selectedGrupo);
                  handleAbrirNovaPergunta(m?.id);
                }}
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Fator ao Grupo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Barra de Filtros Avançados da Tabela DataTable ───────────── */}
      <Card className="p-3 bg-muted/20 border-border">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Busca textual */}
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar por código (P1), fator avaliado, cargo ou descrição..."
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          {/* Filtro por categoria do fator */}
          <div className="w-full md:w-56">
            <Select
              value={filtroCategoria}
              onChange={(val) => setFiltroCategoria(val as string)}
              options={[
                { value: 'todos', label: 'Todas as Categorias' },
                { value: 'assiduidade', label: 'Assiduidade / Plantão' },
                { value: 'disciplina', label: 'Disciplina / Ética' },
                { value: 'competencias', label: 'Competências / Técnica' },
              ]}
              aria-label="Filtrar por Categoria"
            />
          </div>

          {/* Filtro por Trava CIT */}
          <div className="w-full md:w-52">
            <Select
              value={filtroTravaCit}
              onChange={(val) => setFiltroTravaCit(val as string)}
              options={[
                { value: 'todos', label: 'Todas as Travas' },
                { value: 'com_trava', label: 'Exige Trava CIT' },
                { value: 'sem_trava', label: 'Sem Trava CIT' },
              ]}
              aria-label="Filtrar por Trava CIT"
            />
          </div>
        </div>
      </Card>

      {/* ── Visualização Primária: DataTable de Fatores (Sempre Ativada) ── */}
      <Card className="gap-0 py-0 overflow-hidden border-border shadow-2xs">
        <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Matriz do Banco de Perguntas
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Estrutura regulamentar de fatores ativos com ponderação de pesos e regras de incidentes críticos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              Registros: <strong className="text-foreground">{perguntasFiltradas.length}</strong>
            </span>
          </div>
        </CardHeader>

        <DataTable
          data={perguntasFiltradas}
          columns={columns}
          fixedLayout
          pageSizeSelector
          pageSize={10}
          emptyText="Nenhum fator encontrado com os filtros selecionados. Clique em 'Carregar Banco Padrão' ou 'Adicionar Fator'."
        />
      </Card>

      {/* ── Modal: Adicionar / Editar Fator ───────────────────────────── */}
      <Modal
        open={showModalPergunta}
        onClose={() => setShowModalPergunta(false)}
        title={editingPerguntaId ? 'Editar Fator / Pergunta' : 'Novo Fator do Instrumento de Avaliação'}
        size="md"
      >
        <form onSubmit={handleSalvarPergunta} className="space-y-4 py-2">
          {/* Seletor de Modelo / Grupo Funcional */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Instrumento / Grupo Funcional
            </label>
            <Select
              value={String(perguntaModeloId || modelos[0]?.id || '')}
              onChange={(val) => setPerguntaModeloId(Number(val))}
              options={modelos.map((m) => {
                const g = getGrupoFuncionalFromModelo(m);
                return {
                  value: String(m.id),
                  label: `${g.nome} — ${m.codigo} (${m.nome})`,
                };
              })}
              aria-label="Grupo Funcional Alvo"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Código
              </label>
              <Input
                value={perguntaCodigo}
                onChange={(e) => setPerguntaCodigo(e.target.value)}
                placeholder="Ex.: P1, P2"
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tipo da Pergunta
              </label>
              <Select
                value={perguntaTipo}
                onChange={(val) => setPerguntaTipo(val as TipoPergunta)}
                options={[
                  { value: 'escala_grafica', label: 'Escala Gráfica (Graus 1 a 5 - Chiavenato)' },
                  { value: 'escolha_simples', label: 'Escolha Simples' },
                  { value: 'escolha_multipla', label: 'Escolha Múltipla' },
                  { value: 'nota_0_10', label: 'Nota Decimal de 0 a 10' },
                  { value: 'sim_nao', label: 'Sim / Não' },
                  { value: 'texto_livre', label: 'Texto Livre' },
                ]}
                aria-label="Tipo da Pergunta"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Enunciado do Fator Avaliado
            </label>
            <Input
              value={perguntaEnunciado}
              onChange={(e) => setPerguntaEnunciado(e.target.value)}
              placeholder="Ex.: Mediação de Conflitos e Gerenciamento de Crises"
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Categoria Temática
              </label>
              <Select
                value={perguntaGrupo}
                onChange={(val) => setPerguntaGrupo(val as string)}
                options={[
                  { value: 'assiduidade', label: 'Assiduidade / Pontualidade' },
                  { value: 'disciplina', label: 'Disciplina / Ética' },
                  { value: 'competencias', label: 'Competências / Técnica' },
                ]}
                aria-label="Categoria Temática"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Peso Relativo (Pontos)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10.0"
                value={perguntaPeso}
                onChange={(e) => setPerguntaPeso(Number(e.target.value))}
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted/20 rounded-xl border border-border space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Preenchimento Obrigatório</div>
                <div className="text-muted-foreground text-[11px]">
                  O formulário só poderá ser concluído com resposta a este fator
                </div>
              </div>
              <Switch checked={perguntaObrigatoria} onCheckedChange={setPerguntaObrigatoria} />
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <div>
                <div className="font-semibold text-foreground">Trava Anti-Leniência (Exige CIT)</div>
                <div className="text-muted-foreground text-[11px]">
                  Notas extremas (Grau 1 ou Grau 5) exigem apontamento no Diário de Bordo
                </div>
              </div>
              <Switch checked={perguntaExigeEvidencia} onCheckedChange={setPerguntaExigeEvidencia} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModalPergunta(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={savingPergunta}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {savingPergunta ? (
                <>
                  <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : editingPerguntaId ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Fator'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Estrutura dos 5 Graus de Chiavenato ─────────────────── */}
      <Modal
        open={showModalGraus}
        onClose={() => setShowModalGraus(false)}
        title="Escala Gráfica de Avaliação de Desempenho (Chiavenato, Graus 1 a 5)"
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="default" size="sm" onClick={() => setShowModalGraus(false)}>
              Entendido
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                Metodologia Canônica e Trava Anti-Leniência
              </p>
              <p className="text-muted-foreground leading-relaxed">
                A avaliação utiliza estritamente a Escala Gráfica em 5 graus contínuos. A Lei Municipal estipula que
                atribuir graus extremos (1 ou 5) é bloqueado pelo sistema a menos que haja apontamento no Diário de Bordo (CIT).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {GRAUS_CHIAVENATO.map((g) => (
              <div
                key={g.grau}
                className={`p-3 rounded-xl border transition-all ${g.cor}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">{g.rotulo}</span>
                    {g.travaCit && (
                      <Badge variant="outline" className="font-semibold text-[10px] bg-status-warning-bg text-status-warning border-status-warning-border">
                        Exige Diário de Bordo (CIT)
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold">Nota {g.grau}.0</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {g.descricao}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {g.travaDesc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Modal: Simulador / Espelho do Instrumento ──────────────────── */}
      {showSimuladorModal && simuladorModelo && (
        <Modal
          open={showSimuladorModal}
          onClose={() => setShowSimuladorModal(false)}
          title={`Simulador: ${simuladorModelo.nome}`}
          size="lg"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-muted-foreground">
                Média simulada:{' '}
                <strong className="font-mono text-foreground text-sm">
                  {(
                    Object.values(simuladorRespostas).reduce((a, b) => a + b, 0) /
                    (Object.keys(simuladorRespostas).length || 1)
                  ).toFixed(2)}
                </strong>{' '}
                / 5.0
              </div>
              <Button variant="default" size="sm" onClick={() => setShowSimuladorModal(false)}>
                Fechar Simulador
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Esta prévia demonstra como o avaliador preencherá as notas do servidor neste grupo funcional:
            </p>

            <div className="space-y-3">
              {simuladorModelo.perguntas_ativas?.map((p) => {
                const selected = simuladorRespostas[p.codigo] || 3;
                return (
                  <div key={p.codigo} className="p-3 bg-muted/15 rounded-xl border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-foreground text-xs mr-2">
                          {p.codigo}
                        </span>
                        <span className="font-medium text-foreground text-xs">
                          {p.enunciado}
                        </span>
                      </div>
                      {p.exige_evidencia && (
                        <Badge variant="outline" className="text-[10px] shrink-0 font-semibold bg-status-warning-bg text-status-warning border-status-warning-border">
                          Trava CIT
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            setSimuladorRespostas((prev) => ({
                              ...prev,
                              [p.codigo]: g,
                            }))
                          }
                          className={`p-2 rounded-lg text-center border text-xs font-semibold transition-all ${
                            selected === g
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className="font-mono text-xs">Grau {g}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {g === 1 ? 'Insuf.' : g === 2 ? 'Reg.' : g === 3 ? 'Bom' : g === 4 ? 'Ótimo' : 'Excel.'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal de Confirmação: Carga do Banco Padrão dos 4 Grupos ──── */}
      <Modal
        open={showConfirmSeedModal}
        onClose={() => !loadingSeed && setShowConfirmSeedModal(false)}
        title="Sincronizar Banco de Perguntas (4 Grupos Oficiais)"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingSeed}
              onClick={() => setShowConfirmSeedModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={loadingSeed}
              onClick={handleConfirmSeedPadrao}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {loadingSeed ? (
                <>
                  <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Sincronizando 4 Grupos...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Confirmar e Gerar
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-status-warning-bg text-status-warning border border-status-warning-border shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Deseja sincronizar os 4 Grupos Funcionais oficiais?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta ação configurará os modelos de formulário e perguntas específicas para cada carreira com a metodologia da Escala Gráfica de Chiavenato:
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5 text-xs">
            <div className="font-semibold text-foreground">Instrumentos que serão provisionados:</div>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Segurança Pública (FORM_SEGURANCA_V1)</strong>
                  <p className="text-[11px]">Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito e Defesa Social (7 fatores)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Saúde Pública (FORM_SAUDE_V1)</strong>
                  <p className="text-[11px]">Médicos, Enfermagem, Técnicos, Odontologia, ACS/ACE e SMS (7 fatores)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Magistério Municipal (FORM_MAGISTERIO_V1)</strong>
                  <p className="text-[11px]">Professores, Pedagogos, Educadores Infantis e SMED (7 fatores pedagógicos)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Quadro Geral (FORM_GERAL_V1)</strong>
                  <p className="text-[11px]">Cargos Administrativos, Operacionais, Obras, Finanças e demais secretarias (8 fatores)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal de Confirmação: Excluir Pergunta ─────────────────────── */}
      {confirmDeleteModal && (
        <Modal
          open={confirmDeleteModal.open}
          onClose={() => setConfirmDeleteModal(null)}
          title="Remover Pergunta do Instrumento"
          size="sm"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteModal(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmarExclusaoPergunta}
              >
                Remover Fator
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              Tem certeza de que deseja remover o fator{' '}
              <span className="font-mono font-bold text-foreground">
                {confirmDeleteModal.codigo}
              </span>{' '}
              deste instrumento?
            </p>
            <p className="text-xs text-status-warning bg-status-warning-bg p-2.5 rounded-lg border border-status-warning-border">
              Atenção: Avaliações já homologadas em ciclos anteriores não serão alteradas, mas este fator deixará de constar nos novos formulários.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Modal de Feedback / Sucesso / Erro ─────────────────────────── */}
      {feedbackModal && (
        <Modal
          open={feedbackModal.open}
          onClose={() => setFeedbackModal(null)}
          title={feedbackModal.title}
          size="md"
          footer={
            <div className="flex justify-end w-full">
              <Button
                variant={feedbackModal.type === 'error' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setFeedbackModal(null)}
              >
                {feedbackModal.type === 'success' ? 'Continuar' : 'Fechar'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  feedbackModal.type === 'success'
                    ? 'bg-status-success-bg text-status-success border border-status-success-border'
                    : feedbackModal.type === 'error'
                    ? 'bg-status-danger-bg text-status-danger border border-status-danger-border'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {feedbackModal.type === 'success' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : feedbackModal.type === 'error' ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {feedbackModal.message}
                </p>

                {feedbackModal.type === 'success' && (
                  <div className="mt-2">
                    <StatusChip label="Status: Sincronizado e Ativo" variant="success" />
                  </div>
                )}
              </div>
            </div>

            {feedbackModal.details && feedbackModal.details.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalhamento dos Instrumentos
                </div>
                <div className="space-y-1.5 divide-y divide-border text-xs">
                  {feedbackModal.details.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span
                        className={`font-medium text-foreground ${
                          item.code ? 'font-mono text-[11px]' : ''
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
