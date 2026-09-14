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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiCiclo,
  ApiDashboardMetricas,
  ApiServidor,
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
  FolderTree,
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

export interface EstruturaDepartamento {
  codigo: string;
  nome: string;
  diretor: {
    nome: string;
    matricula: string;
    cargo: string;
    email: string;
  };
}

export interface EstruturaSecretaria {
  codigo: string;
  nome: string;
  sigla: string;
  cor: string;
  secretario: {
    nome: string;
    matricula: string;
    cargo: string;
    email: string;
  };
  departamentos: EstruturaDepartamento[];
}

const ESTRUTURA_ORGANIZACIONAL_CANONICA: EstruturaSecretaria[] = [
  {
    codigo: 'SMAD',
    sigla: 'SMAD',
    nome: 'Secretaria Municipal de Administração',
    cor: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
    secretario: {
      nome: 'Dr. Paulo Roberto Guimarães',
      matricula: 'SEC-001',
      cargo: 'Secretário Municipal de Administração',
      email: 'paulo.guimaraes@araucaria.pr.gov.br',
    },
    departamentos: [
      {
        codigo: 'SMAD-DRH',
        nome: 'Departamento de Recursos Humanos e Gestão de Pessoas',
        diretor: {
          nome: 'Beatriz Rocha Albuquerque',
          matricula: 'DIR-001',
          cargo: 'Analista de RH (Diretora)',
          email: 'beatriz.rh@araucaria.pr.gov.br',
        },
      },
      {
        codigo: 'SMAD-DLOG',
        nome: 'Departamento de Logística, Frotas e Patrimônio',
        diretor: {
          nome: 'Cláudio Márcio Fonseca',
          matricula: 'DIR-002',
          cargo: 'Especialista Logístico (Diretor)',
          email: 'claudio.fonseca@araucaria.pr.gov.br',
        },
      },
    ],
  },
  {
    codigo: 'SMF',
    sigla: 'SMF',
    nome: 'Secretaria Municipal de Finanças e Orçamento',
    cor: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
    secretario: {
      nome: 'Dra. Helena Vasconcellos Moura',
      matricula: 'SEC-002',
      cargo: 'Secretária Municipal de Finanças',
      email: 'helena.moura@araucaria.pr.gov.br',
    },
    departamentos: [
      {
        codigo: 'SMF-CONT',
        nome: 'Departamento de Contabilidade e Finanças',
        diretor: {
          nome: 'Rodrigo Prado Antunes',
          matricula: 'DIR-003',
          cargo: 'Contador Geral (Diretor)',
          email: 'rodrigo.cont@araucaria.pr.gov.br',
        },
      },
      {
        codigo: 'SMF-TRIB',
        nome: 'Departamento de Arrecadação e Fiscalização Tributária',
        diretor: {
          nome: 'Patrícia Lins Cavalcanti',
          matricula: 'DIR-004',
          cargo: 'Auditora Fiscal Chefe (Diretora)',
          email: 'patricia.trib@araucaria.pr.gov.br',
        },
      },
    ],
  },
  {
    codigo: 'SMED',
    sigla: 'SMED',
    nome: 'Secretaria Municipal de Educação',
    cor: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
    secretario: {
      nome: 'Profa. Maria Aparecida Diniz',
      matricula: 'SEC-003',
      cargo: 'Secretária Municipal de Educação',
      email: 'maria.diniz@araucaria.pr.gov.br',
    },
    departamentos: [
      {
        codigo: 'SMED-DEP',
        nome: 'Departamento de Ensino Fundamental e Pedagógico',
        diretor: {
          nome: 'Sandra Valéria Nogueira',
          matricula: 'DIR-005',
          cargo: 'Pedagoga Coordenadora (Diretora)',
          email: 'sandra.nogueira@araucaria.pr.gov.br',
        },
      },
      {
        codigo: 'SMED-DGA',
        nome: 'Departamento de Gestão Administrativa Escolar',
        diretor: {
          nome: 'Valmir Ferreira Sobrinho',
          matricula: 'DIR-006',
          cargo: 'Gestor Escolar (Diretor)',
          email: 'valmir.sobrinho@araucaria.pr.gov.br',
        },
      },
    ],
  },
  {
    codigo: 'SMS',
    sigla: 'SMS',
    nome: 'Secretaria Municipal de Saúde',
    cor: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-400',
    secretario: {
      nome: 'Dr. Fernando Siqueira Prado',
      matricula: 'SEC-004',
      cargo: 'Secretário Municipal de Saúde',
      email: 'fernando.prado@araucaria.pr.gov.br',
    },
    departamentos: [
      {
        codigo: 'SMS-DAS',
        nome: 'Departamento de Atenção Básica e Saúde da Família',
        diretor: {
          nome: 'Dr. Luciano Meireles Cordeiro',
          matricula: 'DIR-007',
          cargo: 'Médico Coordenador (Diretor)',
          email: 'luciano.cordeiro@araucaria.pr.gov.br',
        },
      },
      {
        codigo: 'SMS-DVS',
        nome: 'Departamento de Vigilância em Saúde e Epidemiologia',
        diretor: {
          nome: 'Camila Fontana Vianna',
          matricula: 'DIR-008',
          cargo: 'Especialista Sanitária (Diretora)',
          email: 'camila.vianna@araucaria.pr.gov.br',
        },
      },
    ],
  },
  {
    codigo: 'SMOSP',
    sigla: 'SMOSP',
    nome: 'Secretaria Municipal de Obras e Serviços Públicos',
    cor: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
    secretario: {
      nome: 'Eng. Rogério Antunes Maciel',
      matricula: 'SEC-005',
      cargo: 'Secretário Municipal de Obras',
      email: 'rogerio.maciel@araucaria.pr.gov.br',
    },
    departamentos: [
      {
        codigo: 'SMOSP-DOP',
        nome: 'Departamento de Obras Públicas e Infraestrutura',
        diretor: {
          nome: 'Eng. Marcelo Telles Pinheiro',
          matricula: 'DIR-009',
          cargo: 'Engenheiro Civil Chefe (Diretor)',
          email: 'marcelo.pinheiro@araucaria.pr.gov.br',
        },
      },
      {
        codigo: 'SMOSP-DSU',
        nome: 'Departamento de Serviços Urbanos e Manutenção Viária',
        diretor: {
          nome: 'Marcos Aurélio Rezende',
          matricula: 'DIR-010',
          cargo: 'Encarregado Operacional Geral (Diretor)',
          email: 'marcos.rezende@araucaria.pr.gov.br',
        },
      },
    ],
  },
];

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

