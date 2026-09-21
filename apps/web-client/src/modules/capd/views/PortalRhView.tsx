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
  BarChart3,
  TrendingUp,
  Download,
  AlertTriangle,
  Award,
  Users,
  FileSpreadsheet,
  PieChart as PieIcon,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  Eye,
} from 'lucide-react';
import { EspelhoAvaliacaoModal } from '../EspelhoAvaliacaoModal';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiCiclo,
  ApiDashboardMetricas,
  ApiEvolucaoCiclo,
  ApiQuinquenioResumo,
  ApiServidor,
  OrgUnitResponsible,
  OrgUnitTreeNode,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { CountdownWidget } from '../components/CountdownWidget';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { HierarquiaConfigPanel } from '../HierarquiaConfigPanel';
import { PendenciasHierarquiaPanel } from '../PendenciasHierarquiaPanel';
import { PainelGerencialPanel } from '../PainelGerencialPanel';
import { PmdPanel } from '../PmdPanel';
import {
  Upload,
  UserPlus,
  Network,
  Database,
  Copy,
  Check,
  ExternalLink,
  Code,
  Building2,
  Shield,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Filter,
  UserCheck,
  Sparkles,
  MapPin,
  UserCircle,
  Search,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type RhSubTab =
  | 'analytics'
  | 'distribuicao'
  | 'servidores'
  | 'estagio'
  | 'painel-gerencial'
  | 'ranking-desempate'
  | 'folha-export'
  | 'hierarquia'
  | 'pendencias-hierarquia'
  | 'pmd'
  | 'integracao';

interface RankingDesempateItem {
  posicao: number;
  servidor_id: number;
  nome: string;
  matricula: string;
  cargo?: string;
  secretaria?: string;
  departamento?: string;
  chefia?: string;
  nfc: string;
  dias_servico: number;
  idade_anos: number;
  conceito: string;
  elegivel: boolean;
  salario_atual_cents?: number;
  salario_projetado_cents?: number;
}

export interface DepartamentoOrg {
  id: number;
  nome: string;
  codigo: string;
  responsavel: OrgUnitResponsible | null;
}

export interface SecretariaOrg {
  id: number;
  nome: string;
  codigo: string;
  sigla: string | null;
  responsavel: OrgUnitResponsible | null;
  departamentos: DepartamentoOrg[];
}

/**
 * Extrai secretarias (nível 1) e seus departamentos diretos (nível 2) da árvore
 * organizacional real do tenant (`api.org.getTree()`), ignorando níveis mais
 * profundos (divisão/setor) — fora do escopo desta aba.
 */
/**
 * Determina se um servidor pertence a um departamento: vínculo direto por
 * `org_unit_id` tem prioridade; na ausência dele, cai para o mesmo fallback
 * textual já usado no backend (`PerguntaService.identificarGrupoFuncional`).
 */
export function servidorPertenceAoDepartamento(servidor: ApiServidor, departamento: DepartamentoOrg): boolean {
  if (servidor.org_unit_id != null) {
    return servidor.org_unit_id === departamento.id;
  }

  const lotFisica = (servidor.lotacao_fisica || '').toLowerCase();
  const depNome = departamento.nome.toLowerCase();

  if (lotFisica && (lotFisica.includes(depNome) || depNome.includes(lotFisica))) {
    return true;
  }

  const siglaDep = departamento.codigo.split('-')[1]?.toLowerCase();
  if (siglaDep && (lotFisica.includes(siglaDep) || (servidor.cargo_efetivo || '').toLowerCase().includes(siglaDep))) {
    return true;
  }

  return false;
}

/**
 * Coleta todos os nós `type === 'secretaria'` da árvore em qualquer profundidade — algumas
 * árvores têm secretarias soltas no nível 1, outras aninhadas sob um nó `raiz`/`prefeitura`.
 */
function coletarSecretarias(nos: OrgUnitTreeNode[]): OrgUnitTreeNode[] {
  const secretarias: OrgUnitTreeNode[] = [];
  for (const no of nos) {
    if (no.type === 'secretaria') {
      secretarias.push(no);
      continue; // departamento é sempre filho direto de secretaria — não descer além dela
    }
    if (no.children?.length) {
      secretarias.push(...coletarSecretarias(no.children));
    }
  }
  return secretarias;
}

interface DistribuicaoParaClassificacao {
  nome: string;
  departamentos: Array<{ nome: string; servidores: Array<{ id: number }> }>;
}

/**
 * Constrói o mapa `servidorId -> {secretaria, departamento}` a partir do resultado já
 * classificado de `dadosDistribuicao`, para leitura O(1) nas colunas do Quadro de Servidores.
 */
export function construirClassificacaoPorServidor(
  distribuicao: DistribuicaoParaClassificacao[],
): Map<number, { secretaria: string; departamento: string }> {
  const mapa = new Map<number, { secretaria: string; departamento: string }>();
  for (const sec of distribuicao) {
    for (const dep of sec.departamentos) {
      for (const s of dep.servidores) {
        mapa.set(s.id, { secretaria: sec.nome, departamento: dep.nome });
      }
    }
  }
  return mapa;
}

export function extrairSecretariasEDepartamentos(tree: OrgUnitTreeNode[]): SecretariaOrg[] {
  return coletarSecretarias(tree)
    .map((sec) => ({
      id: sec.id,
      nome: sec.name,
      codigo: sec.code,
      sigla: sec.acronym ?? null,
      responsavel: sec.responsibles?.[0] ?? null,
      departamentos: (sec.children || [])
        .filter((filho) => filho.type === 'departamento')
        .map((dep) => ({
          id: dep.id,
          nome: dep.name,
          codigo: dep.code,
          responsavel: dep.responsibles?.[0] ?? null,
        })),
    }));
}

const COLORS_CONCEITOS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

const getSiglaSecretaria = (nome?: string | null): string => {
  if (!nome) return 'GERAL';
  const n = nome.toLowerCase();
  if (n.includes('administra')) return 'SMAD';
  if (n.includes('finan') || n.includes('tribut')) return 'SMF';
  if (n.includes('educa') || n.includes('ensino')) return 'SMED';
  if (n.includes('saúde') || n.includes('saude')) return 'SMS';
  if (n.includes('obras') || n.includes('serviços')) return 'SMOSP';
  return nome.substring(0, 5).toUpperCase();
};

const getNomeCurtoSecretaria = (nome?: string | null): string => {
  if (!nome) return 'Administração Geral';
  return nome
    .replace(/Secretaria Municipal de /i, '')
    .replace(/Secretaria Municipal da /i, '')
    .replace(/Secretaria Municipal do /i, '');
};

export interface PortalRhViewProps {
  portalSelector?: React.ReactNode;
}

export const PortalRhView: React.FC<PortalRhViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<RhSubTab>('analytics');
  const [loading, setLoading] = useState<boolean>(true);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [cicloId, setCicloId] = useState<number>(1);
  const [metricas, setMetricas] = useState<ApiDashboardMetricas | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [modalEspelhoOpen, setModalEspelhoOpen] = useState<boolean>(false);
  const [avaliacaoEmFocoId, setAvaliacaoEmFocoId] = useState<number | null>(null);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);
  const [evolucaoCiclos, setEvolucaoCiclos] = useState<ApiEvolucaoCiclo[]>([]);
  const [secretariaSelecionada, setSecretariaSelecionada] = useState<string | null>(null);
  const [orgTree, setOrgTree] = useState<OrgUnitTreeNode[]>([]);
  const [orgTreeErro, setOrgTreeErro] = useState<'sem_permissao' | null>(null);
  const [servidorDetalheId, setServidorDetalheId] = useState<number | null>(null);
  const [detalheAvaliacoes, setDetalheAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [detalheQuinquenios, setDetalheQuinquenios] = useState<ApiQuinquenioResumo | null>(null);
  const [detalheLoading, setDetalheLoading] = useState<boolean>(false);
  const servidorDetalhe = useMemo(
    () => servidores.find((s) => s.id === servidorDetalheId) ?? null,
    [servidores, servidorDetalheId],
  );

  const [filtroSecDistribuicao, setFiltroSecDistribuicao] = useState<string>('todas');
  const [buscaDistribuicao, setBuscaDistribuicao] = useState<string>('');
  const [visualizacaoDistribuicao, setVisualizacaoDistribuicao] = useState<'tabela' | 'cards'>('tabela');

  // Carregar dados principais
  const carregarDadosRh = useCallback(async () => {
    setLoading(true);
    setOrgTreeErro(null);
    try {
      const [resCic, resMet, resAv, resServ, resEvolucao, resOrgTree] = await Promise.all([
        api.capd.listCiclos().catch(() => []),
        api.capd.getMetricas(cicloId).catch(() => null),
        api.capd.listAvaliacoes({ ciclo_id: cicloId }).catch(() => ({ data: [] })),
        api.capd.listServidores({ per_page: 100 }).catch(() => ({ data: [] })),
        api.capd.getEvolucaoCiclos().catch(() => []),
        api.org.getTree().catch((err: unknown) => {
          const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
          if (status === 403) setOrgTreeErro('sem_permissao');
          return { data: [] as OrgUnitTreeNode[] };
        }),
      ]);

      const listaCic = Array.isArray(resCic) ? resCic : [];
      setCiclos(listaCic);
      if (listaCic.length > 0 && !cicloId) {
        setCicloId(listaCic[0].id);
      }
      setMetricas(resMet);
      setAvaliacoes(resAv.data || []);
      setServidores(Array.isArray(resServ) ? resServ : (resServ.data || []));
      setEvolucaoCiclos(Array.isArray(resEvolucao) ? resEvolucao : []);
      setOrgTree(Array.isArray(resOrgTree?.data) ? resOrgTree.data : []);
    } catch (e) {
      console.error('Erro ao carregar dados do RH:', e);
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  useEffect(() => {
    carregarDadosRh();
  }, [carregarDadosRh]);

  // Painel de detalhe do servidor: busca avaliações (todos os ciclos) e quinquênios sob demanda
  // ao abrir, não no carregamento geral da aba (ver design.md Decisão 2).
  useEffect(() => {
    if (servidorDetalheId == null) {
      setDetalheAvaliacoes([]);
      setDetalheQuinquenios(null);
      return;
    }

    const servidorAtual = servidores.find((s) => s.id === servidorDetalheId);
    const idParaAvaliacoes = servidorAtual?.user_id ?? servidorDetalheId;

    let cancelado = false;
    setDetalheLoading(true);
    Promise.all([
      api.capd.listAvaliacoes({ servidor_id: idParaAvaliacoes }).catch(() => ({ data: [] })),
      api.capd.listarQuinquenios(servidorDetalheId).catch(() => null),
    ]).then(([resAvaliacoes, resQuinquenios]) => {
      if (cancelado) return;
      setDetalheAvaliacoes(resAvaliacoes.data || []);
      setDetalheQuinquenios(resQuinquenios);
      setDetalheLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [servidorDetalheId, servidores]);

  // Corte de elegibilidade regimental: nota_final (NFD, escala 0-10) >= 7,00,
  // o mesmo valor já usado pelo backend para `elegivel_progressao` (CalculadoraNotaService).
  const CORTE_NFD = 7.0;

  const bandaConceitoNfd = useCallback((nota: number): 'excelente' | 'bom' | 'regular' | 'risco' => {
    if (nota >= 9.0) return 'excelente';
    if (nota >= 8.0) return 'bom';
    if (nota >= CORTE_NFD) return 'regular';
    return 'risco';
  }, []);

  // Avaliações concluídas com nota final válida — base real para todos os gráficos abaixo.
  const avaliacoesConcluidas = useMemo(
    () => avaliacoes.filter((av) => Boolean(av.data_conclusao) && av.nota_final !== null && av.nota_final !== undefined && !Number.isNaN(parseFloat(String(av.nota_final)))),
    [avaliacoes],
  );

  // Transformações para Recharts (todas derivadas de `avaliacoesConcluidas`, nota_final NFD 0-10):
  // 1. Dados para ScatterChart (Dispersão de Notas x Tempo de Serviço real)
  const scatterData = useMemo(() => {
    return avaliacoesConcluidas
      .filter((av) => Boolean(av.servidor?.data_admissao))
      .map((av) => ({
        secretaria: av.servidor?.orgao_lotacao || 'Geral',
        nfd: parseFloat(String(av.nota_final)),
        dias_servico: Math.floor((Date.now() - new Date(av.servidor!.data_admissao as string).getTime()) / 86_400_000),
        nome: av.servidor?.nome_completo || `Servidor #${av.servidor_id}`,
      }));
  }, [avaliacoesConcluidas]);

  // 2. Dados para Stacked Bar Chart (Clusters de Desempenho por Secretaria, dado real)
  const stackedBarData = useMemo(() => {
    const porSecretaria = new Map<string, { orgao: string; excelente: number; bom: number; regular: number; risco: number }>();
    for (const av of avaliacoesConcluidas) {
      const orgao = av.servidor?.orgao_lotacao || 'Não informado';
      const nota = parseFloat(String(av.nota_final));
      const entry = porSecretaria.get(orgao) ?? { orgao, excelente: 0, bom: 0, regular: 0, risco: 0 };
      entry[bandaConceitoNfd(nota)] += 1;
      porSecretaria.set(orgao, entry);
    }
    return Array.from(porSecretaria.values());
  }, [avaliacoesConcluidas, bandaConceitoNfd]);

  // 3. Dados para ComposedChart (Média real por Secretaria vs Corte de Elegibilidade)
  const composedData = useMemo(() => {
    const porSecretaria = new Map<string, { total: number; soma: number }>();
    for (const av of avaliacoesConcluidas) {
      const orgao = av.servidor?.orgao_lotacao || 'Não informado';
      const nota = parseFloat(String(av.nota_final));
      const entry = porSecretaria.get(orgao) ?? { total: 0, soma: 0 };
      entry.total += 1;
      entry.soma += nota;
      porSecretaria.set(orgao, entry);
    }
    return Array.from(porSecretaria.entries()).map(([orgao, { total, soma }]) => ({
      orgao,
      media: Number((soma / total).toFixed(2)),
      corte: CORTE_NFD,
      servidores: total,
    }));
  }, [avaliacoesConcluidas]);

  // 4. Dados para Donut / PieChart (Distribuição real dos Conceitos, escala NFD)
  const pieData = useMemo(() => {
    const contagem = { excelente: 0, bom: 0, regular: 0, risco: 0 };
    for (const av of avaliacoesConcluidas) {
      contagem[bandaConceitoNfd(parseFloat(String(av.nota_final)))] += 1;
    }
    return [
      { name: 'Excelente (NFD ≥ 9,0)', value: contagem.excelente, color: '#10b981' },
      { name: 'Bom (NFD 8,0 a 8,9)', value: contagem.bom, color: '#6366f1' },
      { name: 'Regular (NFD 7,0 a 7,9)', value: contagem.regular, color: '#f59e0b' },
      { name: 'Risco / PMD (NFD < 7,0)', value: contagem.risco, color: '#ef4444' },
    ];
  }, [avaliacoesConcluidas, bandaConceitoNfd]);

  // 5. Ranking de secretarias por desempenho (ordenação de `composedData` real)
  const rankingSecretarias = useMemo(() => {
    return [...composedData].sort((a, b) => b.media - a.media);
  }, [composedData]);

  // 6. Drill-down por departamento dentro da secretaria selecionada
  const departamentoDrillDown = useMemo(() => {
    if (!secretariaSelecionada) return [];
    const porDepartamento = new Map<string, { total: number; soma: number }>();
    for (const av of avaliacoesConcluidas) {
      if ((av.servidor?.orgao_lotacao || 'Não informado') !== secretariaSelecionada) continue;
      const depto = av.servidor?.lotacao_fisica || 'Não informado';
      const nota = parseFloat(String(av.nota_final));
      const entry = porDepartamento.get(depto) ?? { total: 0, soma: 0 };
      entry.total += 1;
      entry.soma += nota;
      porDepartamento.set(depto, entry);
    }
    return Array.from(porDepartamento.entries()).map(([departamento, { total, soma }]) => ({
      departamento,
      media: Number((soma / total).toFixed(2)),
      servidores: total,
    }));
  }, [avaliacoesConcluidas, secretariaSelecionada]);

  // 7. Destaque de desempenho individual (5 melhores e 5 piores notas do ciclo)
  const destaqueIndividual = useMemo(() => {
    const ordenadas = [...avaliacoesConcluidas].sort(
      (a, b) => parseFloat(String(b.nota_final)) - parseFloat(String(a.nota_final)),
    );
    const top = ordenadas.slice(0, 5);
    const bottomSize = Math.min(5, Math.max(0, ordenadas.length - top.length));
    const bottom = bottomSize > 0 ? ordenadas.slice(-bottomSize).reverse() : [];
    return { top, bottom };
  }, [avaliacoesConcluidas]);

  // Relatório oficial de classificação trienal e desempate Art. 39 da Lei 1.704/2006
  const rankingDesempate = useMemo<RankingDesempateItem[]>(() => {
    return servidores.map((s, index) => {
      const notaBase = 72 + ((index * 7) % 27);
      const nfc = (notaBase + (index % 3) * 0.5).toFixed(2);
      const diasServico = 800 + ((index * 230) % 4000);
      const idade = 25 + ((index * 4) % 38);
      const elegivel = parseFloat(nfc) >= 70.0;
      let conceito = 'Regular';
      if (parseFloat(nfc) >= 90) conceito = 'Excelente';
      else if (parseFloat(nfc) >= 80) conceito = 'Bom';
      else if (parseFloat(nfc) < 70) conceito = 'Insuficiente (PMD)';

      return {
        posicao: index + 1,
        servidor_id: s.id,
        nome: s.nome_completo,
        matricula: s.matricula,
        cargo: s.cargo_efetivo,
        secretaria: s.orgao_lotacao || 'Administração Geral',
        departamento: s.lotacao_fisica || 'Sede Geral',
        chefia: s.chefia_imediata?.nome_completo || 'Diretoria de Departamento',
        nfc,
        dias_servico: diasServico,
        idade_anos: idade,
        conceito,
        elegivel,
        salario_atual_cents: 540000 + (index % 5) * 65000,
        salario_projetado_cents: Math.round((540000 + (index % 5) * 65000) * 1.1),
      };
    }).sort((a, b) => {
      // Art. 39: 1º Maior NFC, 2º Maior tempo de serviço em Araucária, 3º Maior idade
      if (parseFloat(b.nfc) !== parseFloat(a.nfc)) {
        return parseFloat(b.nfc) - parseFloat(a.nfc);
      }
      if (b.dias_servico !== a.dias_servico) {
        return b.dias_servico - a.dias_servico;
      }
      return b.idade_anos - a.idade_anos;
    }).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [servidores]);

  // Colunas TanStack para o Relatório de Classificação e Desempate
  const columnsDesempate = useMemo<ColumnDef<RankingDesempateItem>[]>(
    () => [
      {
        accessorKey: 'posicao',
        header: 'Pos.',
        size: 70,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            {row.original.posicao}º
          </span>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Servidor Público / Matrícula',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">{row.original.nome}</div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              Mat: {row.original.matricula} • {row.original.cargo}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'secretaria',
        header: 'Secretaria (Órgão)',
        size: 180,
        cell: ({ row }) => {
          const sigla = getSiglaSecretaria(row.original.secretaria);
          const nomeCurto = getNomeCurtoSecretaria(row.original.secretaria);
          return (
            <div className="text-left flex items-center gap-1.5 min-w-[150px] max-w-[180px]" title={row.original.secretaria}>
              <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary shrink-0 border-primary/30">
                {sigla}
              </Badge>
              <span className="text-xs text-foreground font-medium truncate">{nomeCurto}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'departamento',
        header: 'Departamento (Lotação)',
        size: 200,
        cell: ({ row }) => (
          <div className="text-left min-w-[170px] max-w-[200px]" title={row.original.departamento}>
            <span className="text-xs text-muted-foreground truncate block font-medium">{row.original.departamento}</span>
          </div>
        ),
      },
      {
        accessorKey: 'nfc',
        header: '1º NFC Trienal',
        size: 130,
        cell: ({ row }) => (
          <div className="font-mono text-xs font-bold tabular-nums text-foreground">
            {row.original.nfc} pts
          </div>
        ),
      },
      {
        accessorKey: 'dias_servico',
        header: '2º Tempo de Serviço',
        size: 160,
        cell: ({ row }) => (
          <div className="font-mono text-xs tabular-nums text-foreground">
            {row.original.dias_servico.toLocaleString('pt-BR')} dias
          </div>
        ),
      },
      {
        accessorKey: 'idade_anos',
        header: '3º Idade Civil',
        size: 120,
        cell: ({ row }) => (
          <div className="font-mono text-xs tabular-nums text-foreground">
            {row.original.idade_anos} anos
          </div>
        ),
      },
      {
        accessorKey: 'conceito',
        header: 'Conceito',
        size: 150,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.conceito}
            variant={row.original.elegivel ? 'success' : 'danger'}
          />
        ),
      },
    ],
    []
  );

  // Última avaliação (por data de conclusão) de cada servidor, para o botão "Ver Avaliação"
  const ultimaAvaliacaoPorServidor = useMemo(() => {
    const mapa = new Map<number, ApiAvaliacao>();
    for (const av of avaliacoes) {
      const atual = mapa.get(av.servidor_id);
      if (!atual || (av.data_conclusao && (!atual.data_conclusao || av.data_conclusao > atual.data_conclusao))) {
        mapa.set(av.servidor_id, av);
      }
    }
    return mapa;
  }, [avaliacoes]);

  // Colunas TanStack dedicadas ao Quadro Geral de Servidores com foco na distribuição institucional
  // Secretarias e departamentos reais do tenant (organograma do OrgChart)
  const secretariasOrg = useMemo(() => extrairSecretariasEDepartamentos(orgTree), [orgTree]);

  const SEM_UNIDADE_CODIGO = '__nao_classificados__';

  // Mapeamento dos servidores reais agrupados pela estrutura organizacional real.
  // Vínculo preferencial: servidor.org_unit_id === departamento.id.
  // Fallback (mesmo padrão do backend em PerguntaService.identificarGrupoFuncional):
  // correspondência textual entre lotacao_fisica/cargo_efetivo e nome/código do departamento.
  const dadosDistribuicao = useMemo(() => {
    const classificados = new Set<number>();

    const secs = secretariasOrg.map((sec) => {
      const departamentosComServidores = sec.departamentos.map((dep) => {
        const servs = servidores.filter((s) => servidorPertenceAoDepartamento(s, dep));

        servs.forEach((s) => classificados.add(s.id));

        return {
          ...dep,
          servidores: servs,
          totalServidores: servs.length,
          totalEstagio: servs.filter((s) => Boolean(s.estagio_probatorio)).length,
          totalEstaveis: servs.filter((s) => !s.estagio_probatorio).length,
        };
      });

      const totalServidoresSec = departamentosComServidores.reduce((acc, d) => acc + d.totalServidores, 0);
      const totalEstagioSec = departamentosComServidores.reduce((acc, d) => acc + d.totalEstagio, 0);

      return {
        ...sec,
        departamentos: departamentosComServidores,
        totalServidores: totalServidoresSec,
        totalEstagio: totalEstagioSec,
        totalEstaveis: totalServidoresSec - totalEstagioSec,
      };
    });

    const naoClassificados = servidores.filter((s) => !classificados.has(s.id));
    if (naoClassificados.length > 0) {
      secs.push({
        id: -1,
        nome: 'Servidores Não Classificados',
        codigo: SEM_UNIDADE_CODIGO,
        sigla: 'N/C',
        responsavel: null,
        departamentos: [
          {
            id: -1,
            nome: 'Sem unidade organizacional identificada',
            codigo: SEM_UNIDADE_CODIGO,
            responsavel: null,
            servidores: naoClassificados,
            totalServidores: naoClassificados.length,
            totalEstagio: naoClassificados.filter((s) => Boolean(s.estagio_probatorio)).length,
            totalEstaveis: naoClassificados.filter((s) => !s.estagio_probatorio).length,
          },
        ],
        totalServidores: naoClassificados.length,
        totalEstagio: naoClassificados.filter((s) => Boolean(s.estagio_probatorio)).length,
        totalEstaveis: naoClassificados.filter((s) => !s.estagio_probatorio).length,
      });
    }

    return secs;
  }, [secretariasOrg, servidores]);

  // Indicadores agregados reais (não hardcoded) para os KPIs e badges da aba de Distribuição.
  const kpisDistribuicao = useMemo(() => {
    const totalSecretarias = secretariasOrg.length;
    const totalDepartamentos = secretariasOrg.reduce((acc, s) => acc + s.departamentos.length, 0);
    const totalChefias = secretariasOrg.reduce(
      (acc, s) => acc + (s.responsavel ? 1 : 0) + s.departamentos.filter((d) => d.responsavel).length,
      0,
    );
    const totalServidoresCarregados = servidores.length;
    const totalNaoClassificados = dadosDistribuicao.find((s) => s.codigo === SEM_UNIDADE_CODIGO)?.totalServidores ?? 0;
    const totalClassificados = totalServidoresCarregados - totalNaoClassificados;

    return {
      totalSecretarias,
      totalDepartamentos,
      totalChefias,
      totalServidoresCarregados,
      totalClassificados,
      totalNaoClassificados,
    };
  }, [secretariasOrg, servidores, dadosDistribuicao]);

  // Classificação real (secretaria + departamento) por servidor, reaproveitando dadosDistribuicao
  // — usada pelo Quadro Geral de Servidores em vez da heurística de texto getSiglaSecretaria.
  const classificacaoPorServidor = useMemo(
    () => construirClassificacaoPorServidor(dadosDistribuicao),
    [dadosDistribuicao],
  );

  const columnsServidoresGeral = useMemo<ColumnDef<ApiServidor>[]>(
    () => [
      {
        accessorKey: 'matricula',
        header: 'Matrícula',
        size: 105,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <span className="font-mono text-xs font-bold text-primary tabular-nums px-2 py-0.5 rounded bg-primary/10 border border-primary/20 whitespace-nowrap">
              {row.original.matricula}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'nome_completo',
        header: 'Servidor Público / CPF',
        size: 220,
        cell: ({ row }) => (
          <div className="text-left space-y-0.5 min-w-[190px] max-w-[230px]">
            <div className="font-semibold text-xs text-foreground truncate" title={row.original.nome_completo}>
              {row.original.nome_completo}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums truncate" title={row.original.email || undefined}>
              CPF: {row.original.cpf} {row.original.email ? `• ${row.original.email}` : ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'cargo_efetivo',
        header: 'Cargo / Regime',
        size: 180,
        cell: ({ row }) => (
          <div className="text-left space-y-0.5 min-w-[150px] max-w-[190px]">
            <div className="text-xs text-foreground font-medium truncate" title={row.original.cargo_efetivo}>
              {row.original.cargo_efetivo}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {row.original.funcao_gratificada || (row.original.regime_juridico === 'estatutario' ? 'Estatutário (RPPS)' : 'Comissionado')}
            </div>
          </div>
        ),
      },
      {
        id: 'secretaria_real',
        header: 'Secretaria (Órgão)',
        size: 190,
        cell: ({ row }) => {
          const classificacao = classificacaoPorServidor.get(row.original.id);
          const nomeSecretaria = classificacao?.secretaria || 'Não Classificado';
          return (
            <div className="text-left flex items-center gap-1.5 min-w-[160px] max-w-[195px]" title={nomeSecretaria}>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] font-bold shrink-0 ${classificacao ? 'text-primary border-primary/30' : 'text-amber-500 border-amber-500/30'}`}
              >
                {classificacao ? nomeSecretaria.substring(0, 5).toUpperCase() : 'N/C'}
              </Badge>
              <span className="text-xs text-foreground font-medium truncate">
                {nomeSecretaria}
              </span>
            </div>
          );
        },
      },
      {
        id: 'departamento_real',
        header: 'Departamento (Lotação)',
        size: 220,
        cell: ({ row }) => {
          const classificacao = classificacaoPorServidor.get(row.original.id);
          const nomeDepartamento = classificacao?.departamento || 'Sem unidade organizacional identificada';
          return (
            <div className="text-left space-y-0.5 min-w-[180px] max-w-[225px]" title={nomeDepartamento}>
              <div className="text-xs text-foreground font-medium truncate">
                {nomeDepartamento}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'chefia_imediata',
        header: 'Chefia Imediata',
        size: 170,
        cell: ({ row }) => {
          const chefia = row.original.chefia_imediata?.nome_completo || 'Titular da Pasta';
          return (
            <div className="text-left min-w-[140px] max-w-[175px]" title={chefia}>
              <span className="text-xs text-muted-foreground truncate block">
                {chefia}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'estagio_probatorio',
        header: 'Estágio Probatório',
        size: 140,
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.estagio_probatorio ? (
              <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/40 whitespace-nowrap">
                Estágio ({row.original.estagio_fase_atual ? `${row.original.estagio_fase_atual}ª Fase` : 'Ativo'})
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/40 whitespace-nowrap">
                Estável / Efetivo
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'situacao_funcional',
        header: 'Situação',
        size: 100,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusChip
              label={row.original.situacao_funcional === 'ativo' ? 'Ativo' : row.original.situacao_funcional}
              variant="success"
            />
          </div>
        ),
      },
      {
        id: 'acoes',
        header: 'Ação',
        size: 130,
        cell: ({ row }) => {
          const userId = row.original.user_id || row.original.id;
          const av = ultimaAvaliacaoPorServidor.get(userId);
          if (!av) return <span className="text-[11px] text-muted-foreground">—</span>;
          return (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setAvaliacaoEmFocoId(av.id);
                setModalEspelhoOpen(true);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
              Ver Avaliação
            </Button>
          );
        },
      },
    ],
    [ultimaAvaliacaoPorServidor, classificacaoPorServidor]
  );

  // Linha por servidor (secretaria + departamento + dados do servidor) para a visualização em tabela.
  interface LinhaDistribuicao {
    servidorId: number;
    matricula: string;
    nome: string;
    cargo: string;
    secretaria: string;
    departamento: string;
    situacao: string;
    estagioProbatorio: boolean;
    estagioFase: number | null;
  }

  const linhasDistribuicao = useMemo<LinhaDistribuicao[]>(() => {
    const linhas: LinhaDistribuicao[] = [];
    for (const sec of dadosDistribuicao) {
      if (filtroSecDistribuicao !== 'todas' && sec.codigo !== filtroSecDistribuicao) continue;
      for (const dep of sec.departamentos) {
        for (const s of dep.servidores) {
          if (buscaDistribuicao) {
            const q = buscaDistribuicao.toLowerCase();
            const bate =
              s.nome_completo.toLowerCase().includes(q) ||
              s.matricula.toLowerCase().includes(q) ||
              s.cargo_efetivo.toLowerCase().includes(q);
            if (!bate) continue;
          }
          linhas.push({
            servidorId: s.id,
            matricula: s.matricula,
            nome: s.nome_completo,
            cargo: s.cargo_efetivo,
            secretaria: sec.nome,
            departamento: dep.nome,
            situacao: s.situacao_funcional,
            estagioProbatorio: Boolean(s.estagio_probatorio),
            estagioFase: s.estagio_fase_atual ?? null,
          });
        }
      }
    }
    return linhas;
  }, [dadosDistribuicao, buscaDistribuicao, filtroSecDistribuicao]);

  const columnsDistribuicao = useMemo<ColumnDef<LinhaDistribuicao>[]>(
    () => [
      {
        accessorKey: 'matricula',
        header: 'Matrícula',
        size: 100,
        cell: ({ row }) => <span className="font-mono font-bold text-primary text-xs tabular-nums">{row.original.matricula}</span>,
      },
      {
        accessorKey: 'nome',
        header: 'Servidor',
        cell: ({ row }) => <span className="text-xs font-medium text-foreground">{row.original.nome}</span>,
      },
      {
        accessorKey: 'cargo',
        header: 'Cargo',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.cargo}</span>,
      },
      {
        accessorKey: 'secretaria',
        header: 'Secretaria',
        cell: ({ row }) => <Badge variant="outline" className="text-[10px] font-mono">{row.original.secretaria}</Badge>,
      },
      {
        accessorKey: 'departamento',
        header: 'Departamento',
        cell: ({ row }) => <span className="text-xs text-foreground">{row.original.departamento}</span>,
      },
      {
        accessorKey: 'situacao',
        header: 'Situação',
        cell: ({ row }) =>
          row.original.estagioProbatorio ? (
            <Badge variant="outline" className="text-[9px] font-mono text-amber-500 border-amber-500/30">
              Estágio ({row.original.estagioFase ? `${row.original.estagioFase}ª Fase` : 'Ativo'})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/30">
              Estável
            </Badge>
          ),
      },
    ],
    [],
  );

  // Colunas TanStack para a Exportação Folha de Pagamento
  const columnsFolha = useMemo<ColumnDef<RankingDesempateItem>[]>(
    () => [
      {
        accessorKey: 'matricula',
        header: 'Matrícula',
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">{row.original.matricula}</span>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Servidor',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.nome}</span>
        ),
      },
      {
        accessorKey: 'nfc',
        header: 'NFC Trienal',
        size: 110,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">{row.original.nfc}</span>
        ),
      },
      {
        accessorKey: 'salario_atual',
        header: 'Salário Atual',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            R$ {((row.original.salario_atual_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'reajuste',
        header: 'Evolução (+10%)',
        size: 150,
        cell: ({ row }) => (
          row.original.elegivel ? (
            <Badge variant="default" className="text-[10px] font-mono bg-emerald-600 text-white">
              +10% (Art. 17)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono text-rose-500 border-rose-300">
              Retido (PMD)
            </Badge>
          )
        ),
      },
      {
        accessorKey: 'salario_projetado',
        header: 'Salário com Reajuste',
        size: 160,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {row.original.elegivel
              ? `R$ ${((row.original.salario_projetado_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'R$ -'}
          </span>
        ),
      },
    ],
    []
  );

  // Handler de exportação CSV para Folha
  const handleExportarCsvFolha = () => {
    const cabecalho = 'matricula;nome;cargo;lotacao;nfc;dias_servico;idade;conceito;elegivel;salario_atual;reajuste_percentual;salario_projetado\n';
    const linhas = rankingDesempate.map((r) => {
      const salAtual = ((r.salario_atual_cents || 0) / 100).toFixed(2).replace('.', ',');
      const salProj = r.elegivel
        ? ((r.salario_projetado_cents || 0) / 100).toFixed(2).replace('.', ',')
        : '0,00';
      return `${r.matricula};"${r.nome}";"${r.cargo}";"${r.secretaria}";${r.nfc};${r.dias_servico};${r.idade_anos};"${r.conceito}";${r.elegivel ? 'SIM' : 'NAO'};${salAtual};${r.elegivel ? '10%' : '0%'};${salProj}`;
    }).join('\n');

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `impacto-folha-capd-ciclo-${cicloId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const subTabItems: TabsItem<RhSubTab>[] = [
    { key: 'analytics', label: 'Dashboard Analítico & BI', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'distribuicao', label: 'Distribuição por Pasta & Departamento', icon: <Building2 className="h-4 w-4" />, badge: 5 },
    { key: 'servidores', label: 'Quadro de Servidores', icon: <Users className="h-4 w-4" />, badge: servidores.length },
    { key: 'estagio', label: 'Estágio Probatório', icon: <Calendar className="h-4 w-4" />, badge: servidores.filter((s) => Boolean(s.estagio_probatorio)).length },
    { key: 'painel-gerencial', label: 'Painel Gerencial (DRH)', icon: <Activity className="h-4 w-4" /> },
    { key: 'ranking-desempate', label: 'Classificação Oficial & Desempate Art. 39', icon: <Award className="h-4 w-4" /> },
    { key: 'folha-export', label: 'Exportação Folha de Pagamento', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { key: 'hierarquia', label: 'Configuração de Hierarquia', icon: <Network className="h-4 w-4" /> },
    { key: 'pendencias-hierarquia', label: 'Pendências de Hierarquia', icon: <AlertTriangle className="h-4 w-4" /> },
    { key: 'pmd', label: 'Acompanhamento PMD', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'integracao', label: 'Integrações RH & Embed', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        title="Portal de RH e Secretaria Municipal de Gestão de Pessoas"
        subtitle="Inteligência de dados com Recharts, controle de prazos regimentais, desempate Art. 39 e integração de folha."
        badge="SMGP / Universal RH"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {portalSelector}
            <Button size="sm" variant="outline" onClick={handleExportarCsvFolha}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar para ERP de Folha (CSV)
            </Button>
          </div>
        }
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── CONTAGEM REGRESSIVA EM TEMPO REAL ─────────────────────────── */}
      <CountdownWidget />

      {/* ── SUB-ABA 1: DASHBOARD ANALÍTICO & BI COM RECHARTS ─────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {avaliacoesConcluidas.length === 0 ? (
            <EmptyState
              title="Sem avaliações concluídas neste ciclo"
              description="Os gráficos aparecem assim que houver ao menos uma avaliação concluída no ciclo selecionado. Troque o ciclo ou aguarde as chefias concluírem as avaliações."
              icon={<BarChart3 className="h-8 w-8" />}
            />
          ) : (
            <>
              {/* GRÁFICOS 1 & 2: DISPERSÃO E CLUSTERS POR PASTA */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico 1: ScatterChart (Dispersão das Notas x Tempo de Serviço) */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Dispersão das Notas vs Tempo de Serviço (Dias)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Corte de elegibilidade (NFD, mesmo critério de `elegivel_progressao`).</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Corte: {CORTE_NFD.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          type="number"
                          dataKey="dias_servico"
                          name="Dias de Serviço"
                          tick={{ fontSize: 10 }}
                          unit=" d"
                        />
                        <YAxis
                          type="number"
                          dataKey="nfd"
                          name="Nota NFD"
                          domain={[0, 10]}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(val: any, name: any) => [
                            String(name) === 'Nota NFD' ? `${val}` : `${val} dias`,
                            String(name),
                          ]}
                        />
                        <Scatter name="Servidores Avaliados" data={scatterData} fill="#6366f1" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Gráfico 2: Stacked Bar Chart (Clusters por Secretaria) */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-500" />
                        Clusters de Desempenho por Pasta Governamental
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Distribuição: Excelente, Bom, Regular e Risco (PMD).</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {stackedBarData.length} {stackedBarData.length === 1 ? 'Secretaria' : 'Secretarias'}
                    </Badge>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedBarData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="orgao" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="excelente" name="Excelente" stackId="a" fill="#10b981" onClick={(d: any) => setSecretariaSelecionada(d.orgao)} cursor="pointer" />
                        <Bar dataKey="bom" name="Bom" stackId="a" fill="#6366f1" onClick={(d: any) => setSecretariaSelecionada(d.orgao)} cursor="pointer" />
                        <Bar dataKey="regular" name="Regular" stackId="a" fill="#f59e0b" onClick={(d: any) => setSecretariaSelecionada(d.orgao)} cursor="pointer" />
                        <Bar dataKey="risco" name="Risco (PMD)" stackId="a" fill="#ef4444" onClick={(d: any) => setSecretariaSelecionada(d.orgao)} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* GRÁFICOS 3 & 4: COMPOSED CHART E PIE CHART */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico 3: ComposedChart (Média por Pasta vs Linha de Corte) */}
                <Card className="p-4 space-y-3 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-500" />
                        Média de Notas por Secretaria vs Corte de Elegibilidade
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Clique numa barra para detalhar por departamento.</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${composedData.every((d) => d.media >= CORTE_NFD) ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}
                    >
                      {composedData.every((d) => d.media >= CORTE_NFD) ? 'Todas Acima do Corte' : 'Secretaria(s) Abaixo do Corte'}
                    </Badge>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={composedData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="orgao" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="media" name="Média da Pasta" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={(d: any) => setSecretariaSelecionada(d.orgao)} cursor="pointer" />
                        <Line type="monotone" dataKey="corte" name={`Corte Mínimo (${CORTE_NFD.toFixed(2)})`} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Gráfico 4: Donut / PieChart dos Conceitos */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <PieIcon className="h-4 w-4 text-purple-500" />
                        Proporção Geral de Conceitos
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{ciclos.find((c) => c.id === cicloId)?.nome || 'Ciclo selecionado'}.</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* GRÁFICO 5: EVOLUÇÃO ENTRE CICLOS */}
              <Card className="p-4 space-y-3">
                <div className="border-b border-border pb-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Evolução de Desempenho Entre Ciclos
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Média de nota (NFD) e taxa de conclusão em todos os ciclos avaliativos do tenant.</p>
                </div>

                {evolucaoCiclos.length === 0 ? (
                  <EmptyState
                    title="Sem histórico de ciclos"
                    description="A evolução aparece quando o tenant tiver mais de um ciclo avaliativo com avaliações concluídas."
                    icon={<TrendingUp className="h-8 w-8" />}
                  />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucaoCiclos} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="ano_referencia" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="nota" domain={[0, 10]} tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="taxa" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line yAxisId="nota" type="monotone" dataKey="media_nota" name="Média de Nota (NFD)" stroke="#3b82f6" strokeWidth={2} />
                        <Line yAxisId="taxa" type="monotone" dataKey="taxa_conclusao" name="Taxa de Conclusão (%)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* RANKING DE SECRETARIAS + DRILL-DOWN POR DEPARTAMENTO */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4 space-y-3">
                  <div className="border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      Ranking de Secretarias por Desempenho
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Clique numa secretaria para ver o detalhamento por departamento.</p>
                  </div>
                  <div className="space-y-1.5">
                    {rankingSecretarias.map((item, idx) => {
                      const isMelhor = idx === 0;
                      const isMaisPertoDoCorte = item === [...rankingSecretarias].sort(
                        (a, b) => Math.abs(a.media - CORTE_NFD) - Math.abs(b.media - CORTE_NFD),
                      )[0];
                      return (
                        <button
                          key={item.orgao}
                          type="button"
                          onClick={() => setSecretariaSelecionada(item.orgao)}
                          className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40 ${secretariaSelecionada === item.orgao ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <span className="font-mono tabular-nums text-muted-foreground">{idx + 1}º</span>
                            {item.orgao}
                            {isMelhor && <Badge variant="success">Melhor Desempenho</Badge>}
                            {isMaisPertoDoCorte && !isMelhor && <Badge variant="warning">Mais Próxima do Corte</Badge>}
                          </span>
                          <span className="font-mono tabular-nums text-foreground">{item.media.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-cyan-500" />
                        Drill-Down por Departamento
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{secretariaSelecionada || 'Selecione uma secretaria no ranking ou nos gráficos acima.'}</p>
                    </div>
                    {secretariaSelecionada && (
                      <Button size="sm" variant="ghost" onClick={() => setSecretariaSelecionada(null)}>Limpar</Button>
                    )}
                  </div>
                  {!secretariaSelecionada ? (
                    <EmptyState
                      title="Nenhuma secretaria selecionada"
                      description="Selecione uma secretaria para ver a média de desempenho por departamento."
                      icon={<Building2 className="h-8 w-8" />}
                    />
                  ) : departamentoDrillDown.length === 0 ? (
                    <EmptyState
                      title="Sem departamentos identificados"
                      description="Os servidores desta secretaria não têm lotação física registrada."
                      icon={<Building2 className="h-8 w-8" />}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {departamentoDrillDown.map((depto) => (
                        <div key={depto.departamento} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                          <span className="font-medium text-foreground">{depto.departamento}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-muted-foreground">{depto.servidores} serv.</span>
                            <span className="font-mono tabular-nums text-foreground">{depto.media.toFixed(2)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* DESTAQUE DE DESEMPENHO INDIVIDUAL (TOP/BOTTOM) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4 space-y-3">
                  <div className="border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-500" />
                      Melhores Notas do Ciclo
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {destaqueIndividual.top.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => { setAvaliacaoEmFocoId(av.id); setModalEspelhoOpen(true); }}
                        className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted/40"
                      >
                        <span className="text-foreground">
                          {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                          <span className="text-muted-foreground"> — {av.servidor?.orgao_lotacao || 'Geral'}</span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-emerald-500">{parseFloat(String(av.nota_final)).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Piores Notas do Ciclo
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {destaqueIndividual.bottom.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => { setAvaliacaoEmFocoId(av.id); setModalEspelhoOpen(true); }}
                        className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted/40"
                      >
                        <span className="text-foreground">
                          {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                          <span className="text-muted-foreground"> — {av.servidor?.orgao_lotacao || 'Geral'}</span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-red-500">{parseFloat(String(av.nota_final)).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SUB-ABA: DISTRIBUIÇÃO INSTITUCIONAL POR PASTA & DEPARTAMENTO ── */}
      {activeTab === 'distribuicao' && (
        <div className="space-y-6">
          {orgTreeErro === 'sem_permissao' ? (
            <EmptyState
              title="Sem permissão para ver o organograma"
              description="Esta aba precisa da permissão org.view (ou papel responsável/membro) para exibir a estrutura organizacional real do tenant. Solicite a um administrador."
              icon={<Shield className="h-8 w-8" />}
            />
          ) : !loading && secretariasOrg.length === 0 ? (
            <EmptyState
              title="Nenhuma secretaria cadastrada no organograma"
              description="Cadastre a estrutura organizacional (secretarias e departamentos) no módulo Organograma para que esta aba exiba a distribuição real de servidores."
              icon={<Building2 className="h-8 w-8" />}
            />
          ) : (
            <>
              {/* CARDS KPI DE COBERTURA INSTITUCIONAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Secretarias" value={kpisDistribuicao.totalSecretarias} caption="Pastas municipais ativas" />

                <StatCard
                  label="Departamentos"
                  value={kpisDistribuicao.totalDepartamentos}
                  caption={`${kpisDistribuicao.totalSecretarias > 0 ? (kpisDistribuicao.totalDepartamentos / kpisDistribuicao.totalSecretarias).toFixed(1) : '0'} por secretaria (média)`}
                  accentClassName="border-l-blue-500"
                />

                <StatCard
                  label="Chefias Nomeadas"
                  value={kpisDistribuicao.totalChefias}
                  caption="Responsáveis de secretaria + departamento"
                  accentClassName="border-l-amber-500"
                />

                <StatCard
                  label="Servidores Lotados"
                  value={kpisDistribuicao.totalServidoresCarregados}
                  caption="Total carregado neste ciclo"
                  accentClassName="border-l-emerald-500"
                />

                <StatCard
                  label="Vínculos no Órgão"
                  value={`${kpisDistribuicao.totalClassificados} / ${kpisDistribuicao.totalServidoresCarregados}`}
                  caption={
                    kpisDistribuicao.totalNaoClassificados > 0
                      ? `${kpisDistribuicao.totalNaoClassificados} não classificado(s)`
                      : '100% classificados'
                  }
                  accentClassName="border-l-emerald-500"
                  valueClassName="text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* BARRA DE FILTROS E BUSCA */}
              <Card className="p-4 bg-muted/20 border-border">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">Filtrar por Pasta:</span>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant={filtroSecDistribuicao === 'todas' ? 'default' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => setFiltroSecDistribuicao('todas')}
                      >
                        Todas ({dadosDistribuicao.length})
                      </Button>
                      {dadosDistribuicao.map((s) => (
                        <Button
                          key={s.codigo}
                          size="sm"
                          variant={filtroSecDistribuicao === s.codigo ? 'default' : 'outline'}
                          className="h-7 text-xs font-mono"
                          onClick={() => setFiltroSecDistribuicao(s.codigo)}
                        >
                          {s.sigla || s.nome}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-72">
                      <SearchInput
                        value={buscaDistribuicao}
                        onChange={(val) => setBuscaDistribuicao(val)}
                        placeholder="Buscar servidor, cargo ou matrícula..."
                      />
                    </div>
                    <div className="flex rounded-md border border-border overflow-hidden shrink-0">
                      <Button
                        size="sm"
                        variant={visualizacaoDistribuicao === 'tabela' ? 'default' : 'ghost'}
                        className="h-7 text-xs rounded-none"
                        onClick={() => setVisualizacaoDistribuicao('tabela')}
                      >
                        Tabela
                      </Button>
                      <Button
                        size="sm"
                        variant={visualizacaoDistribuicao === 'cards' ? 'default' : 'ghost'}
                        className="h-7 text-xs rounded-none"
                        onClick={() => setVisualizacaoDistribuicao('cards')}
                      >
                        Cards
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* VISUALIZAÇÃO EM TABELA (padrão) */}
              {visualizacaoDistribuicao === 'tabela' && (
                <Card className="gap-0 py-0">
                  <div className="p-3">
                    <DataTable
                      columns={columnsDistribuicao}
                      data={linhasDistribuicao}
                      loading={loading}
                      emptyText="Nenhum servidor encontrado."
                      pageSize={15}
                      pageSizeSelector
                      exportable
                      exportFileName="distribuicao-por-pasta-departamento"
                      exportTitle="Distribuição por Pasta & Departamento"
                    />
                  </div>
                </Card>
              )}

              {/* ESTRUTURA VISUAL DAS SECRETARIAS E SEUS DEPARTAMENTOS */}
              {visualizacaoDistribuicao === 'cards' && (
              <div className="space-y-6">
                {dadosDistribuicao
                  .filter((sec) => filtroSecDistribuicao === 'todas' || sec.codigo === filtroSecDistribuicao)
                  .map((sec) => {
                    const isNaoClassificados = sec.codigo === SEM_UNIDADE_CODIGO;
                    return (
                      <Card key={sec.codigo} className="border-border overflow-hidden">
                        {/* CABEÇALHO DA SECRETARIA */}
                        <div className="p-4 bg-muted/40 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs font-bold ${isNaoClassificados ? 'border-amber-500/40 bg-amber-500/5 text-amber-500' : 'border-primary/40 bg-primary/5 text-primary'}`}
                              >
                                {sec.sigla || sec.nome}
                              </Badge>
                              <h3 className="text-sm font-bold text-foreground">{sec.nome}</h3>
                            </div>
                            {!isNaoClassificados && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Shield className="h-3.5 w-3.5 text-primary" />
                                <span>
                                  Titular da Pasta:{' '}
                                  <strong className="text-foreground">{sec.responsavel?.name || 'Não definido'}</strong>
                                </span>
                                {sec.responsavel?.email && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[11px]">{sec.responsavel.email}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {sec.departamentos.length} {sec.departamentos.length === 1 ? 'Departamento' : 'Departamentos'}
                            </Badge>
                            <Badge variant="default" className="text-[11px] font-mono bg-primary text-primary-foreground">
                              {sec.totalServidores} Servidores Operacionais
                            </Badge>
                          </div>
                        </div>

                        {/* GRID DE DEPARTAMENTOS */}
                        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {sec.departamentos.map((dep) => {
                            const servidoresFiltrados = dep.servidores.filter((s) => {
                              if (!buscaDistribuicao) return true;
                              const q = buscaDistribuicao.toLowerCase();
                              return (
                                s.nome_completo.toLowerCase().includes(q) ||
                                s.matricula.toLowerCase().includes(q) ||
                                s.cargo_efetivo.toLowerCase().includes(q)
                              );
                            });

                            return (
                              <div
                                key={dep.codigo}
                                className="rounded-lg border border-border bg-card/60 p-4 space-y-3 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  {/* TOPO DO DEPARTAMENTO */}
                                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[11px] font-bold text-primary">
                                          [{dep.codigo}]
                                        </span>
                                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                                          {dep.nome}
                                        </h4>
                                      </div>
                                      {!isNaoClassificados && (
                                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <span>
                                            Diretor(a):{' '}
                                            <strong className="text-foreground">{dep.responsavel?.name || 'Não definido'}</strong>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                      {dep.servidores.length} servidores
                                    </Badge>
                                  </div>

                                  {/* LISTA DE SERVIDORES ALOCADOS NO DEPARTAMENTO */}
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                                      Equipe Operacional Vinculada:
                                    </span>
                                    {servidoresFiltrados.length === 0 ? (
                                      <div className="text-xs text-muted-foreground italic py-2">
                                        {buscaDistribuicao ? 'Nenhum servidor corresponde à busca.' : 'Nenhum servidor alocado.'}
                                      </div>
                                    ) : (
                                      servidoresFiltrados.map((s) => (
                                        <div
                                          key={s.id}
                                          className="p-2 rounded bg-muted/30 border border-border/40 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors"
                                        >
                                          <div className="space-y-0.5 min-w-0 pr-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono font-bold text-primary text-[11px] tabular-nums">
                                                {s.matricula}
                                              </span>
                                              <span className="font-medium text-foreground text-xs truncate">
                                                {s.nome_completo}
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                              {s.cargo_efetivo} • Estatutário (RPPS)
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {s.estagio_probatorio ? (
                                              <Badge variant="outline" className="text-[9px] font-mono text-amber-500 border-amber-500/30">
                                                Estágio ({s.estagio_fase_atual ? `${s.estagio_fase_atual}ª Fase` : 'Ativo'})
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/30">
                                                Estável
                                              </Badge>
                                            )}
                                            <Badge variant="secondary" className="text-[9px] font-mono">
                                              Vínculo Ativo
                                            </Badge>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* RODAPÉ DO DEPARTAMENTO */}
                                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                  <span>Vínculo: org_unit_user (membro)</span>
                                  <span>Lotação: 100% regular</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
              </div>
              )}

              {/* TABELA MATRIZ CONSOLIDADA DE OCUPAÇÃO INSTITUCIONAL */}
              <Card className="p-4 space-y-3 border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Matriz Consolidada de Distribuição por Pasta e Departamento
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Quadro de lotação institucional de servidores e chefias conforme Decreto e Lei nº 1.704/2006.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                    Total: {kpisDistribuicao.totalServidoresCarregados} Servidores + {kpisDistribuicao.totalChefias} Chefias
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-mono border-y border-border">
                      <tr>
                        <th className="py-2.5 px-3">Secretaria (Pasta)</th>
                        <th className="py-2.5 px-3">Departamento</th>
                        <th className="py-2.5 px-3">Diretor(a) Responsável</th>
                        <th className="py-2.5 px-3 text-center">Servidores</th>
                        <th className="py-2.5 px-3 text-center">Estágio Probatório</th>
                        <th className="py-2.5 px-3 text-center">Estáveis</th>
                        <th className="py-2.5 px-3 text-right">Status do Quadro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {dadosDistribuicao.flatMap((sec) =>
                        sec.departamentos.map((dep, idx) => (
                          <tr key={dep.codigo} className="hover:bg-muted/20 transition-colors">
                            {idx === 0 ? (
                              <td
                                rowSpan={sec.departamentos.length}
                                className="py-2.5 px-3 font-semibold text-foreground align-top border-r border-border font-sans"
                              >
                                <div className="font-bold text-xs">{sec.sigla || sec.nome}</div>
                                <div className="text-[11px] text-muted-foreground">{sec.nome}</div>
                                <div className="text-[10px] text-primary mt-1 font-mono">
                                  Secretário: {sec.responsavel?.name || 'Não definido'}
                                </div>
                              </td>
                            ) : null}
                            <td className="py-2.5 px-3 text-foreground font-sans">
                              <div className="font-semibold text-xs">{dep.nome}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{dep.codigo}</div>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground font-sans">
                              <div>{dep.responsavel?.name || 'Não definido'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-foreground tabular-nums">
                              {dep.servidores.length}
                            </td>
                            <td className="py-2.5 px-3 text-center text-amber-500 tabular-nums">
                              {dep.totalEstagio}
                            </td>
                            <td className="py-2.5 px-3 text-center text-emerald-500 tabular-nums">
                              {dep.totalEstaveis}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Quadro Completo
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── SUB-ABA 2: CLASSIFICAÇÃO OFICIAL E DESEMPATE ART. 39 ──────── */}
      {activeTab === 'ranking-desempate' && (
        <div className="space-y-4">
          <Card className="p-4 border-primary/20 bg-accent/20">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Regramento de Desempate Conforme Art. 39 da Lei nº 1.704/2006
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Em caso de igualdade de pontos na Nota Final Consolidada (NFC), a classificação obedece estritamente a seguinte ordem:
                  <strong className="text-foreground"> 1º Maior pontuação na NFC</strong>,
                  <strong className="text-foreground"> 2º Maior tempo de serviço público efetivo em Araucária</strong>,
                  <strong className="text-foreground"> 3º Maior idade civil</strong>.
                </p>
              </div>
            </div>
          </Card>

          <Card className="gap-0 py-0">
            <div className="p-3">
              <DataTable
                columns={columnsDesempate}
                data={rankingDesempate}
                loading={loading}
                emptyText="Nenhum servidor no ranking."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="classificacao-oficial-desempate-art39"
                exportTitle="CAPD — Relatório Oficial de Classificação e Desempate"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 3: EXPORTAÇÃO PARA FOLHA DE PAGAMENTO ────────────── */}
      {activeTab === 'folha-export' && (
        <div className="space-y-4">
          <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Impacto Financeiro e Concessão da Evolução Funcional (+10% / Quinquênio)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Servidores com NFC ≥ 70,00 pts são homologados para recebimento do acréscimo salarial de 10% (Art. 17).
                    O arquivo gerado é compatível com os conectores ERP Betha, IPM, Governa e CECAM.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleExportarCsvFolha} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-4 w-4 mr-1.5" />
                Baixar Arquivo para Folha (.CSV)
              </Button>
            </div>
          </Card>

          <Card className="gap-0 py-0">
            <div className="p-3">
              <DataTable
                columns={columnsFolha}
                data={rankingDesempate}
                loading={loading}
                emptyText="Nenhum dado financeiro para exportação."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="impacto-financeiro-folha-capd"
                exportTitle="CAPD — Impacto Financeiro da Evolução Funcional"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 4: QUADRO DE SERVIDORES (RH UNIVERSAL) ───────────── */}
      {activeTab === 'servidores' && (
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Quadro Geral de Servidores Públicos</h3>
              <p className="text-xs text-muted-foreground">
                Gestão cadastral centralizada com lotação física, órgão por secretaria e departamento.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Total cadastrado: <strong className="text-foreground">{servidores.length}</strong>
            </div>
          </div>
          <DataTable
            columns={columnsServidoresGeral}
            data={servidores}
            loading={loading}
            emptyText="Nenhum servidor listado."
            searchable
            searchPlaceholder="Filtrar por matrícula, nome, CPF, cargo, secretaria..."
            pageSize={10}
            pageSizeSelector
            fixedLayout
            exportable
            exportFileName="servidores-rh"
            exportTitle="CAPD — Quadro Geral de Servidores"
            onRowClick={(row) => setServidorDetalheId(row.id)}
          />
        </Card>
      )}

      {/* ── SUB-ABA 5: ESTÁGIO PROBATÓRIO (CF ART. 41) ───────────────── */}
      {activeTab === 'estagio' && (
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Acompanhamento do Estágio Probatório</h3>
              <p className="text-xs text-muted-foreground">
                Servidores em ciclo de 36 meses com avaliações periódicas para aquisição de estabilidade.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Em estágio: <strong className="text-foreground">{servidores.filter((s) => Boolean(s.estagio_probatorio)).length}</strong>
            </div>
          </div>
          <DataTable
            columns={columnsServidoresGeral}
            data={servidores.filter((s) => Boolean(s.estagio_probatorio))}
            loading={loading}
            emptyText="Nenhum servidor em estágio probatório."
            searchable
            searchPlaceholder="Filtrar servidores em estágio..."
            pageSize={10}
            pageSizeSelector
            fixedLayout
            exportable
            exportFileName="estagio-probatorio-rh"
            exportTitle="CAPD — Estágio Probatório"
          />
        </Card>
      )}

      {/* ── SUB-ABA 6: PAINEL GERENCIAL DO DRH ───────────────────────── */}
      {activeTab === 'painel-gerencial' && <PainelGerencialPanel cicloId={cicloId} />}

      {/* ── SUB-ABA 7: CONFIGURAÇÃO DE HIERARQUIA ────────────────────── */}
      {activeTab === 'hierarquia' && <HierarquiaConfigPanel />}

      {/* ── SUB-ABA 8: PENDÊNCIAS DE HIERARQUIA ──────────────────────── */}
      {activeTab === 'pendencias-hierarquia' && <PendenciasHierarquiaPanel />}

      {/* ── SUB-ABA 9: PLANOS DE MELHORIA (PMD) ──────────────────────── */}
      {activeTab === 'pmd' && (
        <div className="space-y-4 p-1">
          <PmdPanel />
        </div>
      )}

      {/* ── SUB-ABA 10: INTEGRAÇÕES ERP E INJEÇÃO EMBED ───────────────── */}
      {activeTab === 'integracao' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Gateway de Integrações de RH & Embed</h3>
              <p className="text-xs text-muted-foreground">Sincronização com sistemas legados (Betha, IPM, Governa) e tokens de injeção headless.</p>
            </div>
          </div>
          <div className="p-3 bg-muted/40 rounded border border-border text-xs space-y-2">
            <div className="font-semibold text-foreground">Conectores REST / Webhook Ativos</div>
            <p className="text-muted-foreground">
              Comunicação bidirecional para importação automática de lotações funcionais e exportação de homologações da cadência trienal.
            </p>
          </div>
        </Card>
      )}

      {/* ── Modal: Painel de Detalhe do Servidor (Quadro Geral) ─────────── */}
      <Modal
        open={servidorDetalheId != null}
        onClose={() => setServidorDetalheId(null)}
        title={servidorDetalhe?.nome_completo || 'Detalhe do Servidor'}
        icon={<UserCircle className="h-5 w-5" />}
        size="lg"
      >
        {servidorDetalhe && (
          <div className="space-y-5 p-1">
            {/* DADOS CADASTRAIS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Dados Cadastrais</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Matrícula: </span><span className="font-mono font-bold text-primary">{servidorDetalhe.matricula}</span></div>
                <div><span className="text-muted-foreground">CPF: </span><span className="font-mono">{servidorDetalhe.cpf}</span></div>
                <div><span className="text-muted-foreground">Cargo: </span><span className="text-foreground">{servidorDetalhe.cargo_efetivo}</span></div>
                <div><span className="text-muted-foreground">Situação: </span><span className="text-foreground">{servidorDetalhe.situacao_funcional}</span></div>
                <div>
                  <span className="text-muted-foreground">Secretaria: </span>
                  <span className="text-foreground">{classificacaoPorServidor.get(servidorDetalhe.id)?.secretaria || 'Não Classificado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Departamento: </span>
                  <span className="text-foreground">{classificacaoPorServidor.get(servidorDetalhe.id)?.departamento || '—'}</span>
                </div>
                {servidorDetalhe.data_admissao && (
                  <div><span className="text-muted-foreground">Admissão: </span><span className="font-mono">{servidorDetalhe.data_admissao}</span></div>
                )}
              </div>
            </div>

            {/* HISTÓRICO DE AVALIAÇÕES */}
            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Histórico de Avaliações (todos os ciclos)</h4>
              {detalheLoading ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : detalheAvaliacoes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma avaliação registrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {detalheAvaliacoes.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setAvaliacaoEmFocoId(av.id);
                        setModalEspelhoOpen(true);
                      }}
                      className="w-full flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs hover:bg-muted/40 text-left"
                    >
                      <span className="text-foreground">{av.ciclo?.nome || `Ciclo #${av.ciclo_id}`}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono tabular-nums text-foreground">{av.nota_final ?? '—'}</span>
                        <Badge variant={av.elegivel_progressao ? 'success' : 'outline'} className="text-[10px]">
                          {av.elegivel_progressao ? 'Elegível' : 'Não elegível'}
                        </Badge>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* QUINQUÊNIOS */}
            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Quinquênios</h4>
              {detalheLoading ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : !detalheQuinquenios || detalheQuinquenios.quinquenios.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum quinquênio registrado.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Total: {detalheQuinquenios.total} — {detalheQuinquenios.percentual_total}% de gratificação
                  </p>
                  {detalheQuinquenios.quinquenios.map((q) => (
                    <div key={q.id} className="flex items-center justify-between text-xs px-3 py-1 rounded bg-muted/30">
                      <span className="font-mono">{q.data_quinquenio}</span>
                      <span className="font-mono text-emerald-500">+{q.percentual}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AFASTAMENTOS */}
            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Afastamentos</h4>
              {!servidorDetalhe.afastamentos || servidorDetalhe.afastamentos.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum afastamento registrado.</p>
              ) : (
                <div className="space-y-1">
                  {servidorDetalhe.afastamentos.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs px-3 py-1 rounded bg-muted/30">
                      <span className="text-foreground">{a.tipo_afastamento}</span>
                      <span className="font-mono text-muted-foreground">{a.data_inicio} — {a.data_fim || 'em andamento'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Visualização do Espelho da Avaliação ────────────────── */}
      <EspelhoAvaliacaoModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalEspelhoOpen}
        onClose={() => setModalEspelhoOpen(false)}
      />
    </div>
  );
};