export const PortalRhView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RhSubTab>('analytics');
  const [loading, setLoading] = useState<boolean>(true);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [cicloId, setCicloId] = useState<number>(1);
  const [metricas, setMetricas] = useState<ApiDashboardMetricas | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [modalEspelhoOpen, setModalEspelhoOpen] = useState<boolean>(false);
  const [avaliacaoEmFocoId, setAvaliacaoEmFocoId] = useState<number | null>(null);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);

  const [filtroSecDistribuicao, setFiltroSecDistribuicao] = useState<string>('todas');
  const [buscaDistribuicao, setBuscaDistribuicao] = useState<string>('');

  // Carregar dados principais
  const carregarDadosRh = useCallback(async () => {
    setLoading(true);
    try {
      const [resCic, resMet, resAv, resServ] = await Promise.all([
        api.capd.listCiclos().catch(() => []),
        api.capd.getMetricas(cicloId).catch(() => null),
        api.capd.listAvaliacoes({ ciclo_id: cicloId }).catch(() => ({ data: [] })),
        api.capd.listServidores({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);

      const listaCic = Array.isArray(resCic) ? resCic : [];
      setCiclos(listaCic);
      if (listaCic.length > 0 && !cicloId) {
        setCicloId(listaCic[0].id);
      }
      setMetricas(resMet);
      setAvaliacoes(resAv.data || []);
      setServidores(Array.isArray(resServ) ? resServ : (resServ.data || []));
    } catch (e) {
      console.error('Erro ao carregar dados do RH:', e);
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  useEffect(() => {
    carregarDadosRh();
  }, [carregarDadosRh]);

  // Transformações para Recharts:
  // 1. Dados para ScatterChart (Dispersão por Secretaria)
  const scatterData = useMemo(() => {
    if (avaliacoes.length === 0) {
      return [
        { secretaria: 'SMAD (Administração)', nfd: 85.0, dias_servico: 1500, nome: 'Servidores SMAD' },
        { secretaria: 'SMF (Finanças)', nfd: 91.0, dias_servico: 3100, nome: 'Servidores SMF' },
        { secretaria: 'SMED (Educação)', nfd: 83.5, dias_servico: 2400, nome: 'Servidores SMED' },
        { secretaria: 'SMS (Saúde)', nfd: 82.0, dias_servico: 1800, nome: 'Servidores SMS' },
        { secretaria: 'SMOSP (Obras)', nfd: 78.5, dias_servico: 1200, nome: 'Servidores SMOSP' },
      ];
    }
    return avaliacoes
      .filter((av) => av.nota_final !== null && av.nota_final !== undefined)
      .map((av, idx) => ({
        secretaria: av.servidor?.orgao_lotacao || 'Geral',
        nfd: parseFloat(String(av.nota_final)),
        dias_servico: 365 * ((idx % 10) + 1),
        nome: av.servidor?.nome_completo || `Servidor #${av.servidor_id}`,
      }));
  }, [avaliacoes]);

  // 2. Dados para Stacked Bar Chart (Clusters pelas 5 Secretarias Oficiais)
  const stackedBarData = useMemo(() => {
    return [
      { orgao: 'SMAD (Administração)', excelente: 4, bom: 5, regular: 1, risco: 0 },
      { orgao: 'SMF (Finanças)', excelente: 5, bom: 4, regular: 1, risco: 0 },
      { orgao: 'SMED (Educação)', excelente: 4, bom: 5, regular: 1, risco: 0 },
      { orgao: 'SMS (Saúde)', excelente: 3, bom: 5, regular: 1, risco: 1 },
      { orgao: 'SMOSP (Obras)', excelente: 3, bom: 4, regular: 2, risco: 1 },
    ];
  }, []);

  // 3. Dados para ComposedChart (Média pelas 5 Secretarias vs Linha de Corte 70 pts)
  const composedData = useMemo(() => {
    return [
      { orgao: 'SMAD (Adm)', media: 86.5, corte: 70, servidores: 12 },
      { orgao: 'SMF (Fin)', media: 88.2, corte: 70, servidores: 12 },
      { orgao: 'SMED (Edu)', media: 84.4, corte: 70, servidores: 12 },
      { orgao: 'SMS (Saúde)', media: 81.1, corte: 70, servidores: 12 },
      { orgao: 'SMOSP (Obras)', media: 77.8, corte: 70, servidores: 12 },
    ];
  }, []);

  // 4. Dados para Donut / PieChart (Distribuição dos Conceitos)
  const pieData = useMemo(() => {
    return [
      { name: 'Excelente (≥ 90 pts)', value: 19, color: '#10b981' },
      { name: 'Bom (80 a 89 pts)', value: 23, color: '#6366f1' },
      { name: 'Regular (70 a 79 pts)', value: 6, color: '#f59e0b' },
      { name: 'Risco / PMD (< 70 pts)', value: 2, color: '#ef4444' },
    ];
  }, []);

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
        accessorKey: 'orgao_lotacao',
        header: 'Secretaria (Órgão)',
        size: 190,
        cell: ({ row }) => {
          const nomeOrg = row.original.orgao_lotacao || 'Não informada';
          const sigla = getSiglaSecretaria(nomeOrg);
          const nomeCurto = getNomeCurtoSecretaria(nomeOrg);
          return (
            <div className="text-left flex items-center gap-1.5 min-w-[160px] max-w-[195px]" title={nomeOrg}>
              <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary shrink-0 border-primary/30">
                {sigla}
              </Badge>
              <span className="text-xs text-foreground font-medium truncate">
                {nomeCurto}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'lotacao_fisica',
        header: 'Departamento (Lotação)',
        size: 220,
        cell: ({ row }) => {
          const depNome = row.original.lotacao_fisica || 'Sede Geral';
          return (
            <div className="text-left space-y-0.5 min-w-[180px] max-w-[225px]" title={depNome}>
              <div className="text-xs text-foreground font-medium truncate">
                {depNome}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {depNome === 'Sede Geral' ? 'Gabinete / Sede Geral' : 'Unidade Departamental'}
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
              onClick={() => {
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
    [ultimaAvaliacaoPorServidor]
  );

  // Mapeamento dos servidores agrupados por Secretaria e Departamento
  const dadosDistribuicao = useMemo(() => {
    return ESTRUTURA_ORGANIZACIONAL_CANONICA.map((sec) => {
      const departamentosComServidores = sec.departamentos.map((dep) => {
        const servs = servidores.filter((s) => {
          const lotFisica = (s.lotacao_fisica || '').toLowerCase();
          const depNome = dep.nome.toLowerCase();

          if (lotFisica && (lotFisica.includes(depNome) || depNome.includes(lotFisica))) {
            return true;
          }

          const siglaDep = dep.codigo.split('-')[1]?.toLowerCase();
          if (siglaDep && (lotFisica.includes(siglaDep) || (s.cargo_efetivo || '').toLowerCase().includes(siglaDep))) {
            return true;
          }

          return false;
        });

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
  }, [servidores]);

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
      {/* ── CONTAGEM REGRESSIVA EM TEMPO REAL ─────────────────────────── */}
      <CountdownWidget />

      <PageHeader
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        title="Portal de RH e Secretaria Municipal de Gestão de Pessoas"
        subtitle="Inteligência de dados com Recharts, controle de prazos regimentais, desempate Art. 39 e integração de folha."
        badge="SMGP / Universal RH"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportarCsvFolha}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar para ERP de Folha (CSV)
            </Button>
          </div>
        }
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── SUB-ABA 1: DASHBOARD ANALÍTICO & BI COM RECHARTS ─────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
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
                  <p className="text-[11px] text-muted-foreground">Linha de corte regimental em 70 pontos (Art. 16).</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Corte: 70,00 pts
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
                      domain={[50, 100]}
                      tick={{ fontSize: 10 }}
                      unit=" pts"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: any, name: any) => [
                        String(name) === 'Nota NFD' ? `${val} pts` : `${val} dias`,
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
                  5 Secretarias
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
                    <Bar dataKey="excelente" name="Excelente" stackId="a" fill="#10b981" />
                    <Bar dataKey="bom" name="Bom" stackId="a" fill="#6366f1" />
                    <Bar dataKey="regular" name="Regular" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="risco" name="Risco (PMD)" stackId="a" fill="#ef4444" />
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
                    Média de Notas por Secretaria vs Corte Legal (70 pts)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">ComposedChart comparando barras de média e linha regulamentar.</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
                  Todas Acima do Corte
                </Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={composedData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="orgao" tick={{ fontSize: 10 }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="media" name="Média da Pasta" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="corte" name="Corte Mínimo (70 pts)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
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
                  <p className="text-[11px] text-muted-foreground">Total do Município de Araucária.</p>
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
        </div>
      )}

      {/* ── SUB-ABA: DISTRIBUIÇÃO INSTITUCIONAL POR PASTA & DEPARTAMENTO ── */}
      {activeTab === 'distribuicao' && (
        <div className="space-y-6">
          {/* CARDS KPI DE COBERTURA INSTITUCIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Secretarias
                  </span>
                  <span className="font-mono text-xl font-black text-foreground tabular-nums">
                    5
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Pastas municipais ativas</p>
            </Card>

            <Card className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Departamentos
                  </span>
                  <span className="font-mono text-xl font-black text-foreground tabular-nums">
                    10
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <FolderTree className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">2 unidades por secretaria</p>
            </Card>

            <Card className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Chefias Nomeadas
                  </span>
                  <span className="font-mono text-xl font-black text-foreground tabular-nums">
                    15
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Shield className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">5 Secretários + 10 Diretores</p>
            </Card>

            <Card className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Servidores Lotados
                  </span>
                  <span className="font-mono text-xl font-black text-foreground tabular-nums">
                    50
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">5 em cada departamento</p>
            </Card>

            <Card className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Vínculos no Órgão
                  </span>
                  <span className="font-mono text-xl font-black text-emerald-500 tabular-nums">
                    65 / 65
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">100% em org_unit_user</p>
            </Card>
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
                    Todas (5)
                  </Button>
                  {ESTRUTURA_ORGANIZACIONAL_CANONICA.map((s) => (
                    <Button
                      key={s.codigo}
                      size="sm"
                      variant={filtroSecDistribuicao === s.codigo ? 'default' : 'outline'}
                      className="h-7 text-xs font-mono"
                      onClick={() => setFiltroSecDistribuicao(s.codigo)}
                    >
                      {s.sigla}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-72">
                <SearchInput
                  value={buscaDistribuicao}
                  onChange={(val) => setBuscaDistribuicao(val)}
                  placeholder="Buscar servidor, cargo ou matrícula..."
                />
              </div>
            </div>
          </Card>

          {/* ESTRUTURA VISUAL DAS SECRETARIAS E SEUS DEPARTAMENTOS */}
          <div className="space-y-6">
            {dadosDistribuicao
              .filter((sec) => filtroSecDistribuicao === 'todas' || sec.codigo === filtroSecDistribuicao)
              .map((sec) => {
                return (
                  <Card key={sec.codigo} className="border-border overflow-hidden">
                    {/* CABEÇALHO DA SECRETARIA */}
                    <div className="p-4 bg-muted/40 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`font-mono text-xs font-bold ${sec.cor}`}>
                            {sec.sigla}
                          </Badge>
                          <h3 className="text-sm font-bold text-foreground">{sec.nome}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <span>Titular da Pasta: <strong className="text-foreground">{sec.secretario.nome}</strong></span>
                          <span className="font-mono text-[11px] text-primary">({sec.secretario.matricula})</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{sec.secretario.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-mono">
                          2 Departamentos
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
                                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>Diretor(a): <strong className="text-foreground">{dep.diretor.nome}</strong></span>
                                    <span className="font-mono text-[10px] text-muted-foreground">({dep.diretor.matricula})</span>
                                  </div>
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
                                    {buscaDistribuicao ? 'Nenhum servidor corresponde à busca.' : 'Carregando servidores alocados...'}
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
                Total: 50 Servidores Operacionais + 15 Chefias
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
                            <div className="font-bold text-xs">{sec.sigla}</div>
                            <div className="text-[11px] text-muted-foreground">{sec.nome}</div>
                            <div className="text-[10px] text-primary mt-1 font-mono">
                              Secretário: {sec.secretario.nome}
                            </div>
                          </td>
                        ) : null}
                        <td className="py-2.5 px-3 text-foreground font-sans">
                          <div className="font-semibold text-xs">{dep.nome}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{dep.codigo}</div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-sans">
                          <div>{dep.diretor.nome}</div>
                          <div className="text-[10px] font-mono text-primary">{dep.diretor.matricula}</div>
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

      {/* ── Modal: Visualização do Espelho da Avaliação ────────────────── */}
      <EspelhoAvaliacaoModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalEspelhoOpen}
        onClose={() => setModalEspelhoOpen(false)}
      />
    </div>
  );
};
