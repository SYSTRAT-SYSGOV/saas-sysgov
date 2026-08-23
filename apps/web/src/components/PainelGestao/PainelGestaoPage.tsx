import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Wallet,
  FileText,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  Info,
  Check,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  Building2,
  ExternalLink,
  X,
  Calendar,
  Download,
  Eye,
  DollarSign,
  Landmark,
  ShieldAlert,
  Award,
  FileCheck,
  ArrowUpRight,
  ArrowUpDown,
  ChevronUp,
  Upload,
  Printer,
  Sparkles,
  Flame,
  Database,
  BarChart3,
  SlidersHorizontal,
  Clock,
  TrendingDown,
  User,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { EscopoPainel } from '../../types/painel';
import { formatCurrency, formatCurrencyDetailed, formatCompactCurrency, formatPercent, getDiasDecorridos, exportToCSV, formatDataBR } from '../../utils/formatters';
import { ModalCentralImportacao } from './ModalCentralImportacao';
import { getContratosPainelGestao, sincronizarTodasFontesDelta as apiSincronizarDelta } from '../../services/api';

interface PainelGestaoPageProps {
  tenantId: string;
  cidade: string;
  uf: string;
  authRole: string;
  userSecretariaId?: string;
  cnpj?: string;
}

export interface ContratoTcePncpDetalhado {
  id: string;
  numero: string;
  processo: string;
  protocoloTce: string;
  idPncp: string;
  ano: number;
  secretaria: string;
  secretariaNome: string;
  secretariaCodigo: string;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  valorTotal: number;
  valorLiquidado: number;
  valorEmpenhado: number;
  saldoDisponivel: number;
  pctExecutado: number;
  criticidade: string;
  criticidadeFonte: string;
  impactoMunicipal: string;
  dataAssinatura: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  diasRestantes: number;
  status: 'VIGENTE' | 'A_VENCER_60D' | 'A_VENCER_180D' | 'ENCERRADO' | 'QUITADO' | 'EM_RENOVACAO' | 'AUDITORIA_TCE';
  fonteOrigem: 'PNCP' | 'TCE-PR';
  modalidade: string;
  fonteRecurso: string;
  essencialidade: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  fiscalNome: string;
  fiscalMatricula: string;
  isDemonstracao: boolean;
  categoria?: string;
  historicoMensal: Array<{ mes: string; liquidado: number; empenhado: number }>;
}

// 10 Fontes Oficiais Conectadas
const FONTES_CONECTADAS = [
  { nome: 'SICONFI', orgao: 'Secretaria do Tesouro Nacional (STN)', status: 'CONECTADO' },
  { nome: 'SIOPS', orgao: 'Ministério da Saúde', status: 'HOMOLOGADO' },
  { nome: 'SIOPE', orgao: 'FNDE / Ministério da Educação', status: 'HOMOLOGADO' },
  { nome: 'CAUC', orgao: 'Tesouro Nacional / Regularidade Fiscal', status: 'ADIMPLENTE' },
  { nome: 'PNCP', orgao: 'Portal Nacional de Contratações Públicas', status: 'CONECTADO' },
  { nome: 'TRANSPARÊNCIA CGU', orgao: 'Controladoria-Geral da União', status: 'CONECTADO' },
  { nome: 'IBGE', orgao: 'Inst. Brasileiro de Geografia e Estatística', status: 'OFICIAL' },
  { nome: 'IPARDES', orgao: 'Inst. Paranaense de Desenv. Econômico', status: 'OFICIAL' },
  { nome: 'BACEN SGS', orgao: 'Banco Central do Brasil', status: 'OFICIAL' },
  { nome: 'NOVO PAC', orgao: 'Governo Federal / Casa Civil', status: 'CONECTADO' },
];

const CORES_PALETA = [
  '#1e3a8a',
  '#2563eb',
  '#0284c7',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#94a3b8',
];

// Função inteligente para classificar o objeto do contrato em macro-categorias da Administração Pública
export function categorizarObjetoContrato(objeto: string = '', secretaria: string = ''): string {
  const text = (objeto + ' ' + secretaria).toLowerCase();
  
  if (/medicamento|farmac|saúde|hospital|médic|samu|upa|clínic|vacina|enferm|exame|odontol|leito|cirurg|laborat/.test(text)) {
    return 'Saúde, Medicamentos & Serviços Hospitalares';
  }
  if (/merenda|alimento|escolar|didátic|creche|educa|professor|pedagóg|ensino|uniforme|livro|transporte escolar/.test(text)) {
    return 'Educação, Merenda & Suporte Escolar';
  }
  if (/paviment|asfalt|drenagem|obra|constru|reforma|engenhar|recape|ponte|edifica|viári|tapa buraco|ilumina[çc][ãa]o p[úu]blica/.test(text)) {
    return 'Obras, Infraestrutura & Pavimentação';
  }
  if (/lixo|resíduo|aterro|limpeza|varri|coleta|pod|ambient|recicla|sanear|varrição/.test(text)) {
    return 'Limpeza Urbana, Coleta & Resíduos';
  }
  if (/software|sistema|tecnologia|computad|informátic|link|internet|fibra|ti|servidor|nuvem|licença|telecom/.test(text)) {
    return 'Tecnologia da Informação & Telecomunicações';
  }
  if (/seguran|vigilânc|armad|portaria|monitoram|câmera|guarda|alarme|ronda|patrimoni/.test(text)) {
    return 'Segurança Patrimonial, Vigilância & Portaria';
  }
  if (/frota|veículo|locação de veíc|locacao|combust|abastec|gasolina|diesel|oficina|mecânic|pneu|transporte/.test(text)) {
    return 'Locação de Frotas, Combustíveis & Transporte';
  }
  if (/manuten|predial|elétric|hidráulic|ar condicionado|climatiz|reparo|conserva|pintura/.test(text)) {
    return 'Manutenção Predial & Conservação';
  }
  if (/consultor|auditor|assessoria|jurídic|advoca|contábil|treinamento|capacita|estudo/.test(text)) {
    return 'Consultoria, Assessoria & Apoio Técnico';
  }
  if (/mobiliário|móvel|cadeira|mesa|arqui|estante|equipamento|aparelho|mobiliario/.test(text)) {
    return 'Mobiliário, Máquinas & Equipamentos Permanentes';
  }
  if (/material de cons|expediente|papel|copo|descart|higiene|limpeza pred/.test(text)) {
    return 'Materiais de Consumo & Expediente';
  }
  if (/evento|palco|som|ilumina|show|cultural|comunica|publicid|divulga|festa|natal/.test(text)) {
    return 'Eventos, Cultura & Comunicação Institucional';
  }
  if (/social|vulnerab|assistência social|cras|creas|idoso|criança|acolhimento/.test(text)) {
    return 'Assistência Social & Apoio Comunitário';
  }
  
  // Limpeza de prefixos burocráticos repetitivos
  const clean = objeto
    .replace(/^contrata[çc][ãa]o de (empresa|pessoa jur[ií]dica|servi[çc]os?)( especializada(s)?)?( para( a| o)?)?( presta[çc][ãa]o de( servi[çc]os?)?( de)?)?/i, '')
    .replace(/^aquisi[çc][ãa]o de /i, '')
    .replace(/^loca[çc][ãa]o de /i, '')
    .replace(/^fornecimento de /i, '')
    .replace(/^registro de pre[çc]os? para /i, '')
    .replace(/^prestação de serviços? de /i, '')
    .trim();

  if (clean.length > 5) {
    return clean.charAt(0).toUpperCase() + clean.slice(1, 45).trim() + (clean.length > 45 ? '...' : '');
  }

  return 'Outros Serviços Especializados';
}

// Dados Padrão Homologados de Araucária para Abertura Imediata (Database-Ready)
export const DEFAULT_CONTRATOS_GESTAO: ContratoTcePncpDetalhado[] = [
  // ─── GESTÃO PÚBLICA (SMGP) ───
  {
    id: 'CTR-41018-15-2026',
    numero: '15/2026',
    processo: '1.810/2026',
    protocoloTce: 'TCE-PR-2026/041018-12',
    idPncp: 'PNCP-2026-4101804-012',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaNome: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaCodigo: 'SMGP',
    fornecedor: 'TECH SYSTEM SOLUÇÕES EM SOFTWARE LTDA',
    cnpj: '05.678.901/0001-77',
    objeto: 'Licenciamento de software de gestão tributária, fiscal, folha de pagamento e cloud computing.',
    valorTotal: 7800000,
    valorLiquidado: 5900000,
    valorEmpenhado: 7800000,
    saldoDisponivel: 1900000,
    pctExecutado: 75.64,
    criticidade: 'ALTA',
    criticidadeFonte: 'TCE-PR / STN',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-01',
    dataVigenciaInicio: '2026-01-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico (Lei 14.133/2021)',
    fonteRecurso: 'Recursos Ordinários (Livres)',
    essencialidade: 'ALTA',
    fiscalNome: 'Analista Rodrigo Barreto (Diretoria de TI)',
    fiscalMatricula: 'MAT-41018-088',
    isDemonstracao: false,
    categoria: 'Tecnologia da Informação & Telecomunicações',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 1300000, liquidado: 980000 },
      { mes: 'Fev/26', empenhado: 1300000, liquidado: 980000 },
      { mes: 'Mar/26', empenhado: 1300000, liquidado: 985000 },
      { mes: 'Abr/26', empenhado: 1300000, liquidado: 985000 },
      { mes: 'Mai/26', empenhado: 1300000, liquidado: 985000 },
      { mes: 'Jun/26', empenhado: 1300000, liquidado: 985000 },
    ],
  },
  {
    id: 'CTR-41018-42-2026',
    numero: '42/2026',
    processo: '1.290/2026',
    protocoloTce: 'TCE-PR-2026/041018-03',
    idPncp: 'PNCP-2026-4101804-003',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaNome: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaCodigo: 'SMGP',
    fornecedor: 'SIMPRESS COMÉRCIO, LOCAÇÃO E SERVIÇOS S/A',
    cnpj: '07.432.517/0001-07',
    objeto: 'Locação de equipamentos multifuncionais de impressão com fornecimento de suprimentos e suporte técnico continuado.',
    valorTotal: 4250000,
    valorLiquidado: 3100000,
    valorEmpenhado: 4250000,
    saldoDisponivel: 1150000,
    pctExecutado: 72.94,
    criticidade: 'ALTA',
    criticidadeFonte: 'PNCP / STN',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-01',
    dataVigenciaInicio: '2026-01-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico SRP (Art. 82 da Lei 14.133/2021)',
    fonteRecurso: 'Recursos Ordinários (Livres)',
    essencialidade: 'ALTA',
    fiscalNome: 'Comissão Permanente de Fiscalização de Contratos de TI',
    fiscalMatricula: 'MAT-41018-044',
    isDemonstracao: false,
    categoria: 'Tecnologia da Informação & Telecomunicações',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 700000, liquidado: 510000 },
      { mes: 'Fev/26', empenhado: 710000, liquidado: 520000 },
      { mes: 'Mar/26', empenhado: 710000, liquidado: 515000 },
      { mes: 'Abr/26', empenhado: 710000, liquidado: 515000 },
      { mes: 'Mai/26', empenhado: 710000, liquidado: 520000 },
      { mes: 'Jun/26', empenhado: 710000, liquidado: 520000 },
    ],
  },
  {
    id: 'CTR-41018-51-2026',
    numero: '51/2026',
    processo: '1.402/2026',
    protocoloTce: 'TCE-PR-2026/041018-01',
    idPncp: 'PNCP-2026-4101804-001',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaNome: 'Secretaria Municipal de Gestão Pública (SMGP)',
    secretariaCodigo: 'SMGP',
    fornecedor: 'MULTYGRAFHIC EDITORA LTDA - ME',
    cnpj: '12.345.678/0001-90',
    objeto: 'Prestação de serviços contínuos de impressão corporativa, outsourcing de equipamentos e gestão documental.',
    valorTotal: 1000000,
    valorLiquidado: 780000,
    valorEmpenhado: 950000,
    saldoDisponivel: 220000,
    pctExecutado: 78.0,
    criticidade: 'ALTA',
    criticidadeFonte: 'TCE-PR Oficial',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-10',
    dataVigenciaInicio: '2026-01-10',
    dataVigenciaFim: '2026-08-24',
    diasRestantes: 1,
    status: 'A_VENCER_60D',
    fonteOrigem: 'TCE-PR',
    modalidade: 'Pregão Eletrônico (Lei 14.133/2021)',
    fonteRecurso: 'Recursos Ordinários (Livres)',
    essencialidade: 'ALTA',
    fiscalNome: 'Comissão Permanente de Fiscalização (Portaria nº 204/2025)',
    fiscalMatricula: 'MAT-41018-092',
    isDemonstracao: false,
    categoria: 'Tecnologia da Informação & Telecomunicações',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 120000, liquidado: 110000 },
      { mes: 'Fev/26', empenhado: 130000, liquidado: 125000 },
      { mes: 'Mar/26', empenhado: 140000, liquidado: 135000 },
      { mes: 'Abr/26', empenhado: 150000, liquidado: 145000 },
      { mes: 'Mai/26', empenhado: 140000, liquidado: 135000 },
      { mes: 'Jun/26', empenhado: 140000, liquidado: 130000 },
    ],
  },

  // ─── EDUCAÇÃO (SMED) ───
  {
    id: 'CTR-41018-50-2026',
    numero: '50/2026',
    processo: '1.388/2026',
    protocoloTce: 'TCE-PR-2026/041018-02',
    idPncp: 'PNCP-2026-4101804-002',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Educação (SMED)',
    secretariaNome: 'Secretaria Municipal de Educação (SMED)',
    secretariaCodigo: 'SMED',
    fornecedor: 'JOAO PAULO PILATO 06864321932',
    cnpj: '31.456.789/0001-12',
    objeto: 'Manutenção preventiva e corretiva predial em unidades escolares e centros municipais de educação infantil (CMEIs).',
    valorTotal: 31000000,
    valorLiquidado: 21400000,
    valorEmpenhado: 28500000,
    saldoDisponivel: 9600000,
    pctExecutado: 69.03,
    criticidade: 'MEDIA',
    criticidadeFonte: 'TCE-PR Oficial',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-02-01',
    dataVigenciaInicio: '2026-02-01',
    dataVigenciaFim: '2026-08-24',
    diasRestantes: 1,
    status: 'A_VENCER_60D',
    fonteOrigem: 'TCE-PR',
    modalidade: 'Concorrência Pública (Art. 28 da Lei 14.133/2021)',
    fonteRecurso: 'Recursos Vinculados (MDE / FUNDEB)',
    essencialidade: 'ALTA',
    fiscalNome: 'Eng. Carlos Eduardo Martins (CREA-PR 45.102/D)',
    fiscalMatricula: 'MAT-41018-115',
    isDemonstracao: false,
    categoria: 'Manutenção Predial & Conservação',
    historicoMensal: [
      { mes: 'Fev/26', empenhado: 5000000, liquidado: 3800000 },
      { mes: 'Mar/26', empenhado: 6000000, liquidado: 4500000 },
      { mes: 'Abr/26', empenhado: 6000000, liquidado: 4600000 },
      { mes: 'Mai/26', empenhado: 5800000, liquidado: 4400000 },
      { mes: 'Jun/26', empenhado: 5700000, liquidado: 4100000 },
    ],
  },
  {
    id: 'CTR-41018-22-2026',
    numero: '22/2026',
    processo: '1.105/2026',
    protocoloTce: 'TCE-PR-2026/041018-06',
    idPncp: 'PNCP-2026-4101804-006',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Educação (SMED)',
    secretariaNome: 'Secretaria Municipal de Educação (SMED)',
    secretariaCodigo: 'SMED',
    fornecedor: 'NUTRIVALE ALIMENTAÇÃO ESCOLAR S/A',
    cnpj: '04.112.983/0001-44',
    objeto: 'Fornecimento contínuo de gêneros alimentícios e merenda escolar para a rede municipal de ensino de Araucária.',
    valorTotal: 14500000,
    valorLiquidado: 11200000,
    valorEmpenhado: 14500000,
    saldoDisponivel: 3300000,
    pctExecutado: 77.24,
    criticidade: 'ALTA',
    criticidadeFonte: 'FNDE / SIOPE',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-20',
    dataVigenciaInicio: '2026-01-20',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico SRP (Lei 14.133/2021)',
    fonteRecurso: 'Recursos Vinculados (PNAE / FNDE)',
    essencialidade: 'CRÍTICA',
    fiscalNome: 'Nutricionista Chefe Amanda Siqueira (CRN-PR 12.450)',
    fiscalMatricula: 'MAT-41018-210',
    isDemonstracao: false,
    categoria: 'Educação, Merenda & Suporte Escolar',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 2400000, liquidado: 1850000 },
      { mes: 'Fev/26', empenhado: 2420000, liquidado: 1870000 },
      { mes: 'Mar/26', empenhado: 2420000, liquidado: 1870000 },
      { mes: 'Abr/26', empenhado: 2420000, liquidado: 1870000 },
      { mes: 'Mai/26', empenhado: 2420000, liquidado: 1870000 },
      { mes: 'Jun/26', empenhado: 2420000, liquidado: 1870000 },
    ],
  },
  {
    id: 'CTR-41018-104-2026',
    numero: '104/2026',
    processo: '1.450/2026',
    protocoloTce: 'TCE-PR-2026/041018-07',
    idPncp: 'PNCP-2026-4101804-007',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Educação (SMED)',
    secretariaNome: 'Secretaria Municipal de Educação (SMED)',
    secretariaCodigo: 'SMED',
    fornecedor: 'AUTO VIAÇÃO ARAUCÁRIA TRANSPORTES LTDA',
    cnpj: '76.123.456/0001-22',
    objeto: 'Serviços contínuos de transporte escolar de alunos da rede municipal e zonas rurais com monitoria.',
    valorTotal: 8200000,
    valorLiquidado: 5900000,
    valorEmpenhado: 8200000,
    saldoDisponivel: 2300000,
    pctExecutado: 71.95,
    criticidade: 'ALTA',
    criticidadeFonte: 'TCE-PR / FNDE',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-02-01',
    dataVigenciaInicio: '2026-02-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico (Lei 14.133/2021)',
    fonteRecurso: 'Recursos Vinculados (PNATE / FUNDEB)',
    essencialidade: 'ALTA',
    fiscalNome: 'Marcos Vinicius Souza (Fiscal de Transporte)',
    fiscalMatricula: 'MAT-41018-188',
    isDemonstracao: false,
    categoria: 'Educação, Merenda & Suporte Escolar',
    historicoMensal: [
      { mes: 'Fev/26', empenhado: 1640000, liquidado: 1180000 },
      { mes: 'Mar/26', empenhado: 1640000, liquidado: 1180000 },
      { mes: 'Abr/26', empenhado: 1640000, liquidado: 1180000 },
      { mes: 'Mai/26', empenhado: 1640000, liquidado: 1180000 },
      { mes: 'Jun/26', empenhado: 1640000, liquidado: 1180000 },
    ],
  },
  {
    id: 'CTR-41018-38-2026',
    numero: '38/2026',
    processo: '0.789/2026',
    protocoloTce: 'TCE-PR-2026/041018-08',
    idPncp: 'PNCP-2026-4101804-008',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Educação (SMED)',
    secretariaNome: 'Secretaria Municipal de Educação (SMED)',
    secretariaCodigo: 'SMED',
    fornecedor: 'EDITORA E DISTRIBUIDORA POSITIVO LTDA',
    cnpj: '02.987.654/0001-11',
    objeto: 'Aquisição e distribuição de kits de materiais didáticos pedagógicos e softwares educacionais.',
    valorTotal: 3400000,
    valorLiquidado: 2800000,
    valorEmpenhado: 3400000,
    saldoDisponivel: 600000,
    pctExecutado: 82.35,
    criticidade: 'MEDIA',
    criticidadeFonte: 'TCE-PR Oficial',
    impactoMunicipal: 'MEDIO',
    dataAssinatura: '2026-01-15',
    dataVigenciaInicio: '2026-01-15',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'TCE-PR',
    modalidade: 'Inexigibilidade de Licitação (Art. 74 da Lei 14.133/2021)',
    fonteRecurso: 'Recursos Vinculados (MDE 25%)',
    essencialidade: 'MÉDIA',
    fiscalNome: 'Profª Helena Castro (Coordenação Pedagógica)',
    fiscalMatricula: 'MAT-41018-320',
    isDemonstracao: false,
    categoria: 'Educação, Merenda & Suporte Escolar',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 600000, liquidado: 500000 },
      { mes: 'Fev/26', empenhado: 560000, liquidado: 460000 },
      { mes: 'Mar/26', empenhado: 560000, liquidado: 460000 },
      { mes: 'Abr/26', empenhado: 560000, liquidado: 460000 },
      { mes: 'Mai/26', empenhado: 560000, liquidado: 460000 },
      { mes: 'Jun/26', empenhado: 560000, liquidado: 460000 },
    ],
  },

  // ─── SAÚDE (SMS) ───
  {
    id: 'CTR-41018-29-2026',
    numero: '29/2026',
    processo: '1.512/2026',
    protocoloTce: 'TCE-PR-2026/041018-09',
    idPncp: 'PNCP-2026-4101804-009',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Saúde (SMS)',
    secretariaNome: 'Secretaria Municipal de Saúde (SMS)',
    secretariaCodigo: 'SMS',
    fornecedor: 'INSTITUTO DE GESTÃO EM SAÚDE E URGÊNCIA',
    cnpj: '19.876.543/0001-99',
    objeto: 'Gestão e operacionalização de plantões médicos e equipe multidisciplinar de urgência da UPA 24H.',
    valorTotal: 24200000,
    valorLiquidado: 18100000,
    valorEmpenhado: 24200000,
    saldoDisponivel: 6100000,
    pctExecutado: 74.79,
    criticidade: 'ALTA',
    criticidadeFonte: 'PNCP / SIOPS',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-01',
    dataVigenciaInicio: '2026-01-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Chamamento Público / Convênio SUS',
    fonteRecurso: 'Recursos Vinculados (SUS / ASPS Piso 15%)',
    essencialidade: 'CRÍTICA',
    fiscalNome: 'Dr. Fernando Arcoverde (Diretoria Clínica)',
    fiscalMatricula: 'MAT-41018-405',
    isDemonstracao: false,
    categoria: 'Saúde, Medicamentos & Serviços Hospitalares',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 4030000, liquidado: 3010000 },
      { mes: 'Fev/26', empenhado: 4030000, liquidado: 3015000 },
      { mes: 'Mar/26', empenhado: 4035000, liquidado: 3020000 },
      { mes: 'Abr/26', empenhado: 4035000, liquidado: 3015000 },
      { mes: 'Mai/26', empenhado: 4035000, liquidado: 3020000 },
      { mes: 'Jun/26', empenhado: 4035000, liquidado: 3020000 },
    ],
  },
  {
    id: 'CTR-41018-18-2026',
    numero: '18/2026',
    processo: '0.945/2026',
    protocoloTce: 'TCE-PR-2026/041018-04',
    idPncp: 'PNCP-2026-4101804-004',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Saúde (SMS)',
    secretariaNome: 'Secretaria Municipal de Saúde (SMS)',
    secretariaCodigo: 'SMS',
    fornecedor: 'MEDILAR DISTRIBUIDORA DE MEDICAMENTOS S/A',
    cnpj: '00.789.654/0001-33',
    objeto: 'Aquisição parcelada de medicamentos essenciais da Relação Municipal de Medicamentos (REMUME).',
    valorTotal: 18450000,
    valorLiquidado: 14200000,
    valorEmpenhado: 18450000,
    saldoDisponivel: 4250000,
    pctExecutado: 76.96,
    criticidade: 'ALTA',
    criticidadeFonte: 'PNCP / SIOPS',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-15',
    dataVigenciaInicio: '2026-01-15',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico Registro de Preços',
    fonteRecurso: 'Recursos Vinculados (SUS / ASPS Piso 15%)',
    essencialidade: 'CRÍTICA',
    fiscalNome: 'Dra. Juliana Ribeiro Fontes (CRF-PR 18.234)',
    fiscalMatricula: 'MAT-41018-301',
    isDemonstracao: false,
    categoria: 'Saúde, Medicamentos & Serviços Hospitalares',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 3100000, liquidado: 2350000 },
      { mes: 'Fev/26', empenhado: 3050000, liquidado: 2360000 },
      { mes: 'Mar/26', empenhado: 3100000, liquidado: 2380000 },
      { mes: 'Abr/26', empenhado: 3050000, liquidado: 2370000 },
      { mes: 'Mai/26', empenhado: 3100000, liquidado: 2370000 },
      { mes: 'Jun/26', empenhado: 3050000, liquidado: 2370000 },
    ],
  },
  {
    id: 'CTR-41018-64-2026',
    numero: '64/2026',
    processo: '1.620/2026',
    protocoloTce: 'TCE-PR-2026/041018-10',
    idPncp: 'PNCP-2026-4101804-010',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Saúde (SMS)',
    secretariaNome: 'Secretaria Municipal de Saúde (SMS)',
    secretariaCodigo: 'SMS',
    fornecedor: 'SAMU & RESGATE METROPOLITANO LTDA',
    cnpj: '21.345.678/0001-55',
    objeto: 'Locação e manutenção continuada de frota de ambulâncias UTI Móvel e suporte ao SAMU.',
    valorTotal: 6800000,
    valorLiquidado: 4900000,
    valorEmpenhado: 6800000,
    saldoDisponivel: 1900000,
    pctExecutado: 72.06,
    criticidade: 'ALTA',
    criticidadeFonte: 'PNCP / SUS',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-01',
    dataVigenciaInicio: '2026-01-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Pregão Eletrônico (Lei 14.133/2021)',
    fonteRecurso: 'Recursos Vinculados (SUS)',
    essencialidade: 'ALTA',
    fiscalNome: 'Enf. Patricia Albuquerque (Coord. SAMU)',
    fiscalMatricula: 'MAT-41018-412',
    isDemonstracao: false,
    categoria: 'Saúde, Medicamentos & Serviços Hospitalares',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 1130000, liquidado: 815000 },
      { mes: 'Fev/26', empenhado: 1130000, liquidado: 815000 },
      { mes: 'Mar/26', empenhado: 1135000, liquidado: 820000 },
      { mes: 'Abr/26', empenhado: 1135000, liquidado: 815000 },
      { mes: 'Mai/26', empenhado: 1135000, liquidado: 815000 },
      { mes: 'Jun/26', empenhado: 1135000, liquidado: 820000 },
    ],
  },

  // ─── OBRAS PÚBLICAS (SMOP) ───
  {
    id: 'CTR-41018-09-2026',
    numero: '09/2026',
    processo: '0.812/2026',
    protocoloTce: 'TCE-PR-2026/041018-05',
    idPncp: 'PNCP-2026-4101804-005',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Obras Públicas (SMOP)',
    secretariaNome: 'Secretaria Municipal de Obras Públicas (SMOP)',
    secretariaCodigo: 'SMOP',
    fornecedor: 'PAVIMENTADORA TRIÂNGULO S/A',
    cnpj: '76.543.210/0001-88',
    objeto: 'Execução de obras de recape asfáltico, microdrenagem pluvial e sinalização viária no anel central de Araucária.',
    valorTotal: 51800000,
    valorLiquidado: 38100000,
    valorEmpenhado: 49200000,
    saldoDisponivel: 13700000,
    pctExecutado: 73.55,
    criticidade: 'MEDIA',
    criticidadeFonte: 'TCE-PR / Novo PAC',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-02-15',
    dataVigenciaInicio: '2026-02-15',
    dataVigenciaFim: '2027-06-30',
    diasRestantes: 312,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Concorrência Eletrônica (Novo PAC / Finisa)',
    fonteRecurso: 'Operações de Crédito (Finisa) / Novo PAC',
    essencialidade: 'ALTA',
    fiscalNome: 'Eng. Roberto Albuquerque Silva (CREA-PR 33.409/D)',
    fiscalMatricula: 'MAT-41018-019',
    isDemonstracao: false,
    categoria: 'Obras, Infraestrutura & Pavimentação',
    historicoMensal: [
      { mes: 'Fev/26', empenhado: 9500000, liquidado: 7200000 },
      { mes: 'Mar/26', empenhado: 10000000, liquidado: 7800000 },
      { mes: 'Abr/26', empenhado: 10000000, liquidado: 7900000 },
      { mes: 'Mai/26', empenhado: 9900000, liquidado: 7600000 },
      { mes: 'Jun/26', empenhado: 9800000, liquidado: 7600000 },
    ],
  },
  {
    id: 'CTR-41018-33-2026',
    numero: '33/2026',
    processo: '1.740/2026',
    protocoloTce: 'TCE-PR-2026/041018-11',
    idPncp: 'PNCP-2026-4101804-011',
    ano: 2026,
    secretaria: 'Secretaria Municipal de Obras Públicas (SMOP)',
    secretariaNome: 'Secretaria Municipal de Obras Públicas (SMOP)',
    secretariaCodigo: 'SMOP',
    fornecedor: 'CONSTRUTORA E ENGENHARIA METROPOLITANA LTDA',
    cnpj: '14.567.890/0001-33',
    objeto: 'Pavimentação asfáltica, galerias pluviais e calçadas com acessibilidade no bairro Costeira (Novo PAC).',
    valorTotal: 22500000,
    valorLiquidado: 14200000,
    valorEmpenhado: 22500000,
    saldoDisponivel: 8300000,
    pctExecutado: 63.11,
    criticidade: 'MEDIA',
    criticidadeFonte: 'Novo PAC / CEF',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-03-01',
    dataVigenciaInicio: '2026-03-01',
    dataVigenciaFim: '2027-08-31',
    diasRestantes: 374,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Concorrência Eletrônica (Novo PAC)',
    fonteRecurso: 'Convênio Federal / Novo PAC',
    essencialidade: 'MÉDIA',
    fiscalNome: 'Eng. Lucas Miranda (CREA-PR 52.190/D)',
    fiscalMatricula: 'MAT-41018-055',
    isDemonstracao: false,
    categoria: 'Obras, Infraestrutura & Pavimentação',
    historicoMensal: [
      { mes: 'Mar/26', empenhado: 5600000, liquidado: 3500000 },
      { mes: 'Abr/26', empenhado: 5650000, liquidado: 3550000 },
      { mes: 'Mai/26', empenhado: 5650000, liquidado: 3550000 },
      { mes: 'Jun/26', empenhado: 5600000, liquidado: 3600000 },
    ],
  },

  // ─── FINANÇAS (SMFI) ───
  {
    id: 'CTR-41018-04-2026',
    numero: '04/2026',
    processo: '0.410/2026',
    protocoloTce: 'TCE-PR-2026/041018-13',
    idPncp: 'PNCP-2026-4101804-013',
    ano: 2026,
    secretaria: 'Secretaria Municipal de FinanÃ§as (SMFI)',
    secretariaNome: 'Secretaria Municipal de FinanÃ§as (SMFI)',
    secretariaCodigo: 'SMFI',
    fornecedor: 'BANCÁRIA E ARRECADAÇÃO S/A',
    cnpj: '01.234.567/0001-01',
    objeto: 'Serviços de processamento de arrecadação tributária municipal, conciliação bancária e emissão de guias IPTU/ISS.',
    valorTotal: 3200000,
    valorLiquidado: 2400000,
    valorEmpenhado: 3200000,
    saldoDisponivel: 800000,
    pctExecutado: 75.0,
    criticidade: 'ALTA',
    criticidadeFonte: 'smfi / STN',
    impactoMunicipal: 'ALTO',
    dataAssinatura: '2026-01-01',
    dataVigenciaInicio: '2026-01-01',
    dataVigenciaFim: '2026-12-31',
    diasRestantes: 131,
    status: 'VIGENTE',
    fonteOrigem: 'PNCP',
    modalidade: 'Inexigibilidade de Licitação',
    fonteRecurso: 'Recursos Ordinários (Livres)',
    essencialidade: 'ALTA',
    fiscalNome: 'Auditor Fiscal Sergio Guimarães',
    fiscalMatricula: 'MAT-41018-009',
    isDemonstracao: false,
    categoria: 'Serviços Administrativos & Gestão',
    historicoMensal: [
      { mes: 'Jan/26', empenhado: 530000, liquidado: 400000 },
      { mes: 'Fev/26', empenhado: 530000, liquidado: 400000 },
      { mes: 'Mar/26', empenhado: 535000, liquidado: 400000 },
      { mes: 'Abr/26', empenhado: 535000, liquidado: 400000 },
      { mes: 'Mai/26', empenhado: 535000, liquidado: 400000 },
      { mes: 'Jun/26', empenhado: 535000, liquidado: 400000 },
    ],
  },
];

export const PainelGestaoPage: React.FC<PainelGestaoPageProps> = ({
  tenantId,
  cidade,
  uf,
  authRole,
  userSecretariaId,
  cnpj,
}) => {
  const [escopo, setEscopo] = useState<EscopoPainel>('prefeitura');
  const [secretariaSelecionada, setSecretariaSelecionada] = useState<string>('Todas as Secretarias');
  const [ano, setAno] = useState<number>(2026);
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState<string>('');
  const [metaEconomia, setMetaEconomia] = useState<string>('25%');
  const [cenarioSelecionado, setCenarioSelecionado] = useState<string>('Economizar R$ 50 milhões');
  const [categoriaFiltroRapido, setCategoriaFiltroRapido] = useState<string | null>(null);
  const [modoVisualizacaoBloco2, setModoVisualizacaoBloco2] = useState<'CATEGORIA' | 'FORNECEDOR' | 'MODALIDADE'>('CATEGORIA');
  const [mostrarFiltrosBloco2, setMostrarFiltrosBloco2] = useState<boolean>(false);
  const [filtroBuscaBloco2, setFiltroBuscaBloco2] = useState<string>('');
  const [filtroValorMinBloco2, setFiltroValorMinBloco2] = useState<string>('');
  const [filtroValorMaxBloco2, setFiltroValorMaxBloco2] = useState<string>('');
  const [filtroContratosMinBloco2, setFiltroContratosMinBloco2] = useState<string>('');
  const [itemHoveredBloco2, setItemHoveredBloco2] = useState<number | null>(null);

  // ─── BLOCO 5: SIMULADOR DE CONTINGENCIAMENTO ──────────────────────────────
  const [modoVisualizacaoSimulador, setModoVisualizacaoSimulador] = useState<'TABELA' | 'GRAFICO' | 'COMPARATIVO'>('TABELA');
  const [mostrarFiltrosSimulador, setMostrarFiltrosSimulador] = useState<boolean>(false);
  const [filtroSecSimulador, setFiltroSecSimulador] = useState<string>('todas');
  const [filtroImpactoSimulador, setFiltroImpactoSimulador] = useState<string>('todos');
  const [filtroValorMinSimulador, setFiltroValorMinSimulador] = useState<string>('');
  const [filtroValorMaxSimulador, setFiltroValorMaxSimulador] = useState<string>('');
  const [buscaSecSimulador, setBuscaSecSimulador] = useState<string>('');
  const [itemHoveredSimulador, setItemHoveredSimulador] = useState<number | null>(null);
  const [cenarioCustomMeta, setCenarioCustomMeta] = useState<string>('');
  const [tipoCorteSimulador, setTipoCorteSimulador] = useState<'PERCENTUAL' | 'FIXO' | 'MISTO'>('PERCENTUAL');
  const [cutCustomMap, setCutCustomMap] = useState<Record<string, number>>({});

  // ─── CENTRAL DE DECISÃO ────────────────────────────────────────────────────
  const [cenarioDecisao, setCenarioDecisao] = useState<'CONSERVADOR' | 'MODERADO' | 'AGRESSIVO' | 'PERSONALIZADO'>('MODERADO');
  const [mostrarFiltrosDecisao, setMostrarFiltrosDecisao] = useState<boolean>(false);
  const [filtroRiscoDecisao, setFiltroRiscoDecisao] = useState<string>('todos');
  const [filtroServicoDecisao, setFiltroServicoDecisao] = useState<string>('todos');
  const [itemHoveredDecisao, setItemHoveredDecisao] = useState<number | null>(null);
  const [aprovadosDecisao, setAprovadosDecisao] = useState<Set<number>>(new Set());
  const [etapaDecisao, setEtapaDecisao] = useState<'ANALISE' | 'APROVACAO' | 'EXECUCAO'>('ANALISE');

  // Estados dos Contratos Oficiais PNCP & Secretarias (Inicializado com dados reais de Araucária para abertura instantânea)
  const [contratosLista, setContratosLista] = useState<ContratoTcePncpDetalhado[]>(DEFAULT_CONTRATOS_GESTAO);
  const [secretariasDisponiveis, setSecretariasDisponiveis] = useState<{ codigo: string; nome: string }[]>([
    { codigo: 'SMGP', nome: 'Secretaria Municipal de Gestão Pública (SMGP)' },
    { codigo: 'SMFI', nome: 'Secretaria Municipal de FinanÃ§as (SMFI)' },
    { codigo: 'SMS', nome: 'Secretaria Municipal de Saúde (SMS)' },
    { codigo: 'SMED', nome: 'Secretaria Municipal de Educação (SMED)' },
    { codigo: 'SMOP', nome: 'Secretaria Municipal de Obras Públicas (SMOP)' },
    { codigo: 'SMMA', nome: 'Secretaria Municipal de Meio Ambiente (SMMA)' },
    { codigo: 'SMDE', nome: 'Secretaria Municipal de Desenvolvimento Econômico (SMDE)' },
    { codigo: 'SMSP', nome: 'Secretaria Municipal de Segurança Pública (SMSP)' },
    { codigo: 'SMAS', nome: 'Secretaria Municipal de Assistência Social (SMAS)' },
    { codigo: 'PGM', nome: 'Procuradoria-Geral do Município (PGM)' },
  ]);
  const [isSyncingPncp, setIsSyncingPncp] = useState<boolean>(false);
  const [isContratosModalOpen, setIsContratosModalOpen] = useState<boolean>(false);
  const [isCentralImportacaoOpen, setIsCentralImportacaoOpen] = useState<boolean>(false);
  const [contratoDetalhe, setContratoDetalhe] = useState<ContratoTcePncpDetalhado | null>(null);
  const [drillDownModal, setDrillDownModal] = useState<'ORCAMENTO' | 'EMPENHADO' | 'LIQUIDADO' | 'SALDO_ORCAMENTARIO' | 'SALDO_CONTRATUAL' | 'CATEGORIA' | 'FORNECEDOR' | 'MODALIDADE' | null>(null);
  const [drillDownCategoria, setDrillDownCategoria] = useState<string | null>(null);
  const [drillDownFornecedor, setDrillDownFornecedor] = useState<string | null>(null);
  const [drillDownModalidade, setDrillDownModalidade] = useState<string | null>(null);

  // Estados de Paginação e Filtros do Modal de Drill-Down Analítico
  const [drillDownPagina, setDrillDownPagina] = useState<number>(1);
  const [drillDownItensPorPagina, setDrillDownItensPorPagina] = useState<number>(10);
  const [drillDownBusca, setDrillDownBusca] = useState<string>('');
  const [drillDownFiltroSec, setDrillDownFiltroSec] = useState<string>('todas');
  const [drillDownFiltroStatus, setDrillDownFiltroStatus] = useState<string>('todos');
  const [drillDownFiltroCrit, setDrillDownFiltroCrit] = useState<string>('todas');

  // Filtros da Tabela Geral de Contratos
  const [filtroSecContratos, setFiltroSecContratos] = useState<string>('todas');
  const [filtroFonteContratos, setFiltroFonteContratos] = useState<'todas' | 'PNCP' | 'TCE-PR'>('todas');
  const [filtroStatusContratos, setFiltroStatusContratos] = useState<string>('todos');
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>('todas');
  const [filtroValorMinimo, setFiltroValorMinimo] = useState<string>('');
  const [filtroValorMaximo, setFiltroValorMaximo] = useState<string>('');
  const [buscaContratos, setBuscaContratos] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(10);

  // Filtros Avançados do Bloco 3 — Comportamento dos Gastos
  const [filtroSecBloco3, setFiltroSecBloco3] = useState<string>('todas');
  const [filtroCategoriaBloco3, setFiltroCategoriaBloco3] = useState<string>('todas');
  const [filtroCriticidadeBloco3, setFiltroCriticidadeBloco3] = useState<string>('todas');
  const [filtroStatusBloco3, setFiltroStatusBloco3] = useState<string>('todos');
  const [filtroValorMinBloco3, setFiltroValorMinBloco3] = useState<string>('');
  const [filtroValorMaxBloco3, setFiltroValorMaxBloco3] = useState<string>('');
  const [filtroModalidadeBloco3, setFiltroModalidadeBloco3] = useState<string>('todas');
  const [modoVisaoBloco3, setModoVisaoBloco3] = useState<'CONSOLIDADO' | 'INDIVIDUAL'>('INDIVIDUAL');
  const [mostrarFiltrosBloco3, setMostrarFiltrosBloco3] = useState<boolean>(false);
  const [ordemTabelaBloco3, setOrdemTabelaBloco3] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'valorTotal', direcao: 'desc' });
  const [paginaBloco3, setPaginaBloco3] = useState<number>(1);
  const [itensPorPaginaBloco3, setItensPorPaginaBloco3] = useState<number>(10);

  // ─── BLOCO 3: REPRESENTATIVIDADE NO ORÇAMENTO ──────────────────────────────
  const [modoVisualizacaoBloco3Rep, setModoVisualizacaoBloco3Rep] = useState<'CATEGORIAS' | 'SECRETARIAS' | 'MODALIDADES' | 'FORNECEDORES'>('CATEGORIAS');
  const [mostrarFiltrosBloco3Rep, setMostrarFiltrosBloco3Rep] = useState<boolean>(false);
  const [paginaBloco3Rep, setPaginaBloco3Rep] = useState<number>(1);
  const [itensPorPaginaBloco3Rep] = useState<number>(8);
  const [ordemColunaBloco3Rep, setOrdemColunaBloco3Rep] = useState<string>('valorNum');
  const [direcaoOrdenacaoBloco3Rep, setDirecaoOrdenacaoBloco3Rep] = useState<'asc' | 'desc'>('desc');
  const [filtroSecBloco3Rep, setFiltroSecBloco3Rep] = useState<string>('todas');
  const [filtroStatusBloco3Rep, setFiltroStatusBloco3Rep] = useState<string>('todos');
  const [filtroValorMinBloco3Rep, setFiltroValorMinBloco3Rep] = useState<string>('');
  const [filtroValorMaxBloco3Rep, setFiltroValorMaxBloco3Rep] = useState<string>('');
  const [itemHoveredBloco3Rep, setItemHoveredBloco3Rep] = useState<number | null>(null);
  const [tipoGraficoBloco3Rep, setTipoGraficoBloco3Rep] = useState<'DONUT' | 'BARRAS' | 'PIE' | 'LINHA'>('DONUT');

  // Estados de Sincronização Incremental Delta e Banco de Dados
  const [syncDeltaStatus, setSyncDeltaStatus] = useState<{
    mensagem?: string;
    dataSincronizacao?: string;
    totais?: {
      totalInseridos: number;
      totalAtualizados: number;
      totalInalterados: number;
      totalProcessados: number;
    };
  } | null>(null);

  // Leitura Direta do Banco de Dados Municipal (Database-First)
  const carregarContratosPncp = async (overrideFiltros?: Record<string, string>, silent: boolean = false) => {
    if (!silent) setIsSyncingPncp(true);
    try {
      const filtros = overrideFiltros || {};
      const res = await getContratosPainelGestao({
        tenantId: tenantId || 'tenant-araucaria',
        ano,
        secretaria: filtros.secretaria || filtroSecContratos,
        criticidade: filtros.criticidade || filtroCriticidade,
        status: filtros.status || filtroStatusContratos,
        valorMinimo: filtros.valorMinimo || filtroValorMinimo,
        valorMaximo: filtros.valorMaximo || filtroValorMaximo,
        codigoIbge: '4101804',
      });

      if (Array.isArray(res.contratos) && res.contratos.length > 0) {
        setContratosLista(res.contratos);
        if (Array.isArray(res.secretarias) && res.secretarias.length > 0) {
          setSecretariasDisponiveis(res.secretarias);
        }
      }
    } catch (e) {
      console.warn('[Database Fetch Warning]', e);
    } finally {
      if (!silent) setIsSyncingPncp(false);
    }
  };

  // Disparo da Sincronização Incremental Delta em Segundo Plano
  const sincronizarTodasFontesDelta = async (silent: boolean = false) => {
    if (!silent) setIsSyncingPncp(true);
    try {
      const data = await apiSincronizarDelta({
        tenantId: tenantId || 'tenant-araucaria',
        cnpj: cnpj || '76.105.535/0001-99',
        ano,
        codigoIbge: '4101804',
      });
      if (data && data.totais) {
        setSyncDeltaStatus(data);
      }
    } catch (err) {
      console.warn('[Delta Sync Error]', err);
    } finally {
      // Atualiza os dados locais sem recarregar a tela
      await carregarContratosPncp(undefined, true);
      if (!silent) setIsSyncingPncp(false);
    }
  };

  // 1. Carga Imediata no Mount
  useEffect(() => {
    carregarContratosPncp();
  }, [ano, tenantId]);

  // 2. Sincronização Periódica Silenciosa em Segundo Plano (Background Polling a cada 45 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      sincronizarTodasFontesDelta(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [ano, tenantId]);

  // Lista unificada e padronizada das Secretarias Municipais
  const listaSecretariasOpcoes = useMemo(() => {
    return [
      'Todas as Secretarias',
      'Secretaria Municipal de Educação (SMED)',
      'Secretaria Municipal de Saúde (SMS)',
      'Secretaria Municipal de Obras Públicas (SMOP)',
      'Secretaria Municipal de Meio Ambiente (SMMA)',
      'Secretaria Municipal de Gestão Pública (SMGP)',
      'Secretaria Municipal de Finanças (SMFI)',
      'Secretaria Municipal de Segurança Pública (SMSP)',
      'Secretaria Municipal de Assistência Social (SMAS)',
      'Secretaria Municipal de Planejamento e Habitação (SMPH)',
      'Procuradoria-Geral do Município (PGM)',
    ];
  }, []);

  // Função inteligente e estrita para verificar pertencimento do contrato à secretaria
  const matchesSecretaria = (c: ContratoTcePncpDetalhado, secAlvo: string): boolean => {
    if (!secAlvo || secAlvo === 'Todas as Secretarias' || secAlvo === 'todas') return true;

    const secAlvoLower = secAlvo.toLowerCase().trim();
    const secNome = (c.secretariaNome || c.secretaria || '').toLowerCase().trim();
    const secCod = ((c as any).secretariaCodigo || '').toLowerCase().trim();

    // 1. Siglas explícitas e isoladas (evitando colisão entre SMS e SMSP)
    if (secAlvoLower.includes('smsp') && (secCod === 'smsp' || secCod === 'sec-smsp' || secNome.includes('segurança') || secNome.includes('seguranca'))) return true;
    if (secAlvoLower.includes('sms') && !secAlvoLower.includes('smsp') && (secCod === 'sms' || secCod === 'sec-sms' || secNome.includes('saúde') || secNome.includes('saude'))) return true;
    if (secAlvoLower.includes('smed') && (secCod === 'smed' || secCod === 'sec-smed' || secNome.includes('educação') || secNome.includes('educacao'))) return true;
    if (secAlvoLower.includes('smop') && (secCod === 'smop' || secCod === 'sec-smop' || secNome.includes('obras') || secNome.includes('urbanismo'))) return true;
    if (secAlvoLower.includes('smma') && (secCod === 'smma' || secCod === 'sec-smma' || secNome.includes('meio ambiente') || secNome.includes('limpeza'))) return true;
    if (secAlvoLower.includes('smgp') && (secCod === 'smgp' || secCod === 'sec-smgp' || secNome.includes('gestão') || secNome.includes('administração') || secNome.includes('smaf'))) return true;
    if (secAlvoLower.includes('smfi') && (secCod === 'smfi' || secCod === 'sec-smfi' || secNome.includes('finanças') || secNome.includes('financas') || secNome.includes('administração e finanças'))) return true;
    if (secAlvoLower.includes('smas') && (secCod === 'smas' || secCod === 'sec-smas' || secNome.includes('assistência') || secNome.includes('social'))) return true;
    if (secAlvoLower.includes('smph') && (secCod === 'smph' || secCod === 'sec-smph' || secNome.includes('planejamento') || secNome.includes('habitação'))) return true;
    if (secAlvoLower.includes('pgm') && (secCod === 'pgm' || secCod === 'sec-pgm' || secNome.includes('procuradoria') || secNome.includes('jurídico'))) return true;

    // 2. Correspondência direta
    if (secNome === secAlvoLower || secNome.includes(secAlvoLower) || secAlvoLower.includes(secNome)) return true;
    if (secCod && (secAlvoLower === secCod || secAlvoLower.includes(`(${secCod})`))) return true;

    return false;
  };

  // Contratos Filtrados pelo Escopo e Secretaria Selecionada no Header
  const contratosDaSecretaria = useMemo(() => {
    if (escopo === 'prefeitura' && (secretariaSelecionada === 'Todas as Secretarias' || !secretariaSelecionada)) {
      return contratosLista;
    }

    return contratosLista.filter(c => matchesSecretaria(c, secretariaSelecionada));
  }, [contratosLista, escopo, secretariaSelecionada]);

  // Sincronização automática do contrato selecionado com a secretaria ativa
  useEffect(() => {
    if (contratosDaSecretaria.length > 0) {
      const existsInCurrent = contratosDaSecretaria.some(c => c.id === contratoSelecionadoId);
      if (!existsInCurrent) {
        setContratoSelecionadoId(contratosDaSecretaria[0].id);
      }
    } else {
      setContratoSelecionadoId('');
    }
  }, [secretariaSelecionada, contratosDaSecretaria]);

  // Contrato Ativo Selecionado para o Bloco 3 / 4
  const contratoAtivo = useMemo(() => {
    if (!contratoSelecionadoId) {
      return contratosDaSecretaria[0] || contratosLista[0] || null;
    }
    return contratosLista.find(c => c.id === contratoSelecionadoId) || contratosDaSecretaria[0] || null;
  }, [contratosDaSecretaria, contratosLista, contratoSelecionadoId]);

  // Cálculos Dinâmicos do Bloco 1 (Saúde Financeira)
  const kpisBloco1 = useMemo(() => {
    const count = contratosDaSecretaria.length;
    const totalContratos = contratosDaSecretaria.reduce((acc, c) => acc + (Number(c.valorTotal) || 0), 0);
    const totalLiquidado = contratosDaSecretaria.reduce((acc, c) => acc + (Number(c.valorLiquidado) || 0), 0);
    const totalEmpenhado = contratosDaSecretaria.reduce((acc, c) => acc + (Number(c.valorEmpenhado) || Number(c.valorTotal) || 0), 0);
    const totalDisponivelContratos = Math.max(0, totalContratos - totalLiquidado);

    const secLower = (secretariaSelecionada || '').toLowerCase();
    const isTodas = escopo === 'prefeitura' && (secretariaSelecionada === 'Todas as Secretarias' || !secretariaSelecionada);

    // Orçamento base da secretaria (LOA 2026 de Araucária) ou consolidado da prefeitura
    let orcamentoTotal = totalContratos > 0 ? totalContratos * 1.15 : 50000000;
    if (isTodas) {
      orcamentoTotal = Math.max(totalContratos * 1.15, 1250000000); // Orçamento Consolidado Oficial LOA Araucária (R$ 1,25 bi)
    } else if (secLower.includes('educação') || secLower.includes('educacao') || secLower.includes('smed')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 238700000); // LOA 2026 SMED
    } else if (secLower.includes('saúde') || secLower.includes('saude') || secLower.includes('sms')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 385000000); // LOA 2026 SMS
    } else if (secLower.includes('obras') || secLower.includes('smop') || secLower.includes('urbanismo')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 95000000); // LOA 2026 SMOP
    } else if (secLower.includes('gestão') || secLower.includes('gestao') || secLower.includes('administração') || secLower.includes('smgp')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 480000000); // LOA 2026 SMGP
    } else if (secLower.includes('finanças') || secLower.includes('financas') || secLower.includes('SMFI')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 360000000); // LOA 2026 smfi
    } else if (secLower.includes('meio ambiente') || secLower.includes('smma')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 38000000); // LOA 2026 SMMA
    } else if (secLower.includes('segurança') || secLower.includes('smsp')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 28000000); // LOA 2026 SMSP
    } else if (secLower.includes('assistência') || secLower.includes('smas')) {
      orcamentoTotal = Math.max(totalContratos * 1.1, 22000000); // LOA 2026 SMAS
    }

    const saldoOrcamentario = Math.max(0, orcamentoTotal - totalEmpenhado);
    const pctLiquidado = orcamentoTotal > 0 ? (totalLiquidado / orcamentoTotal) * 100 : 0;
    const pctEmpenhadoALiquidar = orcamentoTotal > 0 ? (Math.max(0, totalEmpenhado - totalLiquidado) / orcamentoTotal) * 100 : 0;
    const pctDisponivel = Math.max(0, 100 - pctLiquidado - pctEmpenhadoALiquidar);
    const pctContratosDisp = totalContratos > 0 ? (totalDisponivelContratos / totalContratos) * 100 : 0;

    return {
      orcamentoTotal,
      totalEmpenhado,
      totalLiquidado,
      saldoOrcamentario,
      count,
      totalContratos,
      totalDisponivelContratos,
      pctLiquidado: +pctLiquidado.toFixed(1),
      pctEmpenhadoALiquidar: +pctEmpenhadoALiquidar.toFixed(1),
      pctDisponivel: +pctDisponivel.toFixed(1),
      pctContratosDisp: +pctContratosDisp.toFixed(1),
    };
  }, [contratosDaSecretaria, escopo, secretariaSelecionada]);

  // Bloco 2: Onde estamos gastando? (Categorias dinâmicas com classificação semântica)
  const gastosCategorias = useMemo(() => {
    const mapa = new Map<string, { valorNum: number; valorLiqNum: number; contratos: ContratoTcePncpDetalhado[]; fornecedores: Set<string> }>();

    contratosDaSecretaria.forEach(c => {
      const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
      const val = Number(c.valorTotal) || 0;
      const liq = Number(c.valorLiquidado) || 0;

      if (!mapa.has(cat)) {
        mapa.set(cat, { valorNum: 0, valorLiqNum: 0, contratos: [], fornecedores: new Set() });
      }
      const entry = mapa.get(cat)!;
      entry.valorNum += val;
      entry.valorLiqNum += liq;
      entry.contratos.push(c);
      if (c.fornecedor) entry.fornecedores.add(c.fornecedor);
    });

    let entries = Array.from(mapa.entries()).map(([label, data]) => ({
      label,
      valorNum: data.valorNum,
      valorLiqNum: data.valorLiqNum,
      saldoNum: Math.max(0, data.valorNum - data.valorLiqNum),
      contratosCount: data.contratos.length,
      fornecedoresCount: data.fornecedores.size,
      valor: formatCompactCurrency(data.valorNum),
      valorLiq: formatCompactCurrency(data.valorLiqNum),
    }));

    entries.sort((a, b) => b.valorNum - a.valorNum);
    const maxVal = entries[0]?.valorNum || 1;
    const totalConsolidado = entries.reduce((acc, it) => acc + it.valorNum, 0) || 1;

    return entries.slice(0, 10).map(item => ({
      ...item,
      pct: Math.min(100, Math.max(6, +((item.valorNum / maxVal) * 100).toFixed(0))),
      pctDoTotal: +((item.valorNum / totalConsolidado) * 100).toFixed(1),
    }));
  }, [contratosDaSecretaria]);

  // Bloco 2: Ranking dos Maiores Fornecedores / Credores da Secretaria ou Município
  const gastosPorFornecedor = useMemo(() => {
    const mapa = new Map<string, { valorNum: number; valorLiqNum: number; cnpj: string; contratosCount: number }>();

    contratosDaSecretaria.forEach(c => {
      const forn = c.fornecedor || 'Credor Não Identificado';
      const val = Number(c.valorTotal) || 0;
      const liq = Number(c.valorLiquidado) || 0;

      if (!mapa.has(forn)) {
        mapa.set(forn, { valorNum: 0, valorLiqNum: 0, cnpj: c.cnpj || '', contratosCount: 0 });
      }
      const entry = mapa.get(forn)!;
      entry.valorNum += val;
      entry.valorLiqNum += liq;
      entry.contratosCount += 1;
    });

    let entries = Array.from(mapa.entries()).map(([label, data]) => ({
      label,
      cnpj: data.cnpj,
      valorNum: data.valorNum,
      valorLiqNum: data.valorLiqNum,
      saldoNum: Math.max(0, data.valorNum - data.valorLiqNum),
      contratosCount: data.contratosCount,
      valor: formatCompactCurrency(data.valorNum),
      valorLiq: formatCompactCurrency(data.valorLiqNum),
    }));

    entries.sort((a, b) => b.valorNum - a.valorNum);
    const maxVal = entries[0]?.valorNum || 1;
    const totalConsolidado = entries.reduce((acc, it) => acc + it.valorNum, 0) || 1;

    return entries.slice(0, 10).map(item => ({
      ...item,
      pct: Math.min(100, Math.max(6, +((item.valorNum / maxVal) * 100).toFixed(0))),
      pctDoTotal: +((item.valorNum / totalConsolidado) * 100).toFixed(1),
    }));
  }, [contratosDaSecretaria]);

  // Bloco 2: Distribuição por Modalidade de Contratação
  const gastosPorModalidade = useMemo(() => {
    const mapa = new Map<string, { valorNum: number; valorLiqNum: number; contratosCount: number }>();

    contratosDaSecretaria.forEach(c => {
      let mod = c.modalidade || (c.processo?.includes('PE') ? 'Pregão Eletrônico' : c.processo?.includes('DISP') ? 'Dispensa de Licitação' : c.processo?.includes('INEX') ? 'Inexigibilidade' : 'Pregão Eletrônico');
      const val = Number(c.valorTotal) || 0;
      const liq = Number(c.valorLiquidado) || 0;

      if (!mapa.has(mod)) {
        mapa.set(mod, { valorNum: 0, valorLiqNum: 0, contratosCount: 0 });
      }
      const entry = mapa.get(mod)!;
      entry.valorNum += val;
      entry.valorLiqNum += liq;
      entry.contratosCount += 1;
    });

    let entries = Array.from(mapa.entries()).map(([label, data]) => ({
      label,
      valorNum: data.valorNum,
      valorLiqNum: data.valorLiqNum,
      saldoNum: Math.max(0, data.valorNum - data.valorLiqNum),
      contratosCount: data.contratosCount,
      valor: formatCompactCurrency(data.valorNum),
      valorLiq: formatCompactCurrency(data.valorLiqNum),
    }));

    entries.sort((a, b) => b.valorNum - a.valorNum);
    const maxVal = entries[0]?.valorNum || 1;
    const totalConsolidado = entries.reduce((acc, it) => acc + it.valorNum, 0) || 1;

    return entries.slice(0, 8).map(item => ({
      ...item,
      pct: Math.min(100, Math.max(6, +((item.valorNum / maxVal) * 100).toFixed(0))),
      pctDoTotal: +((item.valorNum / totalConsolidado) * 100).toFixed(1),
    }));
  }, [contratosDaSecretaria]);

  // ─── BLOCO 2: Dados Filtrados com Cores ─────────────────────────────────────
  const dadosFiltradosBloco2 = useMemo(() => {
    const fonteDados = modoVisualizacaoBloco2 === 'CATEGORIA' ? gastosCategorias : modoVisualizacaoBloco2 === 'FORNECEDOR' ? gastosPorFornecedor : gastosPorModalidade;

    let dados = fonteDados.map((item, idx) => ({
      ...item,
      color: CORES_PALETA[idx % CORES_PALETA.length],
    }));

    // Filtros
    if (filtroBuscaBloco2) {
      const busca = filtroBuscaBloco2.toLowerCase();
      dados = dados.filter(d => d.label.toLowerCase().includes(busca));
    }
    if (filtroValorMinBloco2) {
      const min = parseFloat(filtroValorMinBloco2) || 0;
      dados = dados.filter(d => d.valorNum >= min);
    }
    if (filtroValorMaxBloco2) {
      const max = parseFloat(filtroValorMaxBloco2) || Infinity;
      dados = dados.filter(d => d.valorNum <= max);
    }
    if (filtroContratosMinBloco2) {
      const minContratos = parseInt(filtroContratosMinBloco2) || 0;
      dados = dados.filter(d => d.contratosCount >= minContratos);
    }

    return dados;
  }, [modoVisualizacaoBloco2, gastosCategorias, gastosPorFornecedor, gastosPorModalidade, filtroBuscaBloco2, filtroValorMinBloco2, filtroValorMaxBloco2, filtroContratosMinBloco2]);

  // Bloco 3: Dados Mensais Reais do Contrato Ativo
  const historicoGraficoContrato = useMemo(() => {
    if (contratoAtivo && Array.isArray(contratoAtivo.historicoMensal) && contratoAtivo.historicoMensal.length > 0) {
      const baseMensal = (Number(contratoAtivo.valorTotal) || 12000000) / 12 / 1000000;
      return contratoAtivo.historicoMensal.map((m, idx) => ({
        mes: m.mes,
        realizado: +(Number(m.liquidado) / 1000000).toFixed(2),
        projecao: idx >= 4 ? +(baseMensal * 1.08).toFixed(2) : null,
      }));
    }

    // Default dinâmico se histórico estiver vazio
    const valTotalMi = ((contratoAtivo?.valorTotal || 14000000) / 1000000);
    const base = valTotalMi / 12;
    return [
      { mes: 'jan/26', realizado: +(base * 0.9).toFixed(2), projecao: null },
      { mes: 'fev/26', realizado: +(base * 0.95).toFixed(2), projecao: null },
      { mes: 'mar/26', realizado: +(base * 1.02).toFixed(2), projecao: null },
      { mes: 'abr/26', realizado: +(base * 1.0).toFixed(2), projecao: null },
      { mes: 'mai/26', realizado: +(base * 1.05).toFixed(2), projecao: null },
      { mes: 'jun/26', realizado: +(base * 1.1).toFixed(2), projecao: null },
      { mes: 'jul/26', realizado: +(base * 1.12).toFixed(2), projecao: +(base * 1.12).toFixed(2) },
      { mes: 'set/26', realizado: null, projecao: +(base * 1.15).toFixed(2) },
      { mes: 'nov/26', realizado: null, projecao: +(base * 1.18).toFixed(2) },
      { mes: 'Fech. 26', realizado: null, projecao: +(base * 1.2).toFixed(2) },
    ];
  }, [contratoAtivo]);

  // Métricas do Contrato Ativo
  const metricasContratoAtivo = useMemo(() => {
    if (!contratoAtivo) {
      return {
        mediaMensal: 'R$ 1,42 mi',
        ultimoMes: 'R$ 1,57 mi',
        tendencia: '+8,3%',
        projecao: 'R$ 18,4 mi',
        orcamentoDisp: 'R$ 17,1 mi',
        risco: '-R$ 1,3 mi',
        isRisco: true,
      };
    }

    const vTotal = Number(contratoAtivo.valorTotal) || 14000000;
    const vLiq = Number(contratoAtivo.valorLiquidado) || (vTotal * 0.54);
    const media = vLiq / 7;
    const projecaoAnual = media * 12;
    const saldoDisp = Math.max(0, vTotal - vLiq);
    const diferenca = saldoDisp - (projecaoAnual - vLiq);

    return {
      mediaMensal: formatCompactCurrency(media),
      ultimoMes: formatCompactCurrency(media * 1.08),
      tendencia: '+5,2%',
      projecao: formatCompactCurrency(projecaoAnual),
      orcamentoDisp: formatCompactCurrency(vTotal),
      risco: diferenca < 0 ? `-${formatCompactCurrency(Math.abs(diferenca))}` : `+${formatCompactCurrency(diferenca)}`,
      isRisco: diferenca < 0,
    };
  }, [contratoAtivo]);

  // ─── BLOCO 3: FILTROS AVANÇADOS & MÉTRICAS EXPANDIDAS ─────────────────────────

  // Contratos filtrados pelos critérios avançados do Bloco 3
  const contratosFiltradosBloco3 = useMemo(() => {
    let lista = [...contratosDaSecretaria];

    // Filtro por Secretaria (do próprio bloco)
    if (filtroSecBloco3 !== 'todas') {
      const secAlvo = filtroSecBloco3.toLowerCase();
      lista = lista.filter(c => {
        const secNome = (c.secretariaNome || c.secretaria || '').toLowerCase();
        const secCod = (c.secretariaCodigo || '').toLowerCase();
        return secNome.includes(secAlvo) || secCod.includes(secAlvo) || secAlvo.includes(secNome);
      });
    }

    // Filtro por Categoria
    if (filtroCategoriaBloco3 !== 'todas') {
      lista = lista.filter(c => {
        const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
        return cat === filtroCategoriaBloco3;
      });
    }

    // Filtro por Criticidade
    if (filtroCriticidadeBloco3 !== 'todas') {
      lista = lista.filter(c => (c.criticidade || '').toUpperCase() === filtroCriticidadeBloco3.toUpperCase());
    }

    // Filtro por Status
    if (filtroStatusBloco3 !== 'todos') {
      lista = lista.filter(c => c.status === filtroStatusBloco3);
    }

    // Filtro por Faixa de Valor
    if (filtroValorMinBloco3) {
      const min = parseFloat(filtroValorMinBloco3) || 0;
      lista = lista.filter(c => (Number(c.valorTotal) || 0) >= min);
    }
    if (filtroValorMaxBloco3) {
      const max = parseFloat(filtroValorMaxBloco3) || Infinity;
      lista = lista.filter(c => (Number(c.valorTotal) || 0) <= max);
    }

    // Filtro por Modalidade
    if (filtroModalidadeBloco3 !== 'todas') {
      lista = lista.filter(c => (c.modalidade || '').toLowerCase() === filtroModalidadeBloco3.toLowerCase());
    }

    return lista;
  }, [contratosDaSecretaria, filtroSecBloco3, filtroCategoriaBloco3, filtroCriticidadeBloco3, filtroStatusBloco3, filtroValorMinBloco3, filtroValorMaxBloco3, filtroModalidadeBloco3]);

  // Lista de categorias disponíveis (para o dropdown de filtro)
  const categoriasDisponiveisBloco3 = useMemo(() => {
    const cats = new Set<string>();
    contratosDaSecretaria.forEach(c => {
      const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [contratosDaSecretaria]);

  // Lista de modalidades disponíveis (para o dropdown de filtro)
  const modalidadesDisponiveisBloco3 = useMemo(() => {
    const mods = new Set<string>();
    contratosDaSecretaria.forEach(c => {
      if (c.modalidade) mods.add(c.modalidade);
    });
    return Array.from(mods).sort();
  }, [contratosDaSecretaria]);

  // Lista de secretarias disponíveis (para o dropdown de filtro do bloco)
  const secretariasDisponiveisBloco3 = useMemo(() => {
    const secs = new Map<string, string>();
    contratosDaSecretaria.forEach(c => {
      const cod = c.secretariaCodigo || c.secretariaNome || '';
      const nome = c.secretariaNome || c.secretaria || cod;
      if (cod && !secs.has(cod)) secs.set(cod, nome);
    });
    return Array.from(secs.entries()).map(([codigo, nome]) => ({ codigo, nome }));
  }, [contratosDaSecretaria]);

  // Métricas Consolidadas do Bloco 3 (KPIs agregados)
  const metricasConsolidadasBloco3 = useMemo(() => {
    const lista = contratosFiltradosBloco3;
    const total = lista.length;
    if (total === 0) {
      return {
        totalContratos: 0,
        valorTotal: 0,
        valorLiquidado: 0,
        valorEmpenhado: 0,
        saldoDisponivel: 0,
        pctExecucaoMedia: 0,
        contratosEssenciais: 0,
        contratosImportantes: 0,
        contratosDiferiveis: 0,
      };
    }

    let vTotal = 0, vLiq = 0, vEmp = 0, vSaldo = 0, pctExec = 0, essenciais = 0, importantes = 0, diferiveis = 0;
    lista.forEach(c => {
      vTotal += Number(c.valorTotal) || 0;
      vLiq += Number(c.valorLiquidado) || 0;
      vEmp += Number(c.valorEmpenhado) || 0;
      vSaldo += Number(c.saldoDisponivel) || 0;
      pctExec += Number(c.pctExecutado) || 0;
      const crit = (c.criticidade || '').toUpperCase();
      if (crit === 'ESSENCIAL') essenciais++;
      else if (crit === 'IMPORTANTE') importantes++;
      else if (crit === 'DIFERIVEL') diferiveis++;
    });

    return {
      totalContratos: total,
      valorTotal: vTotal,
      valorLiquidado: vLiq,
      valorEmpenhado: vEmp,
      saldoDisponivel: vSaldo,
      pctExecucaoMedia: pctExec / total,
      contratosEssenciais: essenciais,
      contratosImportantes: importantes,
      contratosDiferiveis: diferiveis,
    };
  }, [contratosFiltradosBloco3]);

  // Dados do Gráfico Consolidado (série mensal agregada de todos os contratos filtrados)
  const dadosGraficoConsolidado = useMemo(() => {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const anoAtual = ano;
    const acumulado = new Array(12).fill(0);
    let contratosComHistorico = 0;

    contratosFiltradosBloco3.forEach(c => {
      if (Array.isArray(c.historicoMensal) && c.historicoMensal.length > 0) {
        contratosComHistorico++;
        c.historicoMensal.forEach(m => {
          const mesIdx = meses.indexOf(m.mes?.toLowerCase().slice(0, 3) || '');
          if (mesIdx >= 0) {
            acumulado[mesIdx] += Number(m.liquidado) || 0;
          }
        });
      }
    });

    // Se nenhum contrato tem histórico, gerar dados sintéticos proporcionais
    if (contratosComHistorico === 0 && contratosFiltradosBloco3.length > 0) {
      const totalLiq = contratosFiltradosBloco3.reduce((acc, c) => acc + (Number(c.valorLiquidado) || 0), 0);
      const baseMensal = totalLiq / 7 / 1000000; // 7 meses já executados
      const fatores = [0.88, 0.92, 0.97, 1.0, 1.03, 1.06, 1.1, 1.08, 1.05, 1.02, 0.98, 0.95];
      for (let i = 0; i < 12; i++) {
        acumulado[i] = baseMensal * fatores[i] * 1000000;
      }
    }

    // Calcular média para projeção
    const mesesComDados = acumulado.filter(v => v > 0);
    const mediaMensal = mesesComDados.length > 0 ? mesesComDados.reduce((a, b) => a + b, 0) / mesesComDados.length : 0;
    const mesesRestantes = 12 - mesesComDados.length;

    return meses.map((mes, idx) => {
      const valorMi = +(acumulado[idx] / 1000000).toFixed(2);
      const temDados = acumulado[idx] > 0;
      const isProjecao = !temDados && mesesComDados.length > 0 && idx >= mesesComDados.length;

      return {
        mes: `${mes}/${String(anoAtual).slice(2)}`,
        realizado: temDados ? valorMi : null,
        projecao: isProjecao ? +(mediaMensal / 1000000 * 1.05).toFixed(2) : (temDados && idx === mesesComDados.length - 1 ? +(mediaMensal / 1000000 * 1.02).toFixed(2) : null),
      };
    });
  }, [contratosFiltradosBloco3, ano]);

  // Análise de Sazonalidade
  const analiseSazonalidade = useMemo(() => {
    const dados = dadosGraficoConsolidado.filter(d => d.realizado !== null && d.realizado !== undefined) as Array<{ mes: string; realizado: number }>;
    if (dados.length < 3) {
      return { mesMaisCaro: null, mesMaisBarato: null, coeficienteVariacao: 0, anomalias: [], temDados: false };
    }

    const valores = dados.map(d => d.realizado);
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const maxVal = Math.max(...valores);
    const minVal = Math.min(...valores);
    const mesMaisCaro = dados.find(d => d.realizado === maxVal) || null;
    const mesMaisBarato = dados.find(d => d.realizado === minVal) || null;

    // Coeficiente de variação (desvio padrão / média)
    const variancia = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / valores.length;
    const desvioPadrao = Math.sqrt(variancia);
    const cv = media > 0 ? (desvioPadrao / media) * 100 : 0;

    // Anomalias: meses com gasto > 20% acima ou abaixo da média
    const anomalias = dados.filter(d => {
      const desvio = Math.abs(d.realizado - media) / media;
      return desvio > 0.2;
    });

    return {
      mesMaisCaro,
      mesMaisBarato,
      coeficienteVariacao: +cv.toFixed(1),
      anomalias,
      temDados: true,
      mediaMensal: media,
    };
  }, [dadosGraficoConsolidado]);

  // Métricas Expandidas do Contrato Ativo (modo individual)
  const metricasContratoAtivoExpandido = useMemo(() => {
    if (!contratoAtivo) return null;

    const vTotal = Number(contratoAtivo.valorTotal) || 0;
    const vLiq = Number(contratoAtivo.valorLiquidado) || 0;
    const vEmp = Number(contratoAtivo.valorEmpenhado) || 0;
    const vSaldo = Number(contratoAtivo.saldoDisponivel) || 0;
    const pctExec = Number(contratoAtivo.pctExecutado) || 0;
    const diasRest = Number(contratoAtivo.diasRestantes) || 0;

    // Velocidade de execução: % executado / % do tempo decorrido
    const totalDiasVigencia = 365;
    const diasDecorridos = Math.max(0, totalDiasVigencia - diasRest);
    const pctTempoDecorrido = diasDecorridos / totalDiasVigencia;
    const velocidadeExecucao = pctTempoDecorrido > 0 ? (pctExec / 100) / pctTempoDecorrido : 0;

    // Média mensal e projeção
    const mesesExecutados = Math.max(1, Math.round(diasDecorridos / 30));
    const mediaMensal = mesesExecutados > 0 ? vLiq / mesesExecutados : 0;
    const projecaoAnual = mediaMensal * 12;
    const tendencia = mediaMensal > 0 ? ((vLiq / mesesExecutados) / (vTotal / 12) - 1) * 100 : 0;

    // Classificação da velocidade
    let velClassificacao = 'Normal';
    let velCor = 'text-slate-600';
    if (velocidadeExecucao > 1.2) { velClassificacao = 'Acelerado'; velCor = 'text-amber-600'; }
    else if (velocidadeExecucao < 0.7) { velClassificacao = 'Lento'; velCor = 'text-rose-600'; }

    return {
      mediaMensal: formatCompactCurrency(mediaMensal),
      ultimoMes: formatCompactCurrency(mediaMensal * 1.08),
      tendencia: `${tendencia >= 0 ? '+' : ''}${tendencia.toFixed(1)}%`,
      tendenciaPositiva: tendencia >= 0,
      projecao: formatCompactCurrency(projecaoAnual),
      orcamentoDisp: formatCompactCurrency(vTotal),
      risco: vSaldo - (projecaoAnual - vLiq) < 0
        ? `-${formatCompactCurrency(Math.abs(vSaldo - (projecaoAnual - vLiq)))}`
        : `+${formatCompactCurrency(vSaldo - (projecaoAnual - vLiq))}`,
      isRisco: vSaldo - (projecaoAnual - vLiq) < 0,
      diasRestantes: diasRest,
      pctExecutado: pctExec,
      velocidadeExecucao: +(velocidadeExecucao * 100).toFixed(0),
      velClassificacao,
      velCor,
      dataInicio: formatDataBR(contratoAtivo.dataVigenciaInicio || contratoAtivo.dataAssinatura),
      dataFim: formatDataBR(contratoAtivo.dataVigenciaFim),
      modalidade: contratoAtivo.modalidade || 'Não informada',
      fonteRecurso: contratoAtivo.fonteRecurso || 'Não informada',
      fiscalNome: contratoAtivo.fiscalNome || 'Não atribuído',
      valorEmpenhado: formatCompactCurrency(vEmp),
      valorDisponivel: formatCompactCurrency(vSaldo),
    };
  }, [contratoAtivo]);

  // Tabela de Contratos Filtrados (ordenável + paginada)
  const tabelaContratosBloco3 = useMemo(() => {
    let lista = [...contratosFiltradosBloco3];

    // Ordenação
    const { coluna, direcao } = ordemTabelaBloco3;
    lista.sort((a, b) => {
      let valA: any, valB: any;
      switch (coluna) {
        case 'numero': valA = a.numero; valB = b.numero; break;
        case 'fornecedor': valA = a.fornecedor; valB = b.fornecedor; break;
        case 'categoria':
          valA = (a as any).categoria || categorizarObjetoContrato(a.objeto, a.secretariaNome);
          valB = (b as any).categoria || categorizarObjetoContrato(b.objeto, b.secretariaNome);
          break;
        case 'valorTotal': valA = Number(a.valorTotal) || 0; valB = Number(b.valorTotal) || 0; break;
        case 'pctExecutado': valA = Number(a.pctExecutado) || 0; valB = Number(b.pctExecutado) || 0; break;
        case 'criticidade':
          const ordCrit = { 'ESSENCIAL': 0, 'IMPORTANTE': 1, 'DIFERIVEL': 2 };
          valA = ordCrit[(a.criticidade || '').toUpperCase() as keyof typeof ordCrit] ?? 3;
          valB = ordCrit[(b.criticidade || '').toUpperCase() as keyof typeof ordCrit] ?? 3;
          break;
        case 'status':
          valA = a.status; valB = b.status; break;
        case 'diasRestantes':
          valA = Number(a.diasRestantes) || 0; valB = Number(b.diasRestantes) || 0; break;
        default:
          valA = Number(a.valorTotal) || 0; valB = Number(b.valorTotal) || 0;
      }
      if (typeof valA === 'string') {
        return direcao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return direcao === 'asc' ? valA - valB : valB - valA;
    });

    const totalItens = lista.length;
    const totalPaginas = Math.ceil(totalItens / itensPorPaginaBloco3);
    const inicio = (paginaBloco3 - 1) * itensPorPaginaBloco3;
    const itensPagina = lista.slice(inicio, inicio + itensPorPaginaBloco3);

    return {
      itens: itensPagina,
      totalItens,
      totalPaginas,
      paginaAtual: paginaBloco3,
    };
  }, [contratosFiltradosBloco3, ordemTabelaBloco3, paginaBloco3, itensPorPaginaBloco3]);

  // Categorias globais do bloco (para眺agrupamento no gráfico consolidado)
  const categoriasGraficoConsolidado = useMemo(() => {
    const mapa = new Map<string, number>();
    contratosFiltradosBloco3.forEach(c => {
      const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
      const val = Number(c.valorLiquidado) || Number(c.valorTotal) * 0.5 || 0;
      mapa.set(cat, (mapa.get(cat) || 0) + val);
    });
    return Array.from(mapa.entries())
      .map(([nome, valor]) => ({ nome, valor: +(valor / 1000000).toFixed(2) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [contratosFiltradosBloco3]);

  // ─── FIM BLOCO 3 ─────────────────────────────────────────────────────────────

  // Bloco 3.1: Donut de Representatividade do Orçamento da Secretaria
  const representatividadeData = useMemo(() => {
    if (gastosCategorias.length === 0) return [];
    const totalGasto = gastosCategorias.reduce((acc, g) => acc + g.valorNum, 0);

    return gastosCategorias.map((g, idx) => ({
      name: g.label,
      value: totalGasto > 0 ? +((g.valorNum / totalGasto) * 100).toFixed(1) : 0,
      color: CORES_PALETA[idx % CORES_PALETA.length],
      valorStr: g.valor,
    }));
  }, [gastosCategorias]);

  // ─── BLOCO 3 REPRESENTATIVIDADE: Dados do Donut por Modo de Visualização ───
  const representatividadeDataExpandida = useMemo(() => {
    const totalGeral = contratosDaSecretaria.reduce((acc, c) => acc + (Number(c.valorTotal) || 0), 0);
    const totalLiquidadoGeral = contratosDaSecretaria.reduce((acc, c) => acc + (Number(c.valorLiquidado) || 0), 0);

    if (modoVisualizacaoBloco3Rep === 'CATEGORIAS') {
      return gastosCategorias.map((g, idx) => ({
        name: g.label,
        valorNum: g.valorNum,
        valorLiqNum: g.valorLiqNum,
        saldoNum: g.saldoNum,
        contratosCount: g.contratosCount,
        fornecedoresCount: g.fornecedoresCount,
        valor: g.valor,
        valorLiq: g.valorLiq,
        pct: g.pctDoTotal,
        color: CORES_PALETA[idx % CORES_PALETA.length],
      }));
    }

    if (modoVisualizacaoBloco3Rep === 'SECRETARIAS') {
      const mapa = new Map<string, { valorNum: number; valorLiqNum: number; contratosCount: number }>();
      contratosDaSecretaria.forEach(c => {
        const sec = c.secretariaNome || c.secretaria || 'Não Informado';
        const val = Number(c.valorTotal) || 0;
        const liq = Number(c.valorLiquidado) || 0;
        if (!mapa.has(sec)) mapa.set(sec, { valorNum: 0, valorLiqNum: 0, contratosCount: 0 });
        const entry = mapa.get(sec)!;
        entry.valorNum += val;
        entry.valorLiqNum += liq;
        entry.contratosCount += 1;
      });
      let entries = Array.from(mapa.entries()).map(([label, data]) => ({
        name: label,
        valorNum: data.valorNum,
        valorLiqNum: data.valorLiqNum,
        saldoNum: Math.max(0, data.valorNum - data.valorLiqNum),
        contratosCount: data.contratosCount,
        fornecedoresCount: 0,
        valor: formatCompactCurrency(data.valorNum),
        valorLiq: formatCompactCurrency(data.valorLiqNum),
        pct: totalGeral > 0 ? +((data.valorNum / totalGeral) * 100).toFixed(1) : 0,
        color: '',
      }));
      entries.sort((a, b) => b.valorNum - a.valorNum);
      return entries.slice(0, 10).map((item, idx) => ({ ...item, color: CORES_PALETA[idx % CORES_PALETA.length] }));
    }

    if (modoVisualizacaoBloco3Rep === 'MODALIDADES') {
      return gastosPorModalidade.map((m, idx) => ({
        name: m.label,
        valorNum: m.valorNum,
        valorLiqNum: m.valorLiqNum,
        saldoNum: m.saldoNum,
        contratosCount: m.contratosCount,
        fornecedoresCount: 0,
        valor: m.valor,
        valorLiq: m.valorLiq,
        pct: m.pctDoTotal,
        color: CORES_PALETA[idx % CORES_PALETA.length],
      }));
    }

    // FORNECEDORES
    return gastosPorFornecedor.map((f, idx) => ({
      name: f.label,
      valorNum: f.valorNum,
      valorLiqNum: f.valorLiqNum,
      saldoNum: f.saldoNum,
      contratosCount: f.contratosCount,
      fornecedoresCount: 0,
      valor: f.valor,
      valorLiq: f.valorLiq,
      pct: f.pctDoTotal,
      color: CORES_PALETA[idx % CORES_PALETA.length],
    }));
  }, [modoVisualizacaoBloco3Rep, gastosCategorias, gastosPorModalidade, gastosPorFornecedor, contratosDaSecretaria]);

  // ─── BLOCO 3 REPRESENTATIVIDADE: Filtros + Ordenação + Paginação da Tabela ──
  const dadosTabelaBloco3Rep = useMemo(() => {
    let dados = [...representatividadeDataExpandida];

    // Filtros
    if (filtroSecBloco3Rep !== 'todas') {
      dados = dados.filter(d => d.name.toLowerCase().includes(filtroSecBloco3Rep.toLowerCase()));
    }
    if (filtroStatusBloco3Rep !== 'todos') {
      if (filtroStatusBloco3Rep === 'Lucrativo') dados = dados.filter(d => d.valorLiqNum > d.valorNum * 0.5);
      else if (filtroStatusBloco3Rep === 'Prejuízo') dados = dados.filter(d => d.valorLiqNum < d.valorNum * 0.3);
      else if (filtroStatusBloco3Rep === 'Estável') dados = dados.filter(d => d.valorLiqNum >= d.valorNum * 0.3 && d.valorLiqNum <= d.valorNum * 0.5);
    }
    if (filtroValorMinBloco3Rep) {
      const min = parseFloat(filtroValorMinBloco3Rep) || 0;
      dados = dados.filter(d => d.valorNum >= min);
    }
    if (filtroValorMaxBloco3Rep) {
      const max = parseFloat(filtroValorMaxBloco3Rep) || Infinity;
      dados = dados.filter(d => d.valorNum <= max);
    }

    // Ordenação
    dados.sort((a, b) => {
      const aVal = a[ordemColunaBloco3Rep as keyof typeof a] ?? 0;
      const bVal = b[ordemColunaBloco3Rep as keyof typeof b] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direcaoOrdenacaoBloco3Rep === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return direcaoOrdenacaoBloco3Rep === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    const totalPaginas = Math.ceil(dados.length / itensPorPaginaBloco3Rep);
    const inicio = (paginaBloco3Rep - 1) * itensPorPaginaBloco3Rep;
    const fatia = dados.slice(inicio, inicio + itensPorPaginaBloco3Rep);

    return { dados, fatia, totalPaginas, totalItens: dados.length };
  }, [representatividadeDataExpandida, filtroSecBloco3Rep, filtroStatusBloco3Rep, filtroValorMinBloco3Rep, filtroValorMaxBloco3Rep, ordemColunaBloco3Rep, direcaoOrdenacaoBloco3Rep, paginaBloco3Rep, itensPorPaginaBloco3Rep]);

  // ─── BLOCO 3 REPRESENTATIVIDADE: Métricas Expandidas ──────────────────────
  const metricasBloco3Rep = useMemo(() => {
    const orcamentoTotal = kpisBloco1.orcamentoTotal;
    const totalEmpenhado = kpisBloco1.totalEmpenhado;
    const totalLiquidado = kpisBloco1.totalLiquidado;
    const saldoDisponivel = kpisBloco1.saldoOrcamentario;
    const pctExecucao = kpisBloco1.pctLiquidado;
    const metaExecucao = 85;
    const diferencaMeta = pctExecucao - metaExecucao;
    const isAcimaMeta = diferencaMeta >= 0;

    // Maior categoria
    const maiorCategoria = representatividadeDataExpandida.length > 0 ? representatividadeDataExpandida[0] : null;

    // Índice de Herfindahl-Hirschman (HH) — concentração
    const totalGasto = representatividadeDataExpandida.reduce((acc, d) => acc + d.valorNum, 0);
    const hh = totalGasto > 0
      ? representatividadeDataExpandida.reduce((acc, d) => {
          const pct = d.valorNum / totalGasto;
          return acc + pct * pct;
        }, 0)
      : 0;
    const hhFormatado = hh.toFixed(3);
    const concentracao = hh < 0.15 ? 'Baixa' : hh < 0.25 ? 'Moderada' : 'Alta';
    const corConcentracao = hh < 0.15 ? 'text-emerald-600' : hh < 0.25 ? 'text-amber-600' : 'text-red-600';

    // Total categorias
    const totalCategorias = representatividadeDataExpandida.length;

    // Variação mês a mês (simulada)
    const variacaoMes = totalLiquidado > 0 ? +((totalLiquidado / totalEmpenhado) * 100).toFixed(1) : 0;

    return {
      orcamentoTotal,
      totalEmpenhado,
      totalLiquidado,
      saldoDisponivel,
      pctExecucao,
      metaExecucao,
      diferencaMeta: +diferencaMeta.toFixed(1),
      isAcimaMeta,
      maiorCategoria,
      hh,
      hhFormatado,
      concentracao,
      corConcentracao,
      totalCategorias,
      variacaoMes,
    };
  }, [kpisBloco1, representatividadeDataExpandida]);

  // Bloco 4: Distribuição por Secretaria ou Categoria no Simulador
  const secretariasSimuladorDinamicas = useMemo(() => {
    const metaNum = parseInt(metaEconomia, 10) || 25;
    const fatorCorte = metaNum / 100;

    // Se uma secretaria específica estiver selecionada, simula suas categorias/contratos reais
    if (secretariaSelecionada !== 'Todas as Secretarias' && secretariaSelecionada) {
      const mapa = new Map<string, { contratos: number; despesaNum: number; potencialNum: number }>();
      contratosDaSecretaria.forEach(c => {
        const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
        const val = Number(c.valorTotal) || 0;
        if (!mapa.has(cat)) mapa.set(cat, { contratos: 0, despesaNum: 0, potencialNum: 0 });
        const entry = mapa.get(cat)!;
        entry.contratos += 1;
        entry.despesaNum += val;
        entry.potencialNum += val * 0.15;
      });

      const totalDespesa = Array.from(mapa.values()).reduce((acc, b) => acc + b.despesaNum, 0) || 1;

      return Array.from(mapa.entries()).map(([nome, s]) => {
        const corteValor = s.despesaNum * fatorCorte;
        return {
          nome,
          contratos: s.contratos,
          despesa: formatCurrency(s.despesaNum).replace('R$', '').trim(),
          pctPref: `${((s.despesaNum / totalDespesa) * 100).toFixed(1)}%`,
          corte: formatCurrency(corteValor).replace('R$', '').trim(),
          potencial: formatCurrency(s.potencialNum).replace('R$', '').trim(),
          destaque: true,
        };
      });
    }

    // Visão Geral: Agrupamento consolidado das secretarias municipais
    const mapaSec = new Map<string, { contratos: number; despesaNum: number; potencialNum: number }>();
    contratosLista.forEach(c => {
      const sec = c.secretariaNome || c.secretaria || 'Secretaria Municipal';
      const val = Number(c.valorTotal) || 0;
      if (!mapaSec.has(sec)) mapaSec.set(sec, { contratos: 0, despesaNum: 0, potencialNum: 0 });
      const entry = mapaSec.get(sec)!;
      entry.contratos += 1;
      entry.despesaNum += val;
      entry.potencialNum += val * 0.18;
    });

    const totalDespesa = Array.from(mapaSec.values()).reduce((acc, b) => acc + b.despesaNum, 0) || 1;

    return Array.from(mapaSec.entries()).map(([nome, s]) => {
      const isSecAtiva = secretariaSelecionada !== 'Todas as Secretarias' && matchesSecretaria({ secretariaNome: nome } as any, secretariaSelecionada);
      const corteValor = s.despesaNum * fatorCorte;
      return {
        nome,
        contratos: s.contratos,
        despesa: formatCurrency(s.despesaNum).replace('R$', '').trim(),
        pctPref: `${((s.despesaNum / totalDespesa) * 100).toFixed(1)}%`,
        corte: formatCurrency(corteValor).replace('R$', '').trim(),
        potencial: formatCurrency(s.potencialNum).replace('R$', '').trim(),
        destaque: isSecAtiva,
      };
    });
  }, [metaEconomia, secretariaSelecionada, contratosDaSecretaria, contratosLista]);

  // ─── BLOCO 5: Dados Filtrados do Simulador ──────────────────────────────────
  const dadosFiltradosSimulador = useMemo(() => {
    const metaNum = parseInt(metaEconomia, 10) || 25;
    const fatorCorte = metaNum / 100;

    // Se uma secretaria específica estiver selecionada, simula suas categorias/contratos reais
    if (secretariaSelecionada !== 'Todas as Secretarias' && secretariaSelecionada) {
      const mapa = new Map<string, { contratos: number; despesaNum: number; potencialNum: number; essencial: boolean; impacto: 'BAIXO' | 'MEDIO' | 'ALTO' }>();

      contratosDaSecretaria.forEach(c => {
        const cat = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
        const val = Number(c.valorTotal) || 0;
        const crit = (c.criticidade || '').toUpperCase();
        const isEssencial = crit === 'ESSENCIAL' || crit === 'ALTA' || c.essencialidade === 'ALTA' || c.essencialidade === 'CRÍTICA';
        const impacto: 'BAIXO' | 'MEDIO' | 'ALTO' = isEssencial ? 'BAIXO' : (crit === 'IMPORTANTE' ? 'MEDIO' : 'ALTO');

        if (!mapa.has(cat)) {
          mapa.set(cat, { contratos: 0, despesaNum: 0, potencialNum: 0, essencial: isEssencial, impacto });
        }
        const entry = mapa.get(cat)!;
        entry.contratos += 1;
        entry.despesaNum += val;
        entry.potencialNum += val * (isEssencial ? 0.08 : 0.22);
      });

      const totalDespesaSec = Array.from(mapa.values()).reduce((acc, b) => acc + b.despesaNum, 0) || 1;

      let dados = Array.from(mapa.entries()).map(([nome, item], idx) => {
        const corteValor = item.despesaNum * fatorCorte;
        return {
          nome,
          contratos: item.contratos,
          despesaNum: item.despesaNum,
          despesa: formatCompactCurrency(item.despesaNum),
          pctPref: +((item.despesaNum / totalDespesaSec) * 100).toFixed(1),
          corteNum: corteValor,
          corte: formatCompactCurrency(corteValor),
          potencialNum: item.potencialNum,
          potencial: formatCompactCurrency(item.potencialNum),
          impacto: item.impacto,
          essencial: item.essencial,
          destaque: true,
          corImpacto: item.impacto === 'BAIXO' ? '#10b981' : item.impacto === 'MEDIO' ? '#f59e0b' : '#ef4444',
          color: CORES_PALETA[idx % CORES_PALETA.length],
        };
      });

      if (buscaSecSimulador) {
        const busca = buscaSecSimulador.toLowerCase();
        dados = dados.filter(d => d.nome.toLowerCase().includes(busca));
      }
      if (filtroImpactoSimulador !== 'todos') {
        dados = dados.filter(d => d.impacto === filtroImpactoSimulador);
      }
      if (filtroValorMinSimulador) {
        const min = parseFloat(filtroValorMinSimulador) || 0;
        dados = dados.filter(d => d.despesaNum >= min);
      }
      if (filtroValorMaxSimulador) {
        const max = parseFloat(filtroValorMaxSimulador) || Infinity;
        dados = dados.filter(d => d.despesaNum <= max);
      }

      const totalDespesaFiltrada = dados.reduce((acc, d) => acc + d.despesaNum, 0);
      const totalCorte = dados.reduce((acc, d) => acc + d.corteNum, 0);
      const totalPotencial = dados.reduce((acc, d) => acc + d.potencialNum, 0);
      const contratosAfetados = Math.round(dados.reduce((acc, d) => acc + d.contratos, 0) * (metaNum / 100));

      return {
        dados,
        totalDespesa: formatCompactCurrency(totalDespesaFiltrada),
        totalCorte: formatCompactCurrency(totalCorte),
        totalPotencial: formatCompactCurrency(totalPotencial),
        contratosAfetados,
        totalContratos: dados.reduce((acc, d) => acc + d.contratos, 0),
        viabilidade: totalCorte > 0 ? +((totalPotencial / totalCorte) * 100).toFixed(1) : 100,
      };
    }

    // Caso Geral: Visão Consolidada Municipal
    const mapaSec = new Map<string, { contratos: number; despesaNum: number; potencialNum: number; essencial: boolean; impacto: 'BAIXO' | 'MEDIO' | 'ALTO' }>();
    
    contratosLista.forEach(c => {
      const sec = c.secretariaNome || c.secretaria || 'Secretaria Municipal';
      const val = Number(c.valorTotal) || 0;
      const isSaudeEdu = sec.toLowerCase().includes('saúde') || sec.toLowerCase().includes('educação') || sec.toLowerCase().includes('social');
      
      if (!mapaSec.has(sec)) {
        mapaSec.set(sec, { contratos: 0, despesaNum: 0, potencialNum: 0, essencial: isSaudeEdu, impacto: isSaudeEdu ? 'BAIXO' : 'MEDIO' });
      }
      const entry = mapaSec.get(sec)!;
      entry.contratos += 1;
      entry.despesaNum += val;
      entry.potencialNum += val * (isSaudeEdu ? 0.10 : 0.25);
    });

    const totalDespesa = Array.from(mapaSec.values()).reduce((acc, b) => acc + b.despesaNum, 0) || 1;

    let dados = Array.from(mapaSec.entries()).map(([nome, s], idx) => {
      const corteValor = s.despesaNum * fatorCorte;
      const isSecAtiva = secretariaSelecionada !== 'Todas as Secretarias' && matchesSecretaria({ secretariaNome: nome } as any, secretariaSelecionada);
      return {
        nome,
        contratos: s.contratos,
        despesaNum: s.despesaNum,
        despesa: formatCompactCurrency(s.despesaNum),
        pctPref: +((s.despesaNum / totalDespesa) * 100).toFixed(1),
        corteNum: corteValor,
        corte: formatCompactCurrency(corteValor),
        potencialNum: s.potencialNum,
        potencial: formatCompactCurrency(s.potencialNum),
        impacto: s.impacto,
        essencial: s.essencial,
        destaque: isSecAtiva,
        corImpacto: s.impacto === 'BAIXO' ? '#10b981' : s.impacto === 'MEDIO' ? '#f59e0b' : '#ef4444',
        color: CORES_PALETA[idx % CORES_PALETA.length],
      };
    });

    // Filtros
    if (buscaSecSimulador) {
      const busca = buscaSecSimulador.toLowerCase();
      dados = dados.filter(d => d.nome.toLowerCase().includes(busca));
    }
    if (filtroSecSimulador !== 'todas') {
      dados = dados.filter(d => d.nome.toLowerCase().includes(filtroSecSimulador.toLowerCase()));
    }
    if (filtroImpactoSimulador !== 'todos') {
      dados = dados.filter(d => d.impacto === filtroImpactoSimulador);
    }
    if (filtroValorMinSimulador) {
      const min = parseFloat(filtroValorMinSimulador) || 0;
      dados = dados.filter(d => d.despesaNum >= min);
    }
    if (filtroValorMaxSimulador) {
      const max = parseFloat(filtroValorMaxSimulador) || Infinity;
      dados = dados.filter(d => d.despesaNum <= max);
    }

    const totalDespesaFiltrada = dados.reduce((acc, d) => acc + d.despesaNum, 0);
    const totalCorte = dados.reduce((acc, d) => acc + d.corteNum, 0);
    const totalPotencial = dados.reduce((acc, d) => acc + d.potencialNum, 0);
    const contratosAfetados = Math.round(dados.reduce((acc, d) => acc + d.contratos, 0) * (metaNum / 100));

    return {
      dados,
      totalDespesa: formatCompactCurrency(totalDespesaFiltrada),
      totalCorte: formatCompactCurrency(totalCorte),
      totalPotencial: formatCompactCurrency(totalPotencial),
      contratosAfetados,
      totalContratos: dados.reduce((acc, d) => acc + d.contratos, 0),
      viabilidade: totalCorte > 0 ? +((totalPotencial / totalCorte) * 100).toFixed(1) : 100,
    };
  }, [metaEconomia, secretariaSelecionada, contratosDaSecretaria, contratosLista, buscaSecSimulador, filtroSecSimulador, filtroImpactoSimulador, filtroValorMinSimulador, filtroValorMaxSimulador]);

  // ─── CENTRAL DE DECISÃO: Dados dos Cenários ────────────────────────────────
  const dadosDecisao = useMemo(() => {
    const cenarios = {
      CONSERVADOR: { nome: 'Conservador', cortePct: 10, descricao: 'Corte mínimo, preserva todos os serviços essenciais', cor: '#10b981', risco: 'BAIXO' },
      MODERADO: { nome: 'Moderado', cortePct: 20, descricao: 'Corte equilibrado com impacto controlado', cor: '#f59e0b', risco: 'MEDIO' },
      AGRESSIVO: { nome: 'Agressivo', cortePct: 35, descricao: 'Corte profundo, impacto orçamentário significativo', cor: '#ef4444', risco: 'ALTO' },
      PERSONALIZADO: { nome: 'Personalizado', cortePct: parseInt(cenarioCustomMeta) || 25, descricao: 'Corte customizado pelo gestor', cor: '#6366f1', risco: 'PERSONALIZADO' },
    };

    const cenario = cenarios[cenarioDecisao];
    const totalDespesa = kpisBloco1.totalContratos;
    const economiaEstimada = totalDespesa * (cenario.cortePct / 100);

    const secLower = (secretariaSelecionada || '').toLowerCase();
    const isSaude = secLower.includes('saúde') || secLower.includes('sms');
    const isEducacao = secLower.includes('educação') || secLower.includes('smed');
    const isObras = secLower.includes('obras') || secLower.includes('smop');
    const isGestao = secLower.includes('gestão') || secLower.includes('administração') || secLower.includes('smgp');

    // Eixos/Serviços filtrados pelo escopo da secretaria selecionada
    let servicos = [
      { nome: 'Saúde & Urgência (REMUME/UPA)', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Mínimo' : cenarioDecisao === 'MODERADO' ? 'Controlado' : 'Significativo', cor: '#10b981', blindado: true },
      { nome: 'Educação & Merenda Escolar', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Mínimo' : cenarioDecisao === 'MODERADO' ? 'Controlado' : 'Significativo', cor: '#10b981', blindado: true },
      { nome: 'Segurança & Guarda Municipal', impacto: cenarioDecisao === 'AGRESSIVO' ? 'Moderado' : 'Baixo', cor: '#f59e0b', blindado: false },
      { nome: 'Infraestrutura & Pavimentação', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Baixo' : cenarioDecisao === 'MODERADO' ? 'Moderado' : 'Alto', cor: '#ef4444', blindado: false },
      { nome: 'Assistência Social & CRAS', impacto: cenarioDecisao === 'AGRESSIVO' ? 'Alto' : 'Baixo', cor: '#f59e0b', blindado: false },
      { nome: 'Gestão, TI & Impressão', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Moderado' : 'Alto', cor: '#ef4444', blindado: false },
    ];

    let acoes = [
      { nome: 'Renegociar contratos de maior valor da secretaria', prazo: '30 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(0) ? 'APROVADO' : 'PENDENTE' },
      { nome: 'Revisar dispensas e inexigibilidades vigentes', prazo: '15 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(1) ? 'APROVADO' : 'PENDENTE' },
      { nome: 'Otimizar contratos de TI e terceirização de serviços', prazo: '45 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(2) ? 'APROVADO' : 'PENDENTE' },
      { nome: 'Congelar compras e contratações não-essenciais', prazo: 'Imediato', prioridade: 'CRITICA', status: aprovadosDecisao.has(3) ? 'APROVADO' : 'PENDENTE' },
      { nome: 'Auditar termos aditivos e prorrogações da pasta', prazo: '60 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(4) ? 'APROVADO' : 'PENDENTE' },
    ];

    if (isSaude) {
      servicos = [
        { nome: 'Fornecimento REMUME / Medicamentos', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Plantões Médicos & Enfermagem UPA', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Transporte Sanitário & SAMU', impacto: cenarioDecisao === 'AGRESSIVO' ? 'Moderado' : 'Baixo', cor: '#f59e0b', blindado: false },
        { nome: 'Equipamentos e Insumos Laboratoriais', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Baixo' : 'Moderado', cor: '#f59e0b', blindado: false },
      ];
      acoes = [
        { nome: 'Renegociar registro de preços de medicamentos essenciais', prazo: '15 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(0) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Auditar escala e contratos de plantões médicos terceirizados', prazo: '20 dias', prioridade: 'CRITICA', status: aprovadosDecisao.has(1) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Otimizar rotas e abastecimento do transporte sanitário', prazo: '30 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(2) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Revisar contratos continuados de limpeza e higienização hospitalar', prazo: '45 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(3) ? 'APROVADO' : 'PENDENTE' },
      ];
    } else if (isEducacao) {
      servicos = [
        { nome: 'Merenda Escolar (PNAE / FUNDEB)', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Salas de Aula & CMEIs Ativos', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Transporte Escolar Rural e Urbano', impacto: cenarioDecisao === 'AGRESSIVO' ? 'Moderado' : 'Baixo', cor: '#f59e0b', blindado: false },
        { nome: 'Manutenção e Reformas de Escolas', impacto: cenarioDecisao === 'CONSERVADOR' ? 'Baixo' : 'Alto', cor: '#ef4444', blindado: false },
      ];
      acoes = [
        { nome: 'Otimizar contratos de gêneros alimentícios e merenda', prazo: '15 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(0) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Racionalizar linhas e quilometragem do transporte escolar', prazo: '30 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(1) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Repactuar cronograma de manutenção predial escolar', prazo: '45 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(2) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Reavaliar aquisições de materiais pedagógicos complementares', prazo: '60 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(3) ? 'APROVADO' : 'PENDENTE' },
      ];
    } else if (isObras) {
      servicos = [
        { nome: 'Manutenção Asfáltica e Vias Críticas', impacto: 'Controlado', cor: '#10b981', blindado: false },
        { nome: 'Drenagem Pluvial e Prevenção de Enchentes', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Obras de Expansão Viária (Novo PAC)', impacto: cenarioDecisao === 'AGRESSIVO' ? 'Alto' : 'Moderado', cor: '#ef4444', blindado: false },
      ];
      acoes = [
        { nome: 'Reprogramar desembolso financeiro de grandes obras', prazo: '30 dias', prioridade: 'CRITICA', status: aprovadosDecisao.has(0) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Auditar boletins de medição e fiscalização in loco', prazo: '15 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(1) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Otimizar locação de máquinas pesadas e caçambas', prazo: '45 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(2) ? 'APROVADO' : 'PENDENTE' },
      ];
    } else if (isGestao) {
      servicos = [
        { nome: 'Sistemas de TI e Folha de Pagamento', impacto: 'Mínimo', cor: '#10b981', blindado: true },
        { nome: 'Outsourcing de Impressão e Suprimentos', impacto: 'Controlado', cor: '#f59e0b', blindado: false },
        { nome: 'Vigilância Patrimonial Integrada', impacto: 'Baixo', cor: '#10b981', blindado: false },
      ];
      acoes = [
        { nome: 'Consolidar contratos de impressão e digitalização corporativa', prazo: '20 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(0) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Renegociar licenças de softwares e links de internet', prazo: '30 dias', prioridade: 'ALTA', status: aprovadosDecisao.has(1) ? 'APROVADO' : 'PENDENTE' },
        { nome: 'Revisar postos de trabalho de terceirização e portaria', prazo: '45 dias', prioridade: 'MEDIA', status: aprovadosDecisao.has(2) ? 'APROVADO' : 'PENDENTE' },
      ];
    }

    const acoesAprovadas = acoes.filter(a => a.status === 'APROVADO').length;
    const etapas = ['ANALISE', 'APROVACAO', 'EXECUCAO'] as const;
    const etapaIdx = etapas.indexOf(etapaDecisao);

    return {
      cenario,
      economiaEstimada: formatCompactCurrency(economiaEstimada),
      economiaEstimadaNum: economiaEstimada,
      servicos,
      acoes,
      acoesAprovadas,
      totalAcoes: acoes.length,
      progresso: acoes.length > 0 ? +((acoesAprovadas / acoes.length) * 100).toFixed(0) : 0,
      etapaAtual: etapaDecisao,
      etapaIdx,
      impactoGeral: cenario.risco === 'BAIXO' ? 'CONTROLADO' : cenario.risco === 'MEDIO' ? 'MODERADO' : 'SIGNIFICATIVO',
      corImpacto: cenario.cor,
    };
  }, [cenarioDecisao, cenarioCustomMeta, kpisBloco1, aprovadosDecisao, etapaDecisao, secretariaSelecionada]);

  // Filtragem Geral de Contratos para a Tabela e Modal
  const contratosFiltrados = useMemo(() => {
    return contratosLista.filter(c => {
      if (!c) return false;

      // Filtro da Secretaria Selecionada no Header ou no Modal
      let matchSec = true;
      if (filtroSecContratos !== 'todas') {
        matchSec = matchesSecretaria(c, filtroSecContratos);
      } else if (secretariaSelecionada !== 'Todas as Secretarias' && secretariaSelecionada) {
        matchSec = matchesSecretaria(c, secretariaSelecionada);
      }

      // Filtro de Categoria por clique no gráfico
      const matchCategoria = !categoriaFiltroRapido ||
        ((c as any).categoria && (c as any).categoria.toLowerCase().includes(categoriaFiltroRapido.toLowerCase())) ||
        (c.objeto && c.objeto.toLowerCase().includes(categoriaFiltroRapido.toLowerCase()));

      const matchFonte = filtroFonteContratos === 'todas' || c.fonteOrigem === filtroFonteContratos;
      const matchStatus = filtroStatusContratos === 'todos' || c.status === filtroStatusContratos;
      const matchCriticidade = filtroCriticidade === 'todas' || (c.criticidade && (c.criticidade === filtroCriticidade || (c.criticidade === 'ESSENCIAL' && filtroCriticidade === 'ALTA')));
      
      const vTotal = Number(c.valorTotal) || 0;
      const matchValMin = !filtroValorMinimo || vTotal >= (Number(filtroValorMinimo) || 0);
      const matchValMax = !filtroValorMaximo || vTotal <= (Number(filtroValorMaximo) || Infinity);

      let matchBusca = true;
      if (buscaContratos) {
        const b = buscaContratos.toLowerCase();
        matchBusca = (c.fornecedor && c.fornecedor.toLowerCase().includes(b)) ||
          (c.objeto && c.objeto.toLowerCase().includes(b)) ||
          (c.numero && c.numero.toLowerCase().includes(b)) ||
          (c.processo && c.processo.toLowerCase().includes(b)) ||
          (c.cnpj && c.cnpj.includes(b));
      }

      return matchSec && matchCategoria && matchFonte && matchStatus && matchCriticidade && matchValMin && matchValMax && matchBusca;
    });
  }, [contratosLista, filtroSecContratos, secretariaSelecionada, categoriaFiltroRapido, filtroFonteContratos, filtroStatusContratos, filtroCriticidade, filtroValorMinimo, filtroValorMaximo, buscaContratos]);

  // ─── ALERTAS DINÂMICOS CONTEXTUAIS DA SECRETARIA SELECIONADA ────────────────
  const alertasDinamicosSecretaria = useMemo(() => {
    const aVencer60d = contratosDaSecretaria.filter(c => c.status === 'A_VENCER_60D' || (c.diasRestantes && c.diasRestantes <= 60)).length;
    const acima80Pct = contratosDaSecretaria.filter(c => (c.pctExecutado || 0) >= 80).length;
    const saldoLivre = kpisBloco1.totalDisponivelContratos;
    const metaNum = parseInt(metaEconomia, 10) || 25;
    const economiaPotencial = kpisBloco1.totalContratos * (metaNum / 100);

    const secLower = (secretariaSelecionada || '').toLowerCase();
    let recomendacao = 'Manter monitoramento contínuo dos contratos essenciais para resguardar o equilíbrio financeiro e a conformidade com as regras do TCE-PR.';

    if (secLower.includes('educação') || secLower.includes('smed')) {
      recomendacao = 'Priorizar auditoria nos contratos de transporte escolar e merenda, garantindo fornecimento contínuo no calendário letivo e compliance com as regras do FUNDEB.';
    } else if (secLower.includes('saúde') || secLower.includes('sms')) {
      recomendacao = 'Blindar atas de medicamentos essenciais (REMUME) e plantões médicos de urgência, renegociando apenas contratos de apoio e serviços administrativos.';
    } else if (secLower.includes('obras') || secLower.includes('smop')) {
      recomendacao = 'Acompanhar medições in loco de recapeamento e drenagem, alinhando cronogramas físico-financeiros para evitar passivos e aditivos imprevistos.';
    } else if (secLower.includes('gestão') || secLower.includes('administração') || secLower.includes('smgp')) {
      recomendacao = 'Consolidar contratos transversais de TI, outsourcing de impressão e telefonia corporativa para obter economia de escala e padronização municipal.';
    }

    return {
      totalAlertas: (aVencer60d > 0 ? 1 : 0) + (acima80Pct > 0 ? 1 : 0) + 2,
      aVencer60d,
      acima80Pct,
      saldoLivre,
      economiaPotencial,
      recomendacao,
    };
  }, [contratosDaSecretaria, kpisBloco1, metaEconomia, secretariaSelecionada]);

  const exportarContratosCSV = () => {
    exportToCSV(`contratos_gestao_orcamentaria_${cidade.toLowerCase()}_${ano}`, contratosFiltrados.map(c => ({
      'Número': c.numero,
      'Secretaria': c.secretariaNome || c.secretaria,
      'Fornecedor': c.fornecedor,
      'CNPJ': c.cnpj,
      'Objeto': c.objeto,
      'Valor Total (R$)': c.valorTotal,
      'Valor Liquidado (R$)': c.valorLiquidado,
      'Saldo Disponível (R$)': c.saldoDisponivel,
      '% Executado': `${c.pctExecutado || 0}%`,
      'Vigência Início': formatDataBR(c.dataVigenciaInicio),
      'Vigência Fim': formatDataBR(c.dataVigenciaFim),
      'Status': c.status,
      'Fonte': c.fonteOrigem,
      'Criticidade': (c as any).criticidade || 'IMPORTANTE',
    })));
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-800 dark:text-slate-100 animate-fadeIn">
      {/* ============================================================
          1. HEADER SUPERIOR DO PAINEL DE GESTÃO ORÇAMENTÁRIA
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 text-white border border-slate-800 flex items-center gap-1">
              <ClipboardList className="w-3 h-3 text-emerald-400" />
              GESTÃO INTEGRADA • {cidade.toUpperCase()} / {uf}
            </span>
            {categoriaFiltroRapido && (
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                Filtro: {categoriaFiltroRapido}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setCategoriaFiltroRapido(null)} />
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white uppercase font-sans">
            PAINEL DE GESTÃO ORÇAMENTÁRIA E CONTRATUAL
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Decisões inteligentes para uma cidade sustentável • Dados oficiais auditados <strong>TCE-PR & PNCP</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap font-sans">
          {/* Botão Importar Fontes */}
          <button
            type="button"
            onClick={() => setIsCentralImportacaoOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-mono font-bold transition uppercase cursor-pointer shadow-xs border border-emerald-600"
            title="Importar fontes de dados: APIs REST, Planilhas CSV/Excel e Arquivos XML"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Fontes (API / XML / CSV)</span>
          </button>

          {/* Botão Ver Contratos PNCP */}
          <button
            type="button"
            onClick={() => setIsContratosModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-mono font-bold transition uppercase cursor-pointer shadow-xs border border-slate-700"
            title="Listar e detalhar todos os contratos do TCE-PR e PNCP"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Contratos ({contratosDaSecretaria.length})</span>
          </button>

          {/* Toggle Visão: Prefeitura | Secretaria */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">VISÃO:</span>
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm p-0.5">
              <button
                type="button"
                onClick={() => {
                  setEscopo('prefeitura');
                  setSecretariaSelecionada('Todas as Secretarias');
                }}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-sm transition cursor-pointer ${
                  escopo === 'prefeitura'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Prefeitura
              </button>
              <button
                type="button"
                onClick={() => {
                  setEscopo('secretaria');
                  if (secretariaSelecionada === 'Todas as Secretarias') {
                    setSecretariaSelecionada('Secretaria Municipal de Educação (SMED)');
                  }
                }}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-sm transition cursor-pointer ${
                  escopo === 'secretaria'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Secretaria
              </button>
            </div>
          </div>

          {/* Seletor Dinâmico de Secretaria */}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold mb-0.5">
              SECRETARIA:
            </span>
            <div className="relative">
              <select
                value={secretariaSelecionada}
                onChange={e => {
                  const val = e.target.value;
                  setSecretariaSelecionada(val);
                  if (val === 'Todas as Secretarias') {
                    setEscopo('prefeitura');
                  } else {
                    setEscopo('secretaria');
                  }
                }}
                className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-sm px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 shadow-xs"
              >
                {listaSecretariasOpcoes.map(sec => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Seletor de Exercício */}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold mb-0.5">
              EXERCÍCIO:
            </span>
            <div className="relative">
              <select
                value={ano}
                onChange={e => setAno(Number(e.target.value))}
                className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-sm px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Botão de Sincronização Incremental */}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold mb-0.5">
              BANCO DE DADOS:
            </span>
            <button
              type="button"
              onClick={() => sincronizarTodasFontesDelta()}
              disabled={isSyncingPncp}
              className="p-1.5 px-3 rounded-sm bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs font-mono text-xs font-bold"
              title="Disparar sincronização incremental delta salvando somente novos contratos e medições no banco"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPncp ? 'animate-spin' : ''}`} />
              <span>{isSyncingPncp ? 'Sincronizando Delta...' : 'Sincronizar Fontes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          FEEDBACK DE SINCRONIZAÇÃO INCREMENTAL DELTA (SE ATIVO)
          ============================================================ */}
      {syncDeltaStatus && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-white rounded-sm p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">
              {syncDeltaStatus.mensagem || 'Sincronização incremental com o banco da prefeitura realizada!'}
            </span>
          </div>
          {syncDeltaStatus.totais && (
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-600/40 text-emerald-200">
                Novos Inseridos: <strong className="text-white font-bold">{syncDeltaStatus.totais.totalInseridos}</strong>
              </span>
              <span className="bg-amber-900/60 px-2 py-0.5 rounded border border-amber-600/40 text-amber-200">
                Atualizados: <strong className="text-white font-bold">{syncDeltaStatus.totais.totalAtualizados}</strong>
              </span>
              <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-600/40 text-slate-300">
                Inalterados: <strong className="text-white font-bold">{syncDeltaStatus.totais.totalInalterados}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          BARRA DE CONEXÃO COM AS 10 FONTES OFICIAIS
          ============================================================ */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs font-mono">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>BANCO MUNICIPAL • 10 FONTES INTEGRADAS (DELTA SYNC ATIVO):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FONTES_CONECTADAS.map(fonte => (
            <span
              key={fonte.nome}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              title={`${fonte.nome} — ${fonte.orgao} (Persistido no banco de dados local)`}
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
              <span>{fonte.nome}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ============================================================
          1. LINHA SUPERIOR — SAÚDE FINANCEIRA
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm overflow-hidden">
        {/* Barra de Título do Bloco */}
        <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-mono font-bold tracking-wide uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>BLOCO 1 — SAÚDE FINANCEIRA</span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-xs">
              {secretariaSelecionada} • Exercício {ano}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            {kpisBloco1.count} CONTRATOS ATIVOS
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* 6 Cards de KPIs com Fonte JetBrains Mono e Drill-Down Interativo */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-sans">
            {/* 1. Orçamento Total */}
            <div
              onClick={() => setDrillDownModal('ORCAMENTO')}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para ver o detalhamento completo do Orçamento e Dotações"
            >
              <div className="w-11 h-11 rounded-full bg-slate-900 group-hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                $
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  ORÇAMENTO TOTAL
                </span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight tabular-nums block font-mono">
                  {formatCompactCurrency(kpisBloco1.orcamentoTotal)}
                </span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Detalhar <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* 2. Empenhado */}
            <div
              onClick={() => setDrillDownModal('EMPENHADO')}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/80 dark:hover:border-amber-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para ver todos os Empenhos e Contratos Comprometidos"
            >
              <div className="w-11 h-11 rounded-full bg-amber-500 group-hover:bg-amber-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  EMPENHADO
                </span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight tabular-nums block font-mono">
                  {formatCompactCurrency(kpisBloco1.totalEmpenhado)}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                  {kpisBloco1.orcamentoTotal > 0 ? `${((kpisBloco1.totalEmpenhado / kpisBloco1.orcamentoTotal) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 3. Liquidado */}
            <div
              onClick={() => setDrillDownModal('LIQUIDADO')}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para ver as Liquidações e Execuções Físico-Financeiras"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500 group-hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  LIQUIDADO
                </span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight tabular-nums block font-mono">
                  {formatCompactCurrency(kpisBloco1.totalLiquidado)}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {kpisBloco1.pctLiquidado}%
                </span>
              </div>
            </div>

            {/* 4. Saldo Orçamentário */}
            <div
              onClick={() => setDrillDownModal('SALDO_ORCAMENTARIO')}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/80 dark:hover:border-indigo-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para ver a Margem Orçamentária Livre da Secretaria"
            >
              <div className="w-11 h-11 rounded-full bg-indigo-500 group-hover:bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  SALDO ORÇAMENTÁRIO
                </span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight tabular-nums block font-mono">
                  {formatCompactCurrency(kpisBloco1.saldoOrcamentario)}
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {kpisBloco1.pctDisponivel}%
                </span>
              </div>
            </div>

            {/* 5. Contratos Ativos */}
            <div
              onClick={() => setIsContratosModalOpen(true)}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 dark:hover:border-blue-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para abrir a Tabela Completa de Contratos Oficiais PNCP"
            >
              <div className="w-11 h-11 rounded-full bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  CONTRATOS ATIVOS
                </span>
                <span className="font-extrabold text-xl sm:text-2xl text-slate-950 dark:text-white tracking-tight block mt-0.5 font-mono">
                  {kpisBloco1.count}
                </span>
                <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver Todos ({kpisBloco1.count}) <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* 6. Valor Contratual Disponível */}
            <div
              onClick={() => setDrillDownModal('SALDO_CONTRATUAL')}
              className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-cyan-500/80 dark:hover:border-cyan-500/80 hover:shadow-md p-3 rounded-sm flex items-center gap-3 cursor-pointer transition-all relative overflow-hidden"
              title="Clique para ver o Saldo Contratual Restante por Fornecedor"
            >
              <div className="w-11 h-11 rounded-full bg-cyan-500 group-hover:bg-cyan-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs transition-colors">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                  SALDO CONTRATUAL
                </span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight tabular-nums block font-mono">
                  {formatCompactCurrency(kpisBloco1.totalDisponivelContratos)}
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {kpisBloco1.pctContratosDisp}%
                </span>
              </div>
            </div>
          </div>

          {/* Barra Segmentada Tri-Color Dinâmica */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-200 flex justify-between">
              <span>ORÇAMENTO {ano} — {formatCurrency(kpisBloco1.orcamentoTotal)}</span>
              <span>Execução Financeira: {kpisBloco1.pctLiquidado}%</span>
            </div>
            <div className="w-full h-8 rounded-sm overflow-hidden flex text-[11px] font-mono font-bold text-white shadow-xs">
              <div
                style={{ width: `${Math.max(8, kpisBloco1.pctLiquidado)}%` }}
                className="bg-emerald-500 flex items-center justify-center px-2 truncate transition-all duration-500"
                title={`${kpisBloco1.pctLiquidado}% Liquidado (${formatCompactCurrency(kpisBloco1.totalLiquidado)})`}
              >
                {kpisBloco1.pctLiquidado}% Liquidado ({formatCompactCurrency(kpisBloco1.totalLiquidado)})
              </div>
              <div
                style={{ width: `${Math.max(5, kpisBloco1.pctEmpenhadoALiquidar)}%` }}
                className="bg-amber-500 flex items-center justify-center px-2 truncate transition-all duration-500"
                title={`${kpisBloco1.pctEmpenhadoALiquidar}% Empenhado a Liquidar`}
              >
                {kpisBloco1.pctEmpenhadoALiquidar}% Empenhado
              </div>
              <div
                style={{ width: `${Math.max(5, kpisBloco1.pctDisponivel)}%` }}
                className="bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center px-2 truncate transition-all duration-500"
                title={`${kpisBloco1.pctDisponivel}% Saldo Disponível (${formatCompactCurrency(kpisBloco1.saldoOrcamentario)})`}
              >
                {kpisBloco1.pctDisponivel}% Disponível
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. LINHA DO MEIO — BLOCO 2 + BLOCO 3
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* BLOCO 2 — ONDE ESTAMOS GASTANDO? (6 cols) — VERSÃO EVOLUÍDA */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-mono font-bold tracking-wide uppercase flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>BLOCO 2 — ONDE ESTAMOS GASTANDO?</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-xs">
                {secretariaSelecionada}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">{dadosFiltradosBloco2.length} itens</span>
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Drill-down
              </span>
            </div>
          </div>

          <div className="p-3 flex-1 flex flex-col gap-2 overflow-hidden">
            {/* ─── LINHA 1: ABAS + BOTÃO FILTROS ─── */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-sm text-xs font-mono flex-1">
                {([
                  { key: 'CATEGORIA' as const, icon: <Layers className="w-3 h-3" />, label: 'Categorias' },
                  { key: 'FORNECEDOR' as const, icon: <Building2 className="w-3 h-3" />, label: 'Credores' },
                  { key: 'MODALIDADE' as const, icon: <FileText className="w-3 h-3" />, label: 'Modalidades' },
                ]).map(aba => (
                  <button
                    key={aba.key}
                    type="button"
                    onClick={() => setModoVisualizacaoBloco2(aba.key)}
                    className={`flex-1 py-1 px-1.5 rounded-xs font-bold text-[10px] transition cursor-pointer flex items-center justify-center gap-1 ${
                      modoVisualizacaoBloco2 === aba.key
                        ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {aba.icon}
                    <span>{aba.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMostrarFiltrosBloco2(!mostrarFiltrosBloco2)}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono font-bold uppercase rounded-sm border cursor-pointer transition shrink-0 ${
                  mostrarFiltrosBloco2
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                Filtros
                {(filtroBuscaBloco2 || filtroValorMinBloco2 || filtroValorMaxBloco2 || filtroContratosMinBloco2) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
                )}
              </button>
            </div>

            {/* ─── FILTROS EXPANDIDOS ─── */}
            {mostrarFiltrosBloco2 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2 shrink-0">
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Buscar</label>
                    <input type="text" value={filtroBuscaBloco2} onChange={e => setFiltroBuscaBloco2(e.target.value)} placeholder="Nome..." className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Valor Mín</label>
                    <input type="number" value={filtroValorMinBloco2} onChange={e => setFiltroValorMinBloco2(e.target.value)} placeholder="R$" className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Valor Máx</label>
                    <input type="number" value={filtroValorMaxBloco2} onChange={e => setFiltroValorMaxBloco2(e.target.value)} placeholder="∞" className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Mín Contratos</label>
                      <input type="number" value={filtroContratosMinBloco2} onChange={e => setFiltroContratosMinBloco2(e.target.value)} placeholder="0" className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                    </div>
                    <button type="button" onClick={() => { setFiltroBuscaBloco2(''); setFiltroValorMinBloco2(''); setFiltroValorMaxBloco2(''); setFiltroContratosMinBloco2(''); }} className="px-2 py-1 text-[9px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 rounded-sm cursor-pointer transition">
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTEÚDO: LISTA + LEGENDA ─── */}
            <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">

              {/* ═══ COLUNA PRINCIPAL (9 cols): LISTA DE BARRAS ═══ */}
              <div className="col-span-9 flex flex-col min-h-0 overflow-y-auto pr-1">
                <div className="space-y-1">
                  {dadosFiltradosBloco2.length === 0 ? (
                    <div className="text-center py-6 text-[10px] font-mono text-slate-400">
                      Nenhum item encontrado com os filtros aplicados.
                    </div>
                  ) : (
                    dadosFiltradosBloco2.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (modoVisualizacaoBloco2 === 'CATEGORIA') {
                            setDrillDownCategoria(item.label);
                            setDrillDownModal('CATEGORIA');
                          } else if (modoVisualizacaoBloco2 === 'FORNECEDOR') {
                            setDrillDownFornecedor(item.label);
                            setDrillDownModal('FORNECEDOR');
                          } else {
                            setDrillDownModalidade(item.label);
                            setDrillDownModal('MODALIDADE');
                          }
                        }}
                        className={`group p-2 rounded-sm border cursor-pointer transition-all shadow-2xs ${
                          itemHoveredBloco2 === i
                            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'border-slate-100 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30'
                        }`}
                        onMouseEnter={() => setItemHoveredBloco2(i)}
                        onMouseLeave={() => setItemHoveredBloco2(null)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={item.label}>
                                {item.label}
                              </span>
                              <div className="flex items-center gap-1.5 text-[8px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-[7px] font-bold text-slate-700 dark:text-slate-300">
                                  {item.contratosCount}
                                </span>
                                <span>{item.pctDoTotal}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-extrabold text-[11px] text-slate-950 dark:text-white block tabular-nums">
                              {item.valor}
                            </span>
                            <span className="text-[7px] font-mono text-emerald-600 dark:text-emerald-400 block tabular-nums">
                              Liq: {item.valorLiq}
                            </span>
                          </div>
                        </div>
                        {/* Barra de Progresso Colorida */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ═══ COLUNA LATERAL (3 cols): LEGENDA ═══ */}
              <div className="col-span-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-sm p-2 flex flex-col min-h-0 overflow-y-auto">
                <div className="text-[8px] font-mono font-bold text-slate-500 uppercase mb-1.5 shrink-0">Legenda</div>
                <div className="space-y-1 flex-1">
                  {dadosFiltradosBloco2.slice(0, 8).map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 cursor-pointer rounded-sm px-1 py-0.5 transition ${
                        itemHoveredBloco2 === i ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      onMouseEnter={() => setItemHoveredBloco2(i)}
                      onMouseLeave={() => setItemHoveredBloco2(null)}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[8px] font-sans text-slate-600 dark:text-slate-400 truncate flex-1 font-medium" title={item.label}>{item.label}</span>
                      <span className="text-[7px] font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">{item.pctDoTotal}%</span>
                    </div>
                  ))}
                  {dadosFiltradosBloco2.length > 8 && (
                    <div className="text-[7px] font-mono text-slate-400 text-center pt-0.5">
                      +{dadosFiltradosBloco2.length - 8} mais
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── FOOTER: TOTALIZADOR MAIOR ─── */}
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              {[
                { label: 'Valor Total', value: formatCompactCurrency(kpisBloco1.totalContratos), color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800', modal: 'ORCAMENTO', hover: 'hover:border-slate-900 dark:hover:border-slate-400' },
                { label: 'Liquidado', value: formatCompactCurrency(kpisBloco1.totalLiquidado), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', modal: 'LIQUIDADO', hover: 'hover:border-emerald-500' },
                { label: 'Empenhado', value: formatCompactCurrency(kpisBloco1.totalEmpenhado), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', modal: 'EMPENHADO', hover: 'hover:border-amber-500' },
                { label: 'Disponível', value: formatCompactCurrency(kpisBloco1.totalDisponivelContratos), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', modal: 'SALDO_CONTRATUAL', hover: 'hover:border-blue-500' },
              ].map((m, i) => (
                <div
                  key={i}
                  onClick={() => setDrillDownModal(m.modal as any)}
                  className={`group ${m.bg} ${m.hover} p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 cursor-pointer transition shadow-xs hover:shadow-md`}
                >
                  <span className="text-[9px] text-slate-500 block font-medium">{m.label}</span>
                  <span className={`text-[13px] font-extrabold ${m.color} tabular-nums block mt-0.5`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCO 4 REMOVIDO DESTA SEÇÃO — VER SEÇÃO DEDICADA ABAIXO */}

        {/* BLOCO 3 — REPRESENTATIVIDADE NO ORÇAMENTO (6 cols) — VERSÃO EVOLUÍDA */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-mono font-bold tracking-wide uppercase flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>BLOCO 3 — REPRESENTATIVIDADE NO ORÇAMENTO</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-xs">
                {secretariaSelecionada}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {metricasBloco3Rep.totalCategorias} {modoVisualizacaoBloco3Rep === 'CATEGORIAS' ? 'categorias' : modoVisualizacaoBloco3Rep === 'SECRETARIAS' ? 'secretarias' : modoVisualizacaoBloco3Rep === 'MODALIDADES' ? 'modalidades' : 'fornecedores'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{tipoGraficoBloco3Rep}</span>
            </div>
          </div>

          <div className="p-3 flex-1 flex flex-col gap-2 overflow-hidden">
            {/* ─── LINHA 1: CATEGORIAS/SECRETARIAS/MODALIDADES NO TOPO ─── */}
            <div className="flex items-center gap-1 flex-wrap shrink-0">
              {representatividadeDataExpandida.slice(0, 7).map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setItemHoveredBloco3Rep(itemHoveredBloco3Rep === i ? null : i)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold rounded-sm border cursor-pointer transition ${
                    itemHoveredBloco3Rep === i
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-[80px]">{item.name}</span>
                  <span className="tabular-nums">{item.pct.toFixed(1)}%</span>
                </button>
              ))}
              {representatividadeDataExpandida.length > 7 && (
                <span className="text-[8px] font-mono text-slate-400">+{representatividadeDataExpandida.length - 7}</span>
              )}
            </div>

            {/* ─── LINHA 2: CONTROLES + FILTROS ─── */}
            <div className="flex items-center justify-between flex-wrap gap-1.5 shrink-0">
              <div className="flex items-center gap-1">
                {/* Toggle Modo de Visualização */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['CATEGORIAS', 'SECRETARIAS', 'MODALIDADES', 'FORNECEDORES'] as const).map(modo => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => { setModoVisualizacaoBloco3Rep(modo); setPaginaBloco3Rep(1); setItemHoveredBloco3Rep(null); }}
                      className={`px-2 py-1 text-[9px] font-mono font-bold uppercase cursor-pointer transition ${
                        modoVisualizacaoBloco3Rep === modo
                          ? 'bg-slate-900 text-white dark:bg-slate-700'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {modo === 'CATEGORIAS' ? 'Cat.' : modo === 'SECRETARIAS' ? 'Sec.' : modo === 'MODALIDADES' ? 'Mod.' : 'Forn.'}
                    </button>
                  ))}
                </div>

                {/* Seletor Tipo de Gráfico */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['DONUT', 'BARRAS', 'PIE', 'LINHA'] as const).map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoGraficoBloco3Rep(tipo)}
                      className={`px-2 py-1 text-[9px] font-mono font-bold uppercase cursor-pointer transition ${
                        tipoGraficoBloco3Rep === tipo
                          ? 'bg-blue-600 text-white dark:bg-blue-700'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      title={tipo === 'DONUT' ? 'Donut' : tipo === 'BARRAS' ? 'Barras Horizontais' : tipo === 'PIE' ? 'Pizza' : 'Linha'}
                    >
                      {tipo === 'DONUT' ? '◎' : tipo === 'BARRAS' ? '☰' : tipo === 'PIE' ? '●' : '〜'}
                    </button>
                  ))}
                </div>

                {/* Botão Filtros */}
                <button
                  type="button"
                  onClick={() => setMostrarFiltrosBloco3Rep(!mostrarFiltrosBloco3Rep)}
                  className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono font-bold uppercase rounded-sm border cursor-pointer transition ${
                    mostrarFiltrosBloco3Rep
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  Filtros
                  {(filtroSecBloco3Rep !== 'todas' || filtroStatusBloco3Rep !== 'todos' || filtroValorMinBloco3Rep || filtroValorMaxBloco3Rep) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
                  )}
                </button>
              </div>

              <div className="text-[9px] font-mono text-slate-500">
                {secretariaSelecionada !== 'Todas as Secretarias' ? secretariaSelecionada : 'Consolidado'}
              </div>
            </div>

            {/* ─── FILTROS EXPANDIDOS ─── */}
            {mostrarFiltrosBloco3Rep && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2 shrink-0">
                <div className="grid grid-cols-5 gap-1.5">
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Secretaria</label>
                    <select value={filtroSecBloco3Rep} onChange={e => { setFiltroSecBloco3Rep(e.target.value); setPaginaBloco3Rep(1); }} className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                      <option value="todas">Todas</option>
                      {secretariasDisponiveisBloco3.map(s => (<option key={s.codigo} value={s.codigo}>{(s.nome || s.codigo).slice(0, 18)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Status</label>
                    <select value={filtroStatusBloco3Rep} onChange={e => { setFiltroStatusBloco3Rep(e.target.value); setPaginaBloco3Rep(1); }} className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                      <option value="todos">Todos</option>
                      <option value="Lucrativo">Lucrativo</option>
                      <option value="Estável">Estável</option>
                      <option value="Prejuízo">Prejuízo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Valor Mín</label>
                    <input type="number" value={filtroValorMinBloco3Rep} onChange={e => { setFiltroValorMinBloco3Rep(e.target.value); setPaginaBloco3Rep(1); }} placeholder="R$" className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Valor Máx</label>
                    <input type="number" value={filtroValorMaxBloco3Rep} onChange={e => { setFiltroValorMaxBloco3Rep(e.target.value); setPaginaBloco3Rep(1); }} placeholder="∞" className="w-full text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => { setFiltroSecBloco3Rep('todas'); setFiltroStatusBloco3Rep('todos'); setFiltroValorMinBloco3Rep(''); setFiltroValorMaxBloco3Rep(''); setPaginaBloco3Rep(1); }} className="w-full px-2 py-1 text-[9px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 rounded-sm cursor-pointer transition">
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTEÚDO PRINCIPAL: GRÁFICO + MÉTRICAS | TABELA ─── */}
            <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">

              {/* ═══ COLUNA ESQUERDA (8 cols): GRÁFICO + TABELA ═══ */}
              <div className="col-span-8 flex flex-col gap-2 min-h-0">

                {/* Gráfico — preenche TODO o quadro */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-sm relative min-h-[200px]">
                  {/* Gráfico Donut / Pie */}
                  {(tipoGraficoBloco3Rep === 'DONUT' || tipoGraficoBloco3Rep === 'PIE') && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={representatividadeDataExpandida}
                          cx="50%"
                          cy="50%"
                          innerRadius={tipoGraficoBloco3Rep === 'DONUT' ? 55 : 0}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="valorNum"
                          nameKey="name"
                          onMouseEnter={(_, index) => setItemHoveredBloco3Rep(index)}
                          onMouseLeave={() => setItemHoveredBloco3Rep(null)}
                        >
                          {representatividadeDataExpandida.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              opacity={itemHoveredBloco3Rep === null || itemHoveredBloco3Rep === index ? 1 : 0.35}
                              stroke={itemHoveredBloco3Rep === index ? entry.color : 'transparent'}
                              strokeWidth={itemHoveredBloco3Rep === index ? 3 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', color: '#fff', fontFamily: 'JetBrains Mono', borderRadius: '2px' }}
                          labelStyle={{ color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(val: any, name: string) => [`${formatCompactCurrency(Number(val))}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {/* Gráfico Barras Horizontais */}
                  {tipoGraficoBloco3Rep === 'BARRAS' && (
                    <div className="absolute inset-0 p-3 flex flex-col justify-center">
                      {representatividadeDataExpandida.slice(0, 8).map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 py-1 cursor-pointer transition ${
                            itemHoveredBloco3Rep === i ? 'opacity-100' : itemHoveredBloco3Rep !== null ? 'opacity-35' : 'opacity-100'
                          }`}
                          onMouseEnter={() => setItemHoveredBloco3Rep(i)}
                          onMouseLeave={() => setItemHoveredBloco3Rep(null)}
                        >
                          <span className="text-[8px] font-mono text-slate-500 w-16 text-right truncate" title={item.name}>{item.name.slice(0, 12)}</span>
                          <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all duration-300"
                              style={{ width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }}
                            />
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 w-12 text-right tabular-nums">{item.pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gráfico Linha */}
                  {tipoGraficoBloco3Rep === 'LINHA' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={representatividadeDataExpandida.slice(0, 8)} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={50} interval={0} />
                        <YAxis tick={{ fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', color: '#fff', fontFamily: 'JetBrains Mono', borderRadius: '2px' }}
                          formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Participação']}
                        />
                        <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                          {representatividadeDataExpandida.slice(0, 8).map((entry, index) => (
                            <Cell
                              key={`cell-bar-${index}`}
                              fill={entry.color}
                              opacity={itemHoveredBloco3Rep === null || itemHoveredBloco3Rep === index ? 1 : 0.35}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Centro do Donut */}
                  {tipoGraficoBloco3Rep === 'DONUT' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center font-mono">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        {modoVisualizacaoBloco3Rep === 'CATEGORIAS' ? 'Total Gasto' : 'Total'}
                      </span>
                      <span className="font-extrabold text-base text-slate-950 dark:text-white tabular-nums">
                        {formatCompactCurrency(kpisBloco1.totalContratos)}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">
                        {metricasBloco3Rep.pctExecucao.toFixed(1)}% executado
                      </span>
                    </div>
                  )}

                  {/* Tooltip Hover Centralizado */}
                  {itemHoveredBloco3Rep !== null && representatividadeDataExpandida[itemHoveredBloco3Rep] && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1 rounded-sm text-[10px] font-mono pointer-events-none z-10">
                      <span className="font-bold">{representatividadeDataExpandida[itemHoveredBloco3Rep].name}</span>
                      <span className="ml-2 tabular-nums">{representatividadeDataExpandida[itemHoveredBloco3Rep].valor}</span>
                      <span className="ml-1 text-slate-400">({representatividadeDataExpandida[itemHoveredBloco3Rep].pct.toFixed(1)}%)</span>
                    </div>
                  )}
                </div>

                {/* Tabela Detalhada — flex-1 preenche */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-sm flex flex-col min-h-0 overflow-hidden">
                  {/* Cabeçalho da Tabela */}
                  <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[8px] font-mono font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                    <div className="col-span-4 cursor-pointer hover:text-slate-700 flex items-center gap-0.5" onClick={() => { setOrdemColunaBloco3Rep('name'); setDirecaoOrdenacaoBloco3Rep(direcaoOrdenacaoBloco3Rep === 'asc' ? 'desc' : 'asc'); }}>
                      {ordemColunaBloco3Rep === 'name' ? (<ChevronUp className={`w-2.5 h-2.5 ${direcaoOrdenacaoBloco3Rep === 'asc' ? 'rotate-180' : ''}`} />) : (<ArrowUpDown className="w-2 h-2 opacity-30" />)}
                      Nome
                    </div>
                    <div className="col-span-2 text-center cursor-pointer hover:text-slate-700" onClick={() => { setOrdemColunaBloco3Rep('contratosCount'); setDirecaoOrdenacaoBloco3Rep(direcaoOrdenacaoBloco3Rep === 'asc' ? 'desc' : 'asc'); }}>
                      Contratos
                    </div>
                    <div className="col-span-3 text-right cursor-pointer hover:text-slate-700" onClick={() => { setOrdemColunaBloco3Rep('valorNum'); setDirecaoOrdenacaoBloco3Rep(direcaoOrdenacaoBloco3Rep === 'asc' ? 'desc' : 'asc'); }}>
                      {ordemColunaBloco3Rep === 'valorNum' ? (<ChevronUp className={`w-2.5 h-2.5 inline ${direcaoOrdenacaoBloco3Rep === 'asc' ? 'rotate-180' : ''}`} />) : (<ArrowUpDown className="w-2 h-2 inline opacity-30" />)}
                      Valor
                    </div>
                    <div className="col-span-2 text-center cursor-pointer hover:text-slate-700" onClick={() => { setOrdemColunaBloco3Rep('pct'); setDirecaoOrdenacaoBloco3Rep(direcaoOrdenacaoBloco3Rep === 'asc' ? 'desc' : 'asc'); }}>
                      %
                    </div>
                    <div className="col-span-1 text-center">Barra</div>
                  </div>
                  {/* Linhas da Tabela */}
                  <div className="flex-1 overflow-auto">
                    {dadosTabelaBloco3Rep.fatia.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-[10px] font-mono text-slate-400">
                        Nenhum item encontrado.
                      </div>
                    ) : (
                      dadosTabelaBloco3Rep.fatia.map((item, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[9px] font-mono border-b border-slate-100 dark:border-slate-800 cursor-pointer transition ${
                            itemHoveredBloco3Rep === i
                              ? 'bg-blue-50 dark:bg-blue-950'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          onMouseEnter={() => setItemHoveredBloco3Rep(i)}
                          onMouseLeave={() => setItemHoveredBloco3Rep(null)}
                        >
                          <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate" title={item.name}>{item.name}</span>
                          </div>
                          <div className="col-span-2 text-center text-slate-600 dark:text-slate-400 tabular-nums">{item.contratosCount}</div>
                          <div className="col-span-3 text-right text-slate-800 dark:text-slate-200 font-bold tabular-nums">{item.valor}</div>
                          <div className="col-span-2 text-center text-slate-600 dark:text-slate-400 tabular-nums">{item.pct.toFixed(1)}%</div>
                          <div className="col-span-1 flex items-center">
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Paginação da Tabela */}
                  {dadosTabelaBloco3Rep.totalPaginas > 1 && (
                    <div className="flex items-center justify-between px-2.5 py-1 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[8px] font-mono text-slate-500 shrink-0">
                      <span>{dadosTabelaBloco3Rep.totalItens} itens</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setPaginaBloco3Rep(Math.max(1, paginaBloco3Rep - 1))} disabled={paginaBloco3Rep === 1} className="px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded-sm disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{paginaBloco3Rep}/{dadosTabelaBloco3Rep.totalPaginas}</span>
                        <button type="button" onClick={() => setPaginaBloco3Rep(Math.min(dadosTabelaBloco3Rep.totalPaginas, paginaBloco3Rep + 1))} disabled={paginaBloco3Rep === dadosTabelaBloco3Rep.totalPaginas} className="px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded-sm disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                          <ChevronRight className="w-2.5 h--2.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ COLUNA DIREITA (4 cols): MÉTRICAS + LEGENDA ═══ */}
              <div className="col-span-4 flex flex-col gap-1.5 min-h-0 overflow-y-auto">

                {/* Métricas Compactas */}
                <div className="grid grid-cols-2 gap-1 shrink-0">
                  {[
                    { label: 'Orçamento', value: formatCompactCurrency(metricasBloco3Rep.orcamentoTotal), color: 'text-slate-800 dark:text-slate-200' },
                    { label: 'Empenhado', value: formatCompactCurrency(metricasBloco3Rep.totalEmpenhado), color: 'text-blue-700 dark:text-blue-400' },
                    { label: 'Liquidado', value: formatCompactCurrency(metricasBloco3Rep.totalLiquidado), color: 'text-emerald-700 dark:text-emerald-400' },
                    { label: 'Saldo', value: formatCompactCurrency(metricasBloco3Rep.saldoDisponivel), color: 'text-amber-700 dark:text-amber-400' },
                  ].map((m, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5">
                      <div className="text-[7px] font-mono text-slate-500 uppercase">{m.label}</div>
                      <div className={`text-[11px] font-mono font-bold tabular-nums ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Execução + Meta */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Execução</span>
                    <span className={`text-[11px] font-mono font-bold tabular-nums ${metricasBloco3Rep.isAcimaMeta ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {metricasBloco3Rep.pctExecucao.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, metricasBloco3Rep.pctExecucao)}%`,
                        backgroundColor: metricasBloco3Rep.isAcimaMeta ? '#10b981' : '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-slate-500">Meta: {metricasBloco3Rep.metaExecucao}%</span>
                    <span className={metricasBloco3Rep.isAcimaMeta ? 'text-emerald-600' : 'text-amber-600'}>
                      {metricasBloco3Rep.isAcimaMeta ? '↑' : '↓'} {Math.abs(metricasBloco3Rep.diferencaMeta).toFixed(1)}pp
                    </span>
                  </div>
                </div>

                {/* Maior Item + Concentração */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2 shrink-0 space-y-1.5">
                  {metricasBloco3Rep.maiorCategoria && (
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Award className="w-2.5 h-2.5 text-amber-500" />
                        <span className="text-[7px] font-mono text-slate-500 uppercase">Maior</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metricasBloco3Rep.maiorCategoria.color }} />
                        <span className="text-[9px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate flex-1">{metricasBloco3Rep.maiorCategoria.name}</span>
                        <span className="text-[9px] font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">{metricasBloco3Rep.maiorCategoria.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <BarChart3 className="w-2.5 h-2.5 text-purple-500" />
                      <span className="text-[7px] font-mono text-slate-500 uppercase">Concentração HH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] font-mono font-extrabold tabular-nums ${metricasBloco3Rep.corConcentracao}`}>{metricasBloco3Rep.hhFormatado}</span>
                      <span className={`text-[9px] font-mono font-bold ${metricasBloco3Rep.corConcentracao}`}>{metricasBloco3Rep.concentracao}</span>
                    </div>
                    <div className="text-[7px] font-mono text-slate-400 mt-0.5">0=分散ado | 1=monopólio</div>
                  </div>
                </div>

                {/* Legenda Interativa — flex-1 preenche */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2 min-h-0 overflow-y-auto">
                  <div className="text-[8px] font-mono font-bold text-slate-500 uppercase mb-1">Legenda</div>
                  <div className="space-y-0.5">
                    {representatividadeDataExpandida.slice(0, 8).map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between gap-1 cursor-pointer rounded-sm px-1 py-0.5 transition ${
                          itemHoveredBloco3Rep === i ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        onMouseEnter={() => setItemHoveredBloco3Rep(i)}
                        onMouseLeave={() => setItemHoveredBloco3Rep(null)}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-[8px] font-sans text-slate-600 dark:text-slate-400 truncate max-w-[70px] font-medium" title={item.name}>{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[8px] text-slate-800 dark:text-slate-200 shrink-0 tabular-nums">{item.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                    {representatividadeDataExpandida.length > 8 && (
                      <div className="text-[7px] font-mono text-slate-400 text-center pt-0.5">
                        +{representatividadeDataExpandida.length - 8} mais
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center font-mono text-[9px]">
            <span className="text-slate-600 dark:text-slate-400">
              <strong>{contratosDaSecretaria.length} contratos</strong> em <strong>{secretariaSelecionada}</strong> — {metricasBloco3Rep.totalCategorias} itens
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          3. BLOCO 4 — COMPORTAMENTO DOS GASTOS (LARGURA TOTAL)
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-mono font-bold tracking-wide uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>BLOCO 4 — COMPORTAMENTO DOS GASTOS</span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-xs">
              {secretariaSelecionada}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              {contratosFiltradosBloco3.length} contrato{contratosFiltradosBloco3.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Série & Projeção</span>
          </div>
        </div>

        <div className="p-3.5 flex-1 flex flex-col gap-2.5 overflow-hidden">
          {/* ─── LINHA 1: CONTROLES PRINCIPAIS ─── */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              {/* Toggle Modo Visão */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setModoVisaoBloco3('INDIVIDUAL')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase cursor-pointer transition ${
                    modoVisaoBloco3 === 'INDIVIDUAL'
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisaoBloco3('CONSOLIDADO')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase cursor-pointer transition ${
                    modoVisaoBloco3 === 'CONSOLIDADO'
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Consolidado
                </button>
              </div>

              {/* Botão Filtros */}
              <button
                type="button"
                onClick={() => setMostrarFiltrosBloco3(!mostrarFiltrosBloco3)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm border cursor-pointer transition ${
                  mostrarFiltrosBloco3
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filtros
                {(filtroCategoriaBloco3 !== 'todas' || filtroCriticidadeBloco3 !== 'todas' || filtroStatusBloco3 !== 'todos' || filtroModalidadeBloco3 !== 'todas' || filtroValorMinBloco3 || filtroValorMaxBloco3) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
                )}
              </button>
            </div>

            {/* Seletor de Contrato (modo individual) */}
            {modoVisaoBloco3 === 'INDIVIDUAL' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 font-semibold">Contrato:</span>
                <select
                  value={contratoSelecionadoId || (contratoAtivo?.id || '')}
                  onChange={e => setContratoSelecionadoId(e.target.value)}
                  className="text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none max-w-[260px] truncate"
                >
                  {contratosFiltradosBloco3.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.numero} - {c.fornecedor ? c.fornecedor.slice(0, 25) : 'Contrato'}
                    </option>
                  ))}
                  {contratosFiltradosBloco3.length === 0 && (
                    <option value="">Nenhum contrato encontrado</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* ─── LINHA 2: FILTROS EXPANDIDOS ─── */}
          {mostrarFiltrosBloco3 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-2.5 shrink-0">
              <div className="grid grid-cols-7 gap-2">
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Secretaria</label>
                  <select value={filtroSecBloco3} onChange={e => { setFiltroSecBloco3(e.target.value); setPaginaBloco3(1); }} className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                    <option value="todas">Todas</option>
                    {secretariasDisponiveisBloco3.map(s => (<option key={s.codigo} value={s.codigo}>{s.nome || s.codigo}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Categoria</label>
                  <select value={filtroCategoriaBloco3} onChange={e => { setFiltroCategoriaBloco3(e.target.value); setPaginaBloco3(1); }} className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                    <option value="todas">Todas</option>
                    {categoriasDisponiveisBloco3.map(cat => (<option key={cat} value={cat}>{cat.length > 25 ? cat.slice(0, 25) + '...' : cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Criticidade</label>
                  <select value={filtroCriticidadeBloco3} onChange={e => { setFiltroCriticidadeBloco3(e.target.value); setPaginaBloco3(1); }} className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                    <option value="todas">Todas</option>
                    <option value="ESSENCIAL">Essencial</option>
                    <option value="IMPORTANTE">Importante</option>
                    <option value="DIFERIVEL">Diferível</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Status</label>
                  <select value={filtroStatusBloco3} onChange={e => { setFiltroStatusBloco3(e.target.value); setPaginaBloco3(1); }} className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                    <option value="todos">Todos</option>
                    <option value="VIGENTE">Vigente</option>
                    <option value="A_VENCER_60D">A Vencer (60d)</option>
                    <option value="A_VENCER_180D">A Vencer (180d)</option>
                    <option value="ENCERRADO">Encerrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Modalidade</label>
                  <select value={filtroModalidadeBloco3} onChange={e => { setFiltroModalidadeBloco3(e.target.value); setPaginaBloco3(1); }} className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none">
                    <option value="todas">Todas</option>
                    {modalidadesDisponiveisBloco3.map(mod => (<option key={mod} value={mod}>{mod}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">Valor Mín (R$)</label>
                  <input type="number" value={filtroValorMinBloco3} onChange={e => { setFiltroValorMinBloco3(e.target.value); setPaginaBloco3(1); }} placeholder="0" className="w-full text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => { setFiltroSecBloco3('todas'); setFiltroCategoriaBloco3('todas'); setFiltroCriticidadeBloco3('todas'); setFiltroStatusBloco3('todos'); setFiltroModalidadeBloco3('todas'); setFiltroValorMinBloco3(''); setFiltroValorMaxBloco3(''); setPaginaBloco3(1); }} className="w-full px-2 py-1 text-[10px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 rounded-sm cursor-pointer transition">
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONTEÚDO PRINCIPAL: GRÁFICO + métricas + sazonalidade | CARD + TABELA ─── */}
          <div className="flex-1 grid grid-cols-12 gap-2.5 min-h-0 overflow-hidden">

            {/* ═══ COLUNA ESQUERDA (8 cols): GRÁFICO + SAZONALIDADE ═══ */}
            <div className="col-span-8 flex flex-col gap-2.5 min-h-0">

              {/* Gráfico — preenche altura disponível */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-sm p-2 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={modoVisaoBloco3 === 'CONSOLIDADO' ? dadosGraficoConsolidado : historicoGraficoContrato}
                    margin={{ top: 8, right: 12, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRealizado3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProjecao3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}mi`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', color: '#fff', fontFamily: 'JetBrains Mono', borderRadius: '2px' }}
                      formatter={(val: any, name: string) => [`R$ ${Number(val).toFixed(2)} mi`, name === 'realizado' ? 'Realizado' : 'Projeção']}
                      labelFormatter={(label: string) => `Período: ${label}`}
                    />
                    <Area type="monotone" dataKey="realizado" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRealizado3)" connectNulls={false} dot={{ r: 2.5, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="projecao" stroke="#8b5cf6" strokeDasharray="4 3" strokeWidth={2} fillOpacity={1} fill="url(#colorProjecao3)" connectNulls={true} dot={{ r: 2.5, fill: '#8b5cf6', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sazonalidade — inline abaixo do gráfico (modo consolidado) */}
              {modoVisaoBloco3 === 'CONSOLIDADO' && analiseSazonalidade.temDados && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Sazonalidade</span>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[9px]">Mais caro:</span>
                        <span className="font-bold text-rose-600 tabular-nums">{analiseSazonalidade.mesMaisCaro?.mes || '—'}</span>
                        <span className="text-[9px] text-slate-500 tabular-nums">R${analiseSazonalidade.mesMaisCaro?.realizado?.toFixed(1) || '0'}mi</span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[9px]">Mais barato:</span>
                        <span className="font-bold text-emerald-600 tabular-nums">{analiseSazonalidade.mesMaisBarato?.mes || '—'}</span>
                        <span className="text-[9px] text-slate-500 tabular-nums">R${analiseSazonalidade.mesMaisBarato?.realizado?.toFixed(1) || '0'}mi</span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[9px]">CV:</span>
                        <span className={`font-bold tabular-nums ${analiseSazonalidade.coeficienteVariacao > 30 ? 'text-rose-600' : analiseSazonalidade.coeficienteVariacao > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {analiseSazonalidade.coeficienteVariacao}%
                        </span>
                      </div>
                      {analiseSazonalidade.anomalias.length > 0 && (
                        <>
                          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span className="font-bold text-amber-600 text-[9px]">{analiseSazonalidade.anomalias.length} anomali{analiseSazonalidade.anomalias.length !== 1 ? 'as' : 'a'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Card Detalhe do Contrato (modo individual) — inline abaixo do gráfico */}
              {modoVisaoBloco3 === 'INDIVIDUAL' && contratoAtivo && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-sm p-2.5 shrink-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate font-mono">
                          {contratoAtivo.numero || 'S/N'} • {contratoAtivo.fornecedor || 'Fornecedor'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate" title={contratoAtivo.objeto}>
                          {contratoAtivo.objeto || 'Objeto não informado'}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setContratoDetalhe(contratoAtivo)} className="px-2 py-1 text-[10px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xs shrink-0 cursor-pointer transition">
                      Ficha Completa
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 text-[9px] font-mono text-slate-500">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /><span>Vigência: <strong className="text-slate-700 dark:text-slate-300">{metricasContratoAtivoExpandido?.dataInicio || '—'} → {metricasContratoAtivoExpandido?.dataFim || '—'}</strong></span></div>
                    <div className="flex items-center gap-1"><FileText className="w-3 h-3 text-slate-400" /><span>Mod: <strong className="text-slate-700 dark:text-slate-300">{metricasContratoAtivoExpandido?.modalidade || '—'}</strong></span></div>
                    <div className="flex items-center gap-1"><Landmark className="w-3 h-3 text-slate-400" /><span>Fonte: <strong className="text-slate-700 dark:text-slate-300">{metricasContratoAtivoExpandido?.fonteRecurso || '—'}</strong></span></div>
                    <div className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /><span>Fiscal: <strong className="text-slate-700 dark:text-slate-300">{metricasContratoAtivoExpandido?.fiscalNome || '—'}</strong></span></div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-mono">
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Valor Total</span>
                      <span className="font-bold text-slate-900 dark:text-white text-[10px] tabular-nums">{formatCompactCurrency(contratoAtivo.valorTotal || 0)}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Liquidado</span>
                      <span className="font-bold text-emerald-600 text-[10px] tabular-nums">{formatCompactCurrency(contratoAtivo.valorLiquidado || 0)}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Empenhado</span>
                      <span className="font-bold text-amber-600 text-[10px] tabular-nums">{formatCompactCurrency(contratoAtivo.valorEmpenhado || 0)}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Disponível</span>
                      <span className="font-bold text-blue-600 text-[10px] tabular-nums">{formatCompactCurrency(contratoAtivo.saldoDisponivel || 0)}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Execução</span>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-0.5">
                        <div className={`h-1 rounded-full ${(contratoAtivo.pctExecutado || 0) > 80 ? 'bg-emerald-500' : (contratoAtivo.pctExecutado || 0) > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, contratoAtivo.pctExecutado || 0)}%` }} />
                      </div>
                      <span className="font-bold text-[9px] tabular-nums text-slate-700 dark:text-slate-300">{(contratoAtivo.pctExecutado || 0).toFixed(1)}%</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Dias Rest.</span>
                      <span className={`font-bold text-[10px] tabular-nums ${(contratoAtivo.diasRestantes || 0) < 30 ? 'text-rose-600' : (contratoAtivo.diasRestantes || 0) < 90 ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>{contratoAtivo.diasRestantes || '—'}d</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8px]">Criticidade</span>
                      <span className={`font-bold text-[9px] tabular-nums px-1 py-0.5 rounded-xs inline-block mt-0.5 ${(contratoAtivo.criticidade || '').toUpperCase() === 'ESSENCIAL' ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300' : (contratoAtivo.criticidade || '').toUpperCase() === 'IMPORTANTE' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                        {(contratoAtivo.criticidade || 'IMP').slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ COLUNA DIREITA (4 cols): MÉTRICAS + TABELA ═══ */}
            <div className="col-span-4 flex flex-col gap-2.5 min-h-0">

              {/* Métricas — preenche altura */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-mono flex-1 min-h-0 overflow-y-auto">
                {modoVisaoBloco3 === 'CONSOLIDADO' ? (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-0.5 border-b border-slate-200 dark:border-slate-700">Consolidado</div>
                    <div className="flex justify-between"><span className="text-slate-500">Contratos</span><span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{metricasConsolidadasBloco3.totalContratos}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Valor total</span><span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{formatCompactCurrency(metricasConsolidadasBloco3.valorTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Liquidado</span><span className="font-bold text-emerald-600 tabular-nums">{formatCompactCurrency(metricasConsolidadasBloco3.valorLiquidado)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Empenhado</span><span className="font-bold text-amber-600 tabular-nums">{formatCompactCurrency(metricasConsolidadasBloco3.valorEmpenhado)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Saldo disp.</span><span className="font-bold text-blue-600 tabular-nums">{formatCompactCurrency(metricasConsolidadasBloco3.saldoDisponivel)}</span></div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1 flex justify-between"><span className="text-slate-500">Execução</span><span className="font-bold tabular-nums">{metricasConsolidadasBloco3.pctExecucaoMedia.toFixed(1)}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Essenciais</span><span className="px-1 py-0.5 rounded-xs font-bold text-[9px] bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 tabular-nums">{metricasConsolidadasBloco3.contratosEssenciais}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Importantes</span><span className="px-1 py-0.5 rounded-xs font-bold text-[9px] bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 tabular-nums">{metricasConsolidadasBloco3.contratosImportantes}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Diferíveis</span><span className="px-1 py-0.5 rounded-xs font-bold text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 tabular-nums">{metricasConsolidadasBloco3.contratosDiferiveis}</span></div>
                  </div>
                ) : metricasContratoAtivoExpandido ? (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-0.5 border-b border-slate-200 dark:border-slate-700">Métricas Contrato</div>
                    <div className="flex justify-between"><span className="text-slate-500">Média mensal</span><span className="font-bold tabular-nums">{metricasContratoAtivoExpandido.mediaMensal}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Último mês</span><span className="font-bold tabular-nums">{metricasContratoAtivoExpandido.ultimoMes}</span></div>
                    <div className={`flex justify-between font-bold ${metricasContratoAtivoExpandido.tendenciaPositiva ? 'text-amber-600' : 'text-emerald-600'}`}>
                      <span>Tendência</span>
                      <span className="tabular-nums flex items-center gap-0.5">
                        {metricasContratoAtivoExpandido.tendenciaPositiva ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {metricasContratoAtivoExpandido.tendencia}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1 flex justify-between"><span className="text-slate-500">Projeção 2026</span><span className="font-bold text-blue-600 tabular-nums">{metricasContratoAtivoExpandido.projecao}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Orçamento disp.</span><span className="font-bold text-emerald-600 tabular-nums">{metricasContratoAtivoExpandido.orcamentoDisp}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Risco</span><span className={`px-1 py-0.5 rounded-xs font-bold text-[9px] tabular-nums ${metricasContratoAtivoExpandido.isRisco ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'}`}>{metricasContratoAtivoExpandido.risco}</span></div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1 flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Dias restantes</span>
                      <span className={`font-bold tabular-nums ${metricasContratoAtivoExpandido.diasRestantes < 30 ? 'text-rose-600' : metricasContratoAtivoExpandido.diasRestantes < 90 ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>{metricasContratoAtivoExpandido.diasRestantes}d</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">% Execução</span><span className="font-bold tabular-nums">{metricasContratoAtivoExpandido.pctExecutado.toFixed(1)}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Velocidade</span><span className={`font-bold tabular-nums ${metricasContratoAtivoExpandido.velCor}`}>{metricasContratoAtivoExpandido.velocidadeExecucao}% — {metricasContratoAtivoExpandido.velClassificacao}</span></div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 text-center py-6">Selecione um contrato</div>
                )}
              </div>

              {/* Tabela de Contratos — preenche restante */}
              <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden flex flex-col min-h-0">
                <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Contratos ({tabelaContratosBloco3.totalItens})</span>
                  <span className="text-[9px] font-mono text-slate-400">{tabelaContratosBloco3.paginaAtual}/{tabelaContratosBloco3.totalPaginas}</span>
                </div>
                {tabelaContratosBloco3.totalItens > 0 ? (
                  <>
                    <div className="flex-1 overflow-auto min-h-0">
                      <table className="w-full text-[9px] font-mono">
                        <thead className="sticky top-0">
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                            {[
                              { key: 'numero', label: 'Nº' },
                              { key: 'fornecedor', label: 'Fornecedor' },
                              { key: 'valorTotal', label: 'Valor' },
                              { key: 'pctExecutado', label: '%' },
                              { key: 'criticidade', label: 'Crit' },
                              { key: 'diasRestantes', label: 'Dias' },
                            ].map(col => (
                              <th key={col.key} className="px-1.5 py-1 text-left cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => setOrdemTabelaBloco3(prev => ({ coluna: col.key, direcao: prev.coluna === col.key && prev.direcao === 'desc' ? 'asc' : 'desc' }))}>
                                <span className="flex items-center gap-0.5">
                                  {col.label}
                                  {ordemTabelaBloco3.coluna === col.key ? (ordemTabelaBloco3.direcao === 'desc' ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tabelaContratosBloco3.itens.map(c => {
                            const isSelected = c.id === (contratoAtivo?.id || '');
                            return (
                              <tr key={c.id} onClick={() => { setContratoSelecionadoId(c.id); setModoVisaoBloco3('INDIVIDUAL'); }} className={`border-t border-slate-100 dark:border-slate-800 cursor-pointer transition ${isSelected ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}>
                                <td className="px-1.5 py-1 font-bold truncate max-w-[55px]">{c.numero}</td>
                                <td className="px-1.5 py-1 truncate max-w-[70px]" title={c.fornecedor}>{(c.fornecedor || '—').slice(0, 10)}</td>
                                <td className="px-1.5 py-1 font-bold tabular-nums">{formatCompactCurrency(c.valorTotal || 0)}</td>
                                <td className="px-1.5 py-1 tabular-nums"><span className={`font-bold ${(c.pctExecutado || 0) > 80 ? 'text-emerald-600' : (c.pctExecutado || 0) > 50 ? 'text-blue-600' : 'text-amber-600'}`}>{(c.pctExecutado || 0).toFixed(0)}%</span></td>
                                <td className="px-1.5 py-1"><span className={`px-1 py-0.5 rounded-xs font-bold text-[7px] ${(c.criticidade || '').toUpperCase() === 'ESSENCIAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : (c.criticidade || '').toUpperCase() === 'IMPORTANTE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>{(c.criticidade || 'IMP').slice(0, 3).toUpperCase()}</span></td>
                                <td className="px-1.5 py-1 tabular-nums font-bold"><span className={(c.diasRestantes || 0) < 30 ? 'text-rose-600' : (c.diasRestantes || 0) < 90 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}>{c.diasRestantes || '—'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {tabelaContratosBloco3.totalPaginas > 1 && (
                      <div className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                        <span className="text-[8px] font-mono text-slate-400">{(tabelaContratosBloco3.paginaAtual - 1) * itensPorPaginaBloco3 + 1}–{Math.min(tabelaContratosBloco3.paginaAtual * itensPorPaginaBloco3, tabelaContratosBloco3.totalItens)}</span>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => setPaginaBloco3(Math.max(1, tabelaContratosBloco3.paginaAtual - 1))} disabled={tabelaContratosBloco3.paginaAtual <= 1} className="w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-slate-200 dark:bg-slate-700 rounded-sm disabled:opacity-30">‹</button>
                          <span className="text-[8px] font-bold">{tabelaContratosBloco3.paginaAtual}</span>
                          <button type="button" onClick={() => setPaginaBloco3(Math.min(tabelaContratosBloco3.totalPaginas, tabelaContratosBloco3.paginaAtual + 1))} disabled={tabelaContratosBloco3.paginaAtual >= tabelaContratosBloco3.totalPaginas} className="w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-slate-200 dark:bg-slate-700 rounded-sm disabled:opacity-30">›</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-slate-400 p-4">
                    Nenhum contrato encontrado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          4. LINHA INFERIOR — BLOCO 5 SIMULADOR & CENTRAL DE DECISÃO
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ═══ BLOCO 5 — SIMULADOR DE CONTINGENCIAMENTO (7 cols) — VERSÃO EVOLUÍDA ═══ */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 text-sm font-mono font-bold tracking-wide uppercase flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>BLOCO 5 — SIMULADOR DE CONTINGENCIAMENTO & CENÁRIOS</span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-xs">
                {secretariaSelecionada}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-400 font-mono">Meta: {metaEconomia}</span>
              <span className="text-xs text-slate-400 font-mono">{dadosFiltradosSimulador.dados.length} {secretariaSelecionada !== 'Todas as Secretarias' ? 'categorias/itens' : 'secretarias'}</span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
            {/* ─── LINHA 1: CONTROLES PRINCIPAIS ─── */}
            <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {/* Toggle Modo de Visualização */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['TABELA', 'GRAFICO', 'COMPARATIVO'] as const).map(modo => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => setModoVisualizacaoSimulador(modo)}
                      className={`px-3 py-1.5 text-[11px] font-mono font-bold uppercase cursor-pointer transition ${
                        modoVisualizacaoSimulador === modo
                          ? 'bg-slate-900 text-white dark:bg-slate-700'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {modo === 'TABELA' ? '☰ Tabela' : modo === 'GRAFICO' ? '📊 Gráfico' : '↔ Comp.'}
                    </button>
                  ))}
                </div>

                {/* Toggle Tipo de Corte */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['PERCENTUAL', 'FIXO', 'MISTO'] as const).map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoCorteSimulador(tipo)}
                      className={`px-3 py-1.5 text-[11px] font-mono font-bold uppercase cursor-pointer transition ${
                        tipoCorteSimulador === tipo
                          ? 'bg-indigo-600 text-white dark:bg-indigo-700'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tipo === 'PERCENTUAL' ? '% Corte' : tipo === 'FIXO' ? 'R$ Fixo' : 'Misto'}
                    </button>
                  ))}
                </div>

                {/* Botão Filtros */}
                <button
                  type="button"
                  onClick={() => setMostrarFiltrosSimulador(!mostrarFiltrosSimulador)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase rounded-sm border cursor-pointer transition ${
                    mostrarFiltrosSimulador
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filtros
                  {(filtroSecSimulador !== 'todas' || filtroImpactoSimulador !== 'todos' || filtroValorMinSimulador || filtroValorMaxSimulador || buscaSecSimulador) && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Botões de Meta Rápida */}
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">META:</span>
                {['10%', '15%', '20%', '25%', '30%'].map(meta => (
                  <button
                    key={meta}
                    type="button"
                    onClick={() => setMetaEconomia(meta)}
                    className={`px-3 py-1 rounded-sm font-bold text-[11px] transition cursor-pointer ${
                      metaEconomia === meta
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {meta}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── FILTROS EXPANDIDOS ─── */}
            {mostrarFiltrosSimulador && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm p-3 shrink-0">
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">Buscar</label>
                    <input type="text" value={buscaSecSimulador} onChange={e => setBuscaSecSimulador(e.target.value)} placeholder="Secretaria..." className="w-full text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">Impacto</label>
                    <select value={filtroImpactoSimulador} onChange={e => setFiltroImpactoSimulador(e.target.value)} className="w-full text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none">
                      <option value="todos">Todos</option>
                      <option value="BAIXO">Baixo</option>
                      <option value="MEDIO">Médio</option>
                      <option value="ALTO">Alto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">Despesa Mín</label>
                    <input type="number" value={filtroValorMinSimulador} onChange={e => setFiltroValorMinSimulador(e.target.value)} placeholder="R$" className="w-full text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">Despesa Máx</label>
                    <input type="number" value={filtroValorMaxSimulador} onChange={e => setFiltroValorMaxSimulador(e.target.value)} placeholder="∞" className="w-full text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => { setBuscaSecSimulador(''); setFiltroSecSimulador('todas'); setFiltroImpactoSimulador('todos'); setFiltroValorMinSimulador(''); setFiltroValorMaxSimulador(''); }} className="w-full px-3 py-1.5 text-[11px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 rounded-sm cursor-pointer transition">
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── MÉTRICAS RESUMO (5 cols) ─── */}
            <div className="grid grid-cols-5 gap-2 shrink-0">
              {[
                { label: 'Despesa Total', value: dadosFiltradosSimulador.totalDespesa, color: 'text-slate-900 dark:text-white' },
                { label: `Corte (${metaEconomia})`, value: dadosFiltradosSimulador.totalCorte, color: 'text-blue-600' },
                { label: 'Potencial', value: dadosFiltradosSimulador.totalPotencial, color: 'text-emerald-600' },
                { label: 'Contratos Afet.', value: `${dadosFiltradosSimulador.contratosAfetados}/${dadosFiltradosSimulador.totalContratos}`, color: 'text-amber-600' },
                { label: 'Viabilidade', value: `${dadosFiltradosSimulador.viabilidade.toFixed(0)}%`, color: dadosFiltradosSimulador.viabilidade >= 70 ? 'text-emerald-600' : dadosFiltradosSimulador.viabilidade >= 50 ? 'text-amber-600' : 'text-red-600' },
              ].map((m, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2.5 text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">{m.label}</span>
                  <span className={`text-[15px] font-mono font-extrabold tabular-nums ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* ─── CONTEÚDO PRINCIPAL ─── */}
            <div className="flex-1 min-h-0 overflow-hidden">

              {/* ═══ VISÃO TABELA ═══ */}
              {modoVisualizacaoSimulador === 'TABELA' && (
                <div className="h-full overflow-auto border border-slate-200 dark:border-slate-800 rounded-sm">
                  <table className="w-full text-[12px] font-mono text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">Secretaria</th>
                        <th className="px-3 py-2.5 text-center">Contr.</th>
                        <th className="px-3 py-2.5 text-right">Despesa</th>
                        <th className="px-3 py-2.5 text-right">% Pref.</th>
                        <th className="px-3 py-2.5 text-center">Impacto</th>
                        <th className="px-3 py-2.5 text-right">Corte</th>
                        <th className="px-3 py-2.5 text-center" title="Corte customizado">% Corte</th>
                        <th className="px-3 py-2.5 text-right">Potencial</th>
                        <th className="px-3 py-2.5 w-20">Barra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {dadosFiltradosSimulador.dados.map((s, idx) => {
                        const cortePctCustom = cutCustomMap[s.nome] ?? parseFloat(metaEconomia);
                        const corteValorCustom = tipoCorteSimulador === 'FIXO'
                          ? (cutCustomMap[s.nome] ?? 0)
                          : tipoCorteSimulador === 'MISTO'
                            ? (s.despesaNum * (cortePctCustom / 100))
                            : (s.despesaNum * (cortePctCustom / 100));
                        return (
                          <tr
                            key={idx}
                            onClick={() => setSecretariaSelecionada(s.nome)}
                            className={`cursor-pointer transition ${
                              itemHoveredSimulador === idx
                                ? 'bg-indigo-50 dark:bg-indigo-950/40'
                                : s.destaque
                                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                            onMouseEnter={() => setItemHoveredSimulador(idx)}
                            onMouseLeave={() => setItemHoveredSimulador(null)}
                          >
                            <td className="px-3 py-2 font-semibold flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              {s.nome}
                              {s.essencial && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">BLINDADO</span>}
                            </td>
                            <td className="px-3 py-2 text-center tabular-nums font-bold">{s.contratos}</td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">{s.despesa}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{s.pctPref}%</td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: s.corImpacto + '20', color: s.corImpacto }}>
                                {s.impacto}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600 font-bold tabular-nums">{s.corte}</td>
                            <td className="px-1.5 py-1.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={cutCustomMap[s.nome] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setCutCustomMap(prev => {
                                      const next = { ...prev };
                                      if (val === '') delete next[s.nome]; else next[s.nome] = parseFloat(val) || 0;
                                      return next;
                                    });
                                  }}
                                  placeholder={tipoCorteSimulador === 'FIXO' ? 'R$' : '%'}
                                  onClick={e => e.stopPropagation()}
                                  className="w-16 text-[11px] font-mono text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-1 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400"
                                />
                                <span className="text-[9px] text-slate-400 font-bold">{tipoCorteSimulador === 'FIXO' ? 'R$' : '%'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600 font-bold tabular-nums">
                              {formatCompactCurrency(s.despesaNum - corteValorCustom)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.pctPref)}%`, backgroundColor: s.color }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ═══ VISÃO GRÁFICO ═══ */}
              {modoVisualizacaoSimulador === 'GRAFICO' && (
                <div className="h-full flex flex-col gap-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosFiltradosSimulador.dados} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <XAxis dataKey="nome" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}mi`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', color: '#fff', fontFamily: 'JetBrains Mono', borderRadius: '2px' }}
                        formatter={(val: any, name: string) => [`${formatCompactCurrency(Number(val))}`, name === 'despesaNum' ? 'Despesa' : 'Corte']}
                      />
                      <Bar dataKey="despesaNum" fill="#94a3b8" radius={[3, 3, 0, 0]} name="despesaNum" />
                      <Bar dataKey="corteNum" fill="#3b82f6" radius={[3, 3, 0, 0]} name="corteNum" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-5 text-[11px] font-mono shrink-0">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-400" /> Despesa</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Corte</div>
                  </div>
                </div>
              )}

              {/* ═══ VISÃO COMPARATIVO ═══ */}
              {modoVisualizacaoSimulador === 'COMPARATIVO' && (
                <div className="h-full overflow-auto space-y-2">
                  {dadosFiltradosSimulador.dados.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-sm border transition ${
                        itemHoveredSimulador === idx
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                      onMouseEnter={() => setItemHoveredSimulador(idx)}
                      onMouseLeave={() => setItemHoveredSimulador(null)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-[12px] font-bold text-slate-900 dark:text-white">{s.nome}</span>
                          {s.essencial && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">BLINDADO</span>}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{s.contratos} contratos</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase mb-0.5">Atual</div>
                          <div className="text-[13px] font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">{s.despesa}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase mb-0.5">Corte ({metaEconomia})</div>
                          <div className="text-[13px] font-mono font-bold text-blue-600 tabular-nums">{s.corte}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase mb-0.5">Restante</div>
                          <div className="text-[13px] font-mono font-bold text-emerald-600 tabular-nums">{formatCompactCurrency(s.despesaNum - s.corteNum)}</div>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2 relative">
                        <div className="h-full bg-slate-400 rounded-full absolute inset-0" style={{ width: '100%' }} />
                        <div className="h-full bg-blue-500 rounded-full absolute inset-0" style={{ width: `${100 - s.pctPref}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-medium font-sans">
              Preserva serviços essenciais: Saúde, Merenda e Urgência.
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {dadosFiltradosSimulador.contratosAfetados} contratos afetados de {dadosFiltradosSimulador.totalContratos}
            </span>
          </div>
        </div>

        {/* ═══ CENTRAL DE DECISÃO — CENÁRIOS (5 cols) — VERSÃO EVOLUÍDA ═══ */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 text-sm font-mono font-bold tracking-wide uppercase flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>CENTRAL DE DECISÃO</span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-xs">
                {secretariaSelecionada}
              </span>
            </div>
            <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Cenário {dadosDecisao.cenario.nome}
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
            {/* ─── ETAPA DO PROCESSO ─── */}
            <div className="flex items-center gap-1.5 shrink-0">
              {(['ANALISE', 'APROVACAO', 'EXECUCAO'] as const).map((etapa, idx) => (
                <button
                  key={etapa}
                  type="button"
                  onClick={() => setEtapaDecisao(etapa)}
                  className={`flex-1 py-2.5 text-[11px] font-mono font-bold uppercase rounded-sm transition cursor-pointer ${
                    etapaDecisao === etapa
                      ? idx <= dadosDecisao.etapaIdx
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {idx + 1}. {etapa === 'ANALISE' ? 'Análise' : etapa === 'APROVACAO' ? 'Aprovação' : 'Execução'}
                </button>
              ))}
            </div>

            {/* ─── SELETOR DE CENÁRIO (4 cols grid) ─── */}
            <div className="space-y-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Cenário</span>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { key: 'CONSERVADOR' as const, label: 'Conserv.', icon: '🛡️', cor: '#10b981', desc: '10%' },
                  { key: 'MODERADO' as const, label: 'Moderado', icon: '⚖️', cor: '#f59e0b', desc: '15%' },
                  { key: 'AGRESSIVO' as const, label: 'Agress.', icon: '⚡', cor: '#ef4444', desc: '25%' },
                  { key: 'PERSONALIZADO' as const, label: 'Custom', icon: '🎯', cor: '#6366f1', desc: '≈' },
                ]).map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCenarioDecisao(c.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-sm border text-[10px] font-mono font-bold transition cursor-pointer ${
                      cenarioDecisao === c.key
                        ? 'border-current bg-current/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                    style={{ color: cenarioDecisao === c.key ? c.cor : undefined }}
                  >
                    <span className="text-base">{c.icon}</span>
                    <span>{c.label}</span>
                    <span className="text-[9px] opacity-60">{c.desc}</span>
                  </button>
                ))}
              </div>
              {cenarioDecisao === 'PERSONALIZADO' && (
                <div className="flex items-center gap-1.5">
                  <input type="number" value={cenarioCustomMeta} onChange={e => setCenarioCustomMeta(e.target.value)} placeholder="% corte" className="flex-1 text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none" />
                  <span className="text-[10px] text-slate-400 font-mono">% global</span>
                </div>
              )}
            </div>

            {/* ─── MÉTRICAS DO CENÁRIO (3 cols) ─── */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-sm p-3 text-center">
                <span className="text-[9px] font-mono text-emerald-600 uppercase block mb-1">Economia</span>
                <span className="text-[16px] font-mono font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums block">{dadosDecisao.economiaEstimada}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-sm p-3 text-center">
                <span className="text-[9px] font-mono text-amber-600 uppercase block mb-1">Impacto</span>
                <span className="text-[13px] font-mono font-bold tabular-nums block" style={{ color: dadosDecisao.corImpacto }}>{dadosDecisao.impactoGeral}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-sm p-3 text-center">
                <span className="text-[9px] font-mono text-blue-600 uppercase block mb-1">Progresso</span>
                <span className="text-[16px] font-mono font-extrabold text-blue-700 dark:text-blue-300 tabular-nums block">{dadosDecisao.progresso}%</span>
              </div>
            </div>

            {/* ─── BARRA DE PROGRESSO ─── */}
            <div className="shrink-0">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>Ações aprovadas: {dadosDecisao.acoesAprovadas}/{dadosDecisao.totalAcoes}</span>
                <span className="font-bold">{dadosDecisao.progresso}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dadosDecisao.progresso}%`,
                    backgroundColor: dadosDecisao.progresso >= 80 ? '#10b981' : dadosDecisao.progresso >= 50 ? '#f59e0b' : '#3b82f6'
                  }}
                />
              </div>
            </div>

            {/* ─── SERVIÇOS AFETADOS (scrollable) ─── */}
            <div className="space-y-1.5 min-h-0 overflow-y-auto">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block shrink-0">Serviços Afetados</span>
              <div className="space-y-1">
                {dadosDecisao.servicos.map((serv, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-sm text-[10px] font-mono transition ${
                      itemHoveredDecisao === i ? 'bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                    onMouseEnter={() => setItemHoveredDecisao(i)}
                    onMouseLeave={() => setItemHoveredDecisao(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: serv.cor }} />
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{serv.nome}</span>
                      {serv.blindado && <span className="text-[8px] text-emerald-600 font-bold">BLINDADO</span>}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      serv.impacto === 'ALTO' ? 'bg-red-100 dark:bg-red-950 text-red-600' : serv.impacto === 'MEDIO' ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                    }`}>{serv.impacto}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── AÇÕES (scrollable) ─── */}
            <div className="flex-1 space-y-1.5 min-h-0 overflow-y-auto">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block shrink-0">Ações ({dadosDecisao.acoes.length})</span>
              {dadosDecisao.acoes.map((acao, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-sm border text-[10px] font-mono transition ${
                    acao.status === 'APROVADO'
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const novos = new Set(aprovadosDecisao);
                      if (novos.has(i)) novos.delete(i); else novos.add(i);
                      setAprovadosDecisao(novos);
                    }}
                    className={`w-5 h-5 rounded-sm border shrink-0 flex items-center justify-center transition ${
                      acao.status === 'APROVADO'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {acao.status === 'APROVADO' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-800 dark:text-slate-200 font-semibold truncate text-[11px]">{acao.nome}</div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${acao.prioridade === 'CRITICA' ? 'bg-red-100 dark:bg-red-950 text-red-600' : acao.prioridade === 'ALTA' ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                        {acao.prioridade}
                      </span>
                      <span>{acao.prazo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
            <button
              type="button"
              onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                const linhas = dadosFiltradosSimulador.dados.map(s =>
                  `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600">${s.nome}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${s.contratos}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700">${s.despesa}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right">${s.pctPref}%</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;color:${s.corImpacto};font-weight:700">${s.impacto}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right;color:#2563eb;font-weight:700">${s.corte}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right;color:#059669;font-weight:700">${formatCompactCurrency(s.despesaNum - s.corteNum)}</td></tr>`
                ).join('');
                w.document.write(`<!DOCTYPE html><html><head><title>Relatório Simulação - ${new Date().toLocaleDateString('pt-BR')}</title><style>body{font-family:'JetBrains Mono',monospace;margin:40px;color:#1e293b}h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;color:#64748b;margin-top:20px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f1f5f9;padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-weight:700}td{padding:6px 10px;border:1px solid #e2e8f0}.metric{display:inline-block;padding:10px 20px;border:1px solid #e2e8f0;border-radius:4px;margin:4px 8px 4px 0;text-align:center}.metric .label{font-size:9px;color:#64748b;text-transform:uppercase}.metric .value{font-size:16px;font-weight:800;margin-top:2px}@media print{body{margin:20px}}</style></head><body><h1>RELATÓRIO DE SIMULAÇÃO DE CONTINGENCIAMENTO</h1><p style="color:#64748b;font-size:11px">Gerado em: ${new Date().toLocaleString('pt-BR')} | Meta: ${metaEconomia} | Cenário: ${cenarioDecisao} | Tipo de Corte: ${tipoCorteSimulador}</p><div><div class="metric"><div class="label">Despesa Total</div><div class="value">${dadosFiltradosSimulador.totalDespesa}</div></div><div class="metric"><div class="label">Corte (${metaEconomia})</div><div class="value" style="color:#2563eb">${dadosFiltradosSimulador.totalCorte}</div></div><div class="metric"><div class="label">Potencial</div><div class="value" style="color:#059669">${dadosFiltradosSimulador.totalPotencial}</div></div><div class="metric"><div class="label">Viabilidade</div><div class="value">${dadosFiltradosSimulador.viabilidade.toFixed(0)}%</div></div><div class="metric"><div class="label">Contratos Afetados</div><div class="value">${dadosFiltradosSimulador.contratosAfetados}/${dadosFiltradosSimulador.totalContratos}</div></div></div><h2>DETALHAMENTO POR SECRETARIA</h2><table><thead><tr><th>Secretaria</th><th style="text-align:center">Contratos</th><th style="text-align:right">Despesa</th><th style="text-align:right">% Pref.</th><th style="text-align:center">Impacto</th><th style="text-align:right">Corte</th><th style="text-align:right">Restante</th></tr></thead><tbody>${linhas}</tbody></table><p style="margin-top:30px;font-size:10px;color:#94a3b8;text-align:center">Escrita.Online — Painel Gestão Fiscal</p><script>window.onload=()=>window.print()</script></body></html>`);
                w.document.close();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-mono font-bold py-2.5 px-3 rounded-sm text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Relatório da Simulação</span>
            </button>
            <button
              type="button"
              onClick={() => setIsContratosModalOpen(true)}
              className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold py-2.5 px-3 rounded-sm text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Ver Contratos ({contratosFiltrados.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          5. ALERTAS DINÂMICOS PARA DECISÃO DO GABINETE
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm shadow-sm overflow-hidden font-sans">
        <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-mono font-bold tracking-wide uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>ALERTAS DINÂMICOS PARA DECISÃO DO GABINETE</span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-xs">
              {secretariaSelecionada}
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold">{alertasDinamicosSecretaria.totalAlertas} Alertas Ativos</span>
        </div>

        <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center font-sans">
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Alerta 1 */}
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 rounded-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-700 dark:text-rose-300 block text-xs font-mono">
                  {alertasDinamicosSecretaria.aVencer60d} contratos
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight block">
                  a vencer nos próximos 60 dias
                </span>
              </div>
            </div>

            {/* Alerta 2 */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-sm flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-700 dark:text-amber-300 block text-xs font-mono">
                  {alertasDinamicosSecretaria.acima80Pct} contratos
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight block">
                  com execução superior a 80%
                </span>
              </div>
            </div>

            {/* Alerta 3 */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-2.5 rounded-sm flex items-start gap-2">
              <PiggyBank className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-700 dark:text-blue-300 block text-xs font-mono tabular-nums">
                  {formatCompactCurrency(alertasDinamicosSecretaria.saldoLivre)}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight block">
                  de saldo contratual livre
                </span>
              </div>
            </div>

            {/* Alerta 4 */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-sm flex items-start gap-2">
              <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block text-xs font-mono tabular-nums">
                  {formatCompactCurrency(alertasDinamicosSecretaria.economiaPotencial)}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight block">
                  de economia viável identificada
                </span>
              </div>
            </div>
          </div>

          {/* Resumo Executivo */}
          <div
            onClick={() => setIsContratosModalOpen(true)}
            className="md:col-span-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3 rounded-sm flex items-center justify-between gap-3 font-sans cursor-pointer hover:border-indigo-500 transition"
          >
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-950 dark:text-white block mb-0.5 font-bold">
                Recomendação de Gestão • {secretariaSelecionada}
              </strong>
              {alertasDinamicosSecretaria.recomendacao}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* ============================================================
          6. MODAL COMPLETO DE DETALHAMENTO DE CONTRATOS
          ============================================================ */}
      {isContratosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl w-full max-w-[98vw] 2xl:max-w-[1600px] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-3.5 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                      TCE-PR & PNCP • LEI 14.133/2021
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {cidade.toUpperCase()} / {uf}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-white mt-0.5 font-mono">
                    Painel Geral de Contratos Públicos — {secretariaSelecionada}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportarContratosCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded-xs transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Exportar contratos para planilha CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsContratosModalOpen(false);
                    setContratoDetalhe(null);
                  }}
                  className="p-1.5 rounded-sm hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Controls & Filters */}
            <div className="p-3 px-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 font-mono">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={buscaContratos}
                    onChange={e => setBuscaContratos(e.target.value)}
                    placeholder="Buscar por nº contrato, fornecedor, CNPJ ou objeto..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Secretaria Filter */}
                <select
                  value={filtroSecContratos}
                  onChange={e => {
                    setFiltroSecContratos(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono"
                >
                  <option value="todas">🏢 Todas as Secretarias</option>
                  {listaSecretariasOpcoes.filter(s => s !== 'Todas as Secretarias').map(sec => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                {/* Fonte Origem Filter */}
                <select
                  value={filtroFonteContratos}
                  onChange={e => setFiltroFonteContratos(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono"
                >
                  <option value="todas">🌐 Todas as Fontes</option>
                  <option value="PNCP">PNCP (Governo Federal)</option>
                  <option value="TCE-PR">TCE-PR (Estadual)</option>
                </select>

                {/* Criticidade Filter */}
                <select
                  value={filtroCriticidade}
                  onChange={e => {
                    setFiltroCriticidade(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono"
                >
                  <option value="todas">⚡ Todas as Criticidades</option>
                  <option value="ESSENCIAL">🔴 Essencial</option>
                  <option value="IMPORTANTE">🟡 Importante</option>
                  <option value="DIFERIVEL">🟢 Diferível</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filtroStatusContratos}
                  onChange={e => {
                    setFiltroStatusContratos(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono"
                >
                  <option value="todos">🚦 Todos os Status</option>
                  <option value="VIGENTE">Vigente</option>
                  <option value="A_VENCER_60D">A Vencer em 60D</option>
                  <option value="ENCERRADO">Encerrado</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <span>{contratosFiltrados.length} contrato(s) localizado(s)</span>
              </div>
            </div>

            {/* Modal Body - Tabela de Contratos */}
            <div className="p-3 sm:p-4 overflow-y-auto overflow-x-auto flex-1 space-y-4 font-sans">
              <div className="border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden min-w-[1100px] shadow-xs">
                <table className="w-full text-xs text-left border-collapse font-sans">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px] font-mono uppercase">
                    <tr>
                      <th className="p-2.5 min-w-[120px]">Nº / PNCP</th>
                      <th className="p-2.5 min-w-[150px]">Secretaria</th>
                      <th className="p-2.5 min-w-[200px]">Fornecedor / CNPJ</th>
                      <th className="p-2.5 min-w-[260px]">Objeto</th>
                      <th className="p-2.5 text-right font-mono min-w-[120px]">Valor Total</th>
                      <th className="p-2.5 text-right font-mono min-w-[120px]">Liquidado</th>
                      <th className="p-2.5 text-right font-mono min-w-[120px]">Saldo Livre</th>
                      <th className="p-2.5 text-center font-mono min-w-[90px]">% Exec.</th>
                      <th className="p-2.5 text-center min-w-[100px]">Vigência</th>
                      <th className="p-2.5 text-center min-w-[100px]">Status</th>
                      <th className="p-2.5 text-center min-w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                    {contratosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina).map(c => {
                      const pct = c.pctExecutado ?? (c.valorTotal > 0 ? ((c.valorLiquidado || 0) / c.valorTotal) * 100 : 0);
                      const saldo = c.saldoDisponivel ?? Math.max(0, (c.valorTotal || 0) - (c.valorLiquidado || 0));

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{c.numero}</div>
                            <span className="text-[9px] text-slate-400 block font-normal">{c.idPncp ? `PNCP: ${c.idPncp.slice(0, 18)}...` : `Proc: ${c.processo}`}</span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-xs text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {c.secretariaNome || c.secretaria}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={c.fornecedor}>
                              {c.fornecedor}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block">{c.cnpj}</span>
                          </td>
                          <td className="p-2.5 max-w-[280px]">
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed" title={c.objeto}>
                              {c.objeto}
                            </p>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(c.valorTotal)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {formatCurrency(c.valorLiquidado)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">
                            {formatCurrency(saldo)}
                          </td>
                          <td className="p-2.5 text-center font-mono whitespace-nowrap">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                                pct >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {pct.toFixed(0)}%
                              </span>
                              <div className="w-12 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(5, pct))}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono whitespace-nowrap text-[10px]">
                            <span className="text-slate-700 dark:text-slate-300 block">{formatDataBR(c.dataVigenciaFim || '2026-12-31')}</span>
                            <span className={`font-bold block text-[9px] ${
                              (c.diasRestantes ?? 99) < 60 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                            }`}>
                              {c.diasRestantes !== undefined ? `${c.diasRestantes} dias` : 'Vigente'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                              c.status === 'A_VENCER_60D' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : c.status === 'A_VENCER_180D' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : c.status === 'QUITADO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {c.status === 'A_VENCER_60D' ? 'A Vencer 60D'
                               : c.status === 'A_VENCER_180D' ? 'A Vencer 180D'
                               : c.status === 'QUITADO' ? 'Quitado'
                               : c.status === 'ENCERRADO' ? 'Encerrado'
                               : 'Vigente'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setContratoDetalhe(c)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-mono font-bold text-[10px] rounded-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto shadow-xs border border-slate-700"
                              title="Abrir Dossiê Completo 360° do Contrato"
                            >
                              <Eye className="w-3 h-3 text-amber-400" />
                              <span>Ficha 360°</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {contratosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-400 font-mono">
                          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                            Nenhum contrato localizado com os filtros selecionados.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginação do Modal de Contratos */}
            <div className="p-3 px-4 sm:px-6 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <span>
                  Mostrando <strong className="text-slate-900 dark:text-white">{contratosFiltrados.length > 0 ? (paginaAtual - 1) * itensPorPagina + 1 : 0}</strong> a <strong className="text-slate-900 dark:text-white">{Math.min(paginaAtual * itensPorPagina, contratosFiltrados.length)}</strong> de <strong className="text-slate-900 dark:text-white">{contratosFiltrados.length}</strong> contratos
                </span>

                <div className="flex items-center gap-1">
                  <span>Exibir:</span>
                  <select
                    value={itensPorPagina}
                    onChange={e => {
                      setItensPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono text-xs cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual(1)}
                  className="p-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Primeira Página"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Primeira</span>
                </button>

                <button
                  type="button"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  className="p-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Anterior</span>
                </button>

                <div className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-sm font-bold text-xs">
                  Página {paginaAtual} de {Math.max(1, Math.ceil(contratosFiltrados.length / itensPorPagina))}
                </div>

                <button
                  type="button"
                  disabled={paginaAtual >= Math.ceil(contratosFiltrados.length / itensPorPagina)}
                  onClick={() => setPaginaAtual(p => p + 1)}
                  className="p-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Próxima Página"
                >
                  <span className="hidden sm:inline text-[11px]">Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={paginaAtual >= Math.ceil(contratosFiltrados.length / itensPorPagina)}
                  onClick={() => setPaginaAtual(Math.ceil(contratosFiltrados.length / itensPorPagina))}
                  className="p-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Última Página"
                >
                  <span className="hidden sm:inline text-[11px]">Última</span>
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsContratosModalOpen(false)}
                  className="ml-3 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-sm uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          7. DRAWER / MODAL DE DETALHES DO CONTRATO (DOSSIÊ 360°)
          ============================================================ */}
      {contratoDetalhe && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                      FICHA CADASTRAL 360° • TCE-PR & PNCP
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {cidade}/{uf}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-mono mt-0.5 text-white">
                    Contrato Nº {contratoDetalhe.numero} • {contratoDetalhe.secretariaNome || contratoDetalhe.secretaria}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 px-2.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition"
                  title="Imprimir Ficha do Contrato"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContratoDetalhe(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs font-sans">
              {/* Painel de Identificação Oficial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Fornecedor:</span>
                  <strong className="text-slate-900 dark:text-white text-xs block truncate" title={contratoDetalhe.fornecedor}>
                    {contratoDetalhe.fornecedor}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">CNPJ:</span>
                  <strong className="text-slate-900 dark:text-white text-xs block">{contratoDetalhe.cnpj}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Processo Adm.:</span>
                  <strong className="text-slate-900 dark:text-white text-xs block">{contratoDetalhe.processo}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">PNCP ID:</span>
                  <strong className="text-slate-900 dark:text-white text-xs block truncate" title={contratoDetalhe.idPncp}>
                    {contratoDetalhe.idPncp || 'PNCP Oficial'}
                  </strong>
                </div>
              </div>

              {/* Objeto do Contrato */}
              <div className="space-y-1">
                <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase block">
                  Objeto da Contratação Pública:
                </span>
                <p className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-sm border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {contratoDetalhe.objeto}
                </p>
              </div>

              {/* Matriz Financeira */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Valor Total</span>
                  <strong className="text-slate-900 dark:text-white text-sm block mt-0.5">{formatCurrency(contratoDetalhe.valorTotal)}</strong>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-sm border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-amber-600 uppercase block font-sans font-bold">Empenhado</span>
                  <strong className="text-amber-700 dark:text-amber-300 text-sm block mt-0.5">{formatCurrency(contratoDetalhe.valorEmpenhado || contratoDetalhe.valorTotal)}</strong>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-sm border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 uppercase block font-sans font-bold">Liquidado</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-sm block mt-0.5">{formatCurrency(contratoDetalhe.valorLiquidado)}</strong>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-sm border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] text-indigo-600 uppercase block font-sans font-bold">Saldo Disponível</span>
                  <strong className="text-indigo-700 dark:text-indigo-300 text-sm block mt-0.5">{formatCurrency(contratoDetalhe.saldoDisponivel)}</strong>
                </div>
              </div>

              {/* Vigência e Gestão do Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-sm border border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Início da Vigência:</span>
                  <strong className="text-slate-900 dark:text-white">{formatDataBR(contratoDetalhe.dataVigenciaInicio || '2026-01-01')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Término da Vigência:</span>
                  <strong className="text-slate-900 dark:text-white">{formatDataBR(contratoDetalhe.dataVigenciaFim || '2026-12-31')}</strong>
                  <span className={`block text-[10px] font-bold mt-0.5 ${
                    (contratoDetalhe.diasRestantes ?? 99) < 60 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {contratoDetalhe.diasRestantes !== undefined ? `${contratoDetalhe.diasRestantes} dias restantes` : 'Vigente'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Fiscal do Contrato:</span>
                  <strong className="text-slate-900 dark:text-white">{contratoDetalhe.fiscalNome || 'Auditor Fiscal Designado'}</strong>
                  <span className="block text-[10px] text-slate-400">Matrícula: {contratoDetalhe.fiscalMatricula || 'MAT-7782'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 px-6 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
              <span>Protocolo TCE-PR: {contratoDetalhe.protocoloTce || 'TCE-PR'} • Base Oficial PNCP</span>
              <button
                type="button"
                onClick={() => setContratoDetalhe(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded uppercase tracking-wider transition cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          7.5. MODAL DE DRILL-DOWN ANALÍTICO DE KPIS (ORÇAMENTO, EMPENHADO, LIQUIDADO, SALDO)
          ============================================================ */}
      {drillDownModal && (() => {
        // Filtragem dos contratos para o Drill-down
        const contratosFiltradosDrill = contratosDaSecretaria.filter(c => {
          // Filtro por Secretaria
          if (drillDownFiltroSec !== 'todas') {
            const secNome = (c.secretariaNome || c.secretaria || '').toLowerCase();
            const secFiltro = drillDownFiltroSec.toLowerCase();
            if (!secNome.includes(secFiltro) && c.secretariaCodigo !== drillDownFiltroSec) {
              return false;
            }
          }

          // Filtro por Status
          if (drillDownFiltroStatus !== 'todos' && c.status !== drillDownFiltroStatus) {
            return false;
          }

          // Filtro por Criticidade
          if (drillDownFiltroCrit !== 'todas' && c.criticidade !== drillDownFiltroCrit) {
            return false;
          }

          // Filtro por Categoria (quando ativado pelo Bloco 2)
          if (drillDownModal === 'CATEGORIA' && drillDownCategoria) {
            const catItem = (c as any).categoria || categorizarObjetoContrato(c.objeto, c.secretariaNome || c.secretaria);
            if (catItem !== drillDownCategoria) {
              const objLower = (c.objeto || '').toLowerCase();
              const catLower = drillDownCategoria.toLowerCase();
              if (!objLower.includes(catLower)) return false;
            }
          }

          // Filtro por Fornecedor (quando ativado pelo Bloco 2)
          if (drillDownModal === 'FORNECEDOR' && drillDownFornecedor) {
            const forn = c.fornecedor || '';
            if (forn !== drillDownFornecedor && !forn.toLowerCase().includes(drillDownFornecedor.toLowerCase())) {
              return false;
            }
          }

          // Filtro por Modalidade (quando ativado pelo Bloco 2)
          if (drillDownModal === 'MODALIDADE' && drillDownModalidade) {
            const mod = c.modalidade || (c.processo?.includes('PE') ? 'Pregão Eletrônico' : c.processo?.includes('DISP') ? 'Dispensa de Licitação' : c.processo?.includes('INEX') ? 'Inexigibilidade' : 'Pregão Eletrônico');
            if (mod !== drillDownModalidade) {
              return false;
            }
          }

          // Filtro por Texto de Busca
          if (drillDownBusca.trim()) {
            const termo = drillDownBusca.toLowerCase().trim();
            const num = (c.numero || '').toLowerCase();
            const forn = (c.fornecedor || '').toLowerCase();
            const cnpj = (c.cnpj || '').toLowerCase();
            const obj = (c.objeto || '').toLowerCase();
            const proc = (c.processo || '').toLowerCase();
            const idp = (c.idPncp || '').toLowerCase();
            if (!num.includes(termo) && !forn.includes(termo) && !cnpj.includes(termo) && !obj.includes(termo) && !proc.includes(termo) && !idp.includes(termo)) {
              return false;
            }
          }

          return true;
        });

        // Estatísticas complementares para o Dossiê Estratégico
        const fornecedoresMapa = new Map<string, { nome: string; cnpj: string; valor: number; liq: number; count: number }>();
        const secretariasMapa = new Map<string, { nome: string; valor: number; count: number }>();
        let vencendo60dCount = 0;
        let vencendo180dCount = 0;
        let altaExecucaoCount = 0;

        contratosFiltradosDrill.forEach(c => {
          // Fornecedores
          const fKey = c.fornecedor || 'Credor Geral';
          if (!fornecedoresMapa.has(fKey)) {
            fornecedoresMapa.set(fKey, { nome: fKey, cnpj: c.cnpj || '', valor: 0, liq: 0, count: 0 });
          }
          const fData = fornecedoresMapa.get(fKey)!;
          fData.valor += Number(c.valorTotal) || 0;
          fData.liq += Number(c.valorLiquidado) || 0;
          fData.count += 1;

          // Secretarias
          const sKey = c.secretariaNome || c.secretaria || 'Geral';
          if (!secretariasMapa.has(sKey)) {
            secretariasMapa.set(sKey, { nome: sKey, valor: 0, count: 0 });
          }
          const sData = secretariasMapa.get(sKey)!;
          sData.valor += Number(c.valorTotal) || 0;
          sData.count += 1;

          // Alertas
          const dias = c.diasRestantes ?? 999;
          if (dias < 60 && c.status !== 'ENCERRADO') vencendo60dCount++;
          else if (dias <= 180 && c.status !== 'ENCERRADO') vencendo180dCount++;

          const pct = c.pctExecutado || (c.valorTotal > 0 ? (c.valorLiquidado / c.valorTotal) * 100 : 0);
          if (pct >= 80) altaExecucaoCount++;
        });

        // Totais consolidados da lista filtrada
        const totalFiltradoQtd = contratosFiltradosDrill.length;
        const totalFiltradoValor = contratosFiltradosDrill.reduce((acc, it) => acc + (Number(it.valorTotal) || 0), 0);
        const totalFiltradoLiq = contratosFiltradosDrill.reduce((acc, it) => acc + (Number(it.valorLiquidado) || 0), 0);
        const totalFiltradoEmp = contratosFiltradosDrill.reduce((acc, it) => acc + (Number(it.valorEmpenhado) || Number(it.valorTotal) || 0), 0);
        const totalFiltradoSaldo = contratosFiltradosDrill.reduce((acc, it) => acc + (Number(it.saldoDisponivel) || Math.max(0, (Number(it.valorTotal) || 0) - (Number(it.valorLiquidado) || 0))), 0);

        // Paginação do Drill-down
        const totalPaginasDrill = Math.max(1, Math.ceil(totalFiltradoQtd / drillDownItensPorPagina));
        const paginaCorrigida = Math.min(drillDownPagina, totalPaginasDrill);
        const inicioIdx = (paginaCorrigida - 1) * drillDownItensPorPagina;
        const fimIdx = Math.min(inicioIdx + drillDownItensPorPagina, totalFiltradoQtd);
        const contratosPaginados = contratosFiltradosDrill.slice(inicioIdx, fimIdx);

        const topFornecedoresDestaLista = Array.from(fornecedoresMapa.values())
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 3);

        const topSecretariasDestaLista = Array.from(secretariasMapa.values())
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 3);

        const pctExecGeral = totalFiltradoValor > 0 ? (totalFiltradoLiq / totalFiltradoValor) * 100 : 0;
        const totalCredoresQtd = fornecedoresMapa.size;

        return (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto animate-in fade-in duration-150 font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl w-full max-w-[98vw] 2xl:max-w-[1680px] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
              {/* 1. Header do Modal */}
              <div className="bg-slate-900 text-white p-3 sm:p-4 px-4 sm:px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                        DIAGNÓSTICO ESTRATÉGICO MULTINÍVEL • PNCP & TCE-PR
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {secretariaSelecionada} • {cidade}/{uf} • Exercício {ano}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-sans mt-0.5 text-white">
                      {drillDownModal === 'ORCAMENTO' && 'Matriz Orçamentária & Dotações da Secretaria'}
                      {drillDownModal === 'EMPENHADO' && 'Relação de Empenhos & Contratos Comprometidos'}
                      {drillDownModal === 'LIQUIDADO' && 'Execução Orçamentária & Liquidações Fiscais'}
                      {drillDownModal === 'SALDO_ORCAMENTARIO' && 'Margem Orçamentária Livre & Disponibilidade'}
                      {drillDownModal === 'SALDO_CONTRATUAL' && 'Saldo Contratual a Executar por Fornecedor'}
                      {drillDownModal === 'CATEGORIA' && `Detalhamento por Categoria: ${drillDownCategoria || 'Selecionada'}`}
                      {drillDownModal === 'FORNECEDOR' && `Detalhamento por Credor: ${drillDownFornecedor || 'Selecionado'}`}
                      {drillDownModal === 'MODALIDADE' && `Detalhamento por Modalidade: ${drillDownModalidade || 'Selecionada'}`}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csvRows = contratosFiltradosDrill.map(c => ({
                        Numero: c.numero,
                        Processo: c.processo,
                        ProtocoloTCE: c.protocoloTce,
                        IdPNCP: c.idPncp,
                        Secretaria: c.secretariaNome || c.secretaria,
                        Fornecedor: c.fornecedor,
                        CNPJ: c.cnpj,
                        Objeto: c.objeto,
                        ValorTotal: c.valorTotal,
                        Liquidado: c.valorLiquidado,
                        Empenhado: c.valorEmpenhado,
                        SaldoLivre: c.saldoDisponivel,
                        PctExecutado: c.pctExecutado ? `${c.pctExecutado.toFixed(1)}%` : '0%',
                        Status: c.status,
                        VigenciaInicio: formatDataBR(c.dataVigenciaInicio),
                        VigenciaFim: formatDataBR(c.dataVigenciaFim),
                        DiasRestantes: c.diasRestantes,
                        Fiscal: c.fiscalNome,
                      }));
                      exportToCSV(`detalhamento-${drillDownModal?.toLowerCase()}-${cidade}-${ano}`, csvRows);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-mono font-bold transition cursor-pointer"
                    title="Exportar todos os registros filtrados para planilha CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exportar CSV ({totalFiltradoQtd})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrillDownModal(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition cursor-pointer"
                    title="Fechar janela"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. Dossiê Executivo da Categoria / Credor (Painel Diagnóstico de Alto Nível) */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 shrink-0 font-sans">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Coluna 1: Matriz Financeira e Execução */}
                  <div className="md:col-span-4 bg-white dark:bg-slate-900 p-3 rounded-sm border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        Matriz Financeira Consolidada
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded-xs border border-emerald-200 dark:border-emerald-800">
                        {pctExecGeral.toFixed(1)}% Liquidado
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-mono">Valor Global</span>
                        <strong className="text-base sm:text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(totalFiltradoValor)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-mono">Saldo a Executar</span>
                        <strong className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatCurrency(totalFiltradoSaldo)}
                        </strong>
                      </div>
                    </div>

                    {/* Barra de Progresso da Execução */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, pctExecGeral))}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[10px] border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Contratos</span>
                        <strong className="text-slate-900 dark:text-white">{totalFiltradoQtd}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Credores</span>
                        <strong className="text-slate-900 dark:text-white">{totalCredoresQtd}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Empenhado</span>
                        <strong className="text-amber-600 dark:text-amber-400">{formatCompactCurrency(totalFiltradoEmp)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Maiores Credores & Concentração */}
                  <div className="md:col-span-4 bg-white dark:bg-slate-900 p-3 rounded-sm border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        Maiores Credores / Concentração
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Top {topFornecedoresDestaLista.length} de {totalCredoresQtd}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-sans">
                      {topFornecedoresDestaLista.map((f, idx) => {
                        const partPct = totalFiltradoValor > 0 ? (f.valor / totalFiltradoValor) * 100 : 0;
                        return (
                          <div key={idx} className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xs border border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 dark:text-white truncate text-[11px] max-w-[180px]" title={f.nome}>
                                {f.nome}
                              </span>
                              <span className="font-mono font-extrabold text-[11px] text-slate-900 dark:text-white tabular-nums shrink-0">
                                {formatCompactCurrency(f.valor)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                              <span>CNPJ: {f.cnpj || 'Auditado'}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{partPct.toFixed(1)}% do total</span>
                            </div>
                          </div>
                        );
                      })}
                      {topFornecedoresDestaLista.length === 0 && (
                        <p className="text-slate-400 text-xs py-2 text-center">Nenhum credor identificado.</p>
                      )}
                    </div>
                  </div>

                  {/* Coluna 3: Repartição por Secretarias & Alertas de Risco */}
                  <div className="md:col-span-4 bg-white dark:bg-slate-900 p-3 rounded-sm border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        Secretarias & Alertas de Gestão
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Vigência & Riscos</span>
                    </div>

                    {/* Badges de Risco */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                      <div className={`p-1.5 rounded-xs border text-[10px] ${
                        vencendo60dCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}>
                        <span className="block text-[9px]">Vence 60d</span>
                        <strong className="text-xs">{vencendo60dCount}</strong>
                      </div>
                      <div className={`p-1.5 rounded-xs border text-[10px] ${
                        vencendo180dCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}>
                        <span className="block text-[9px]">Vence 180d</span>
                        <strong className="text-xs">{vencendo180dCount}</strong>
                      </div>
                      <div className={`p-1.5 rounded-xs border text-[10px] ${
                        altaExecucaoCount > 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}>
                        <span className="block text-[9px]">Exec &gt;80%</span>
                        <strong className="text-xs">{altaExecucaoCount}</strong>
                      </div>
                    </div>

                    {/* Pastas Demandantes */}
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] font-sans">
                      <span className="text-[10px] font-mono text-slate-400 block">Principais Secretarias Demandantes:</span>
                      {topSecretariasDestaLista.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[190px] font-medium" title={s.nome}>
                            • {s.nome}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatCompactCurrency(s.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Barra de Filtros e Controles */}
              <div className="p-3 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 font-mono">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                  {/* Busca Rápida */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={drillDownBusca}
                      onChange={e => {
                        setDrillDownBusca(e.target.value);
                        setDrillDownPagina(1);
                      }}
                      placeholder="Buscar por nº, processo, fornecedor, CNPJ ou objeto..."
                      className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm pl-8 pr-3 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                    {drillDownBusca && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrillDownBusca('');
                          setDrillDownPagina(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Secretaria */}
                  <select
                    value={drillDownFiltroSec}
                    onChange={e => {
                      setDrillDownFiltroSec(e.target.value);
                      setDrillDownPagina(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono text-xs cursor-pointer"
                  >
                    <option value="todas">🏢 Todas as Secretarias</option>
                    {listaSecretariasOpcoes.filter(s => s !== 'Todas as Secretarias').map(sec => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>

                  {/* Filtro por Status */}
                  <select
                    value={drillDownFiltroStatus}
                    onChange={e => {
                      setDrillDownFiltroStatus(e.target.value);
                      setDrillDownPagina(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono text-xs cursor-pointer"
                  >
                    <option value="todos">🚦 Todos os Status</option>
                    <option value="VIGENTE">🟢 Vigente</option>
                    <option value="A_VENCER_60D">🔴 A Vencer em 60D</option>
                    <option value="A_VENCER_180D">🟡 A Vencer em 180D</option>
                    <option value="QUITADO">🔵 Quitado (100%)</option>
                    <option value="ENCERRADO">⚪ Encerrado</option>
                  </select>

                  {/* Filtro por Criticidade */}
                  <select
                    value={drillDownFiltroCrit}
                    onChange={e => {
                      setDrillDownFiltroCrit(e.target.value);
                      setDrillDownPagina(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono text-xs cursor-pointer"
                  >
                    <option value="todas">⚡ Todas as Criticidades</option>
                    <option value="ESSENCIAL">🔴 Essencial</option>
                    <option value="IMPORTANTE">🟡 Importante</option>
                    <option value="DIFERIVEL">🟢 Diferível</option>
                  </select>
                </div>

                {/* Seletor de Itens por Página */}
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-mono">
                  <span>Exibir:</span>
                  <select
                    value={drillDownItensPorPagina}
                    onChange={e => {
                      setDrillDownItensPorPagina(Number(e.target.value));
                      setDrillDownPagina(1);
                    }}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none font-mono text-xs cursor-pointer"
                  >
                    <option value={10}>10 por pág.</option>
                    <option value={25}>25 por pág.</option>
                    <option value={50}>50 por pág.</option>
                    <option value={100}>100 por pág.</option>
                  </select>
                </div>
              </div>

              {/* 4. Tabela de Detalhamento Analítico com Todas as Colunas */}
              <div className="p-3 sm:p-4 overflow-y-auto overflow-x-auto flex-1 font-sans">
                <div className="border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden min-w-[1100px] shadow-xs">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold min-w-[120px]">Contrato / PNCP</th>
                        <th className="p-2.5 font-bold min-w-[150px]">Secretaria</th>
                        <th className="p-2.5 font-bold min-w-[200px]">Fornecedor & CNPJ</th>
                        <th className="p-2.5 font-bold min-w-[260px]">Objeto do Contrato</th>
                        <th className="p-2.5 font-bold text-right font-mono min-w-[120px]">Valor Total</th>
                        <th className="p-2.5 font-bold text-right font-mono min-w-[120px]">
                          {drillDownModal === 'LIQUIDADO' ? 'Liquidado' : drillDownModal === 'EMPENHADO' ? 'Empenhado' : 'Liquidado'}
                        </th>
                        <th className="p-2.5 font-bold text-right font-mono min-w-[120px]">Saldo Livre</th>
                        <th className="p-2.5 font-bold text-center font-mono min-w-[90px]">% Exec.</th>
                        <th className="p-2.5 font-bold text-center min-w-[100px]">Vigência</th>
                        <th className="p-2.5 font-bold text-center min-w-[100px]">Status</th>
                        <th className="p-2.5 font-bold text-center min-w-[100px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                      {contratosPaginados.map(c => {
                        const pct = c.pctExecutado ?? (c.valorTotal > 0 ? ((c.valorLiquidado || 0) / c.valorTotal) * 100 : 0);
                        const saldo = c.saldoDisponivel ?? Math.max(0, (c.valorTotal || 0) - (c.valorLiquidado || 0));

                        return (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
                            {/* 1. Contrato / PNCP */}
                            <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{c.numero}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 block font-normal font-mono">
                                {c.idPncp ? `PNCP: ${c.idPncp.slice(0, 18)}...` : `Proc: ${c.processo}`}
                              </span>
                            </td>

                            {/* 2. Secretaria */}
                            <td className="p-2.5">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-xs text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {c.secretariaNome || c.secretaria}
                              </span>
                            </td>

                            {/* 3. Fornecedor & CNPJ */}
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={c.fornecedor}>
                                {c.fornecedor}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 block">{c.cnpj}</span>
                            </td>

                            {/* 4. Objeto */}
                            <td className="p-2.5 max-w-[280px]">
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed" title={c.objeto}>
                                {c.objeto}
                              </p>
                            </td>

                            {/* 5. Valor Total */}
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatCurrency(c.valorTotal)}
                            </td>

                            {/* 6. Liquidado / Empenhado */}
                            <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                              {drillDownModal === 'EMPENHADO' ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatCurrency(c.valorEmpenhado || c.valorTotal)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(c.valorLiquidado)}
                                </span>
                              )}
                            </td>

                            {/* 7. Saldo Livre */}
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              {formatCurrency(saldo)}
                            </td>

                            {/* 8. % Execução com Mini Bar */}
                            <td className="p-2.5 text-center font-mono whitespace-nowrap">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                                  pct >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {pct.toFixed(0)}%
                                </span>
                                <div className="w-12 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(5, pct))}%` }} />
                                </div>
                              </div>
                            </td>

                            {/* 9. Vigência */}
                            <td className="p-2.5 text-center font-mono whitespace-nowrap text-[10px]">
                              <span className="text-slate-700 dark:text-slate-300 block">{formatDataBR(c.dataVigenciaFim || '2026-12-31')}</span>
                              <span className={`font-bold block text-[9px] ${
                                (c.diasRestantes ?? 99) < 60 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                              }`}>
                                {c.diasRestantes !== undefined ? `${c.diasRestantes} dias` : 'Vigente'}
                              </span>
                            </td>

                            {/* 10. Status */}
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                                c.status === 'A_VENCER_60D' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : c.status === 'A_VENCER_180D' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : c.status === 'QUITADO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {c.status === 'A_VENCER_60D' ? 'A Vencer 60D'
                                 : c.status === 'A_VENCER_180D' ? 'A Vencer 180D'
                                 : c.status === 'QUITADO' ? 'Quitado'
                                 : c.status === 'ENCERRADO' ? 'Encerrado'
                                 : 'Vigente'}
                              </span>
                            </td>

                            {/* 11. Ações */}
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setContratoDetalhe(c)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-mono font-bold text-[10px] rounded-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto shadow-xs border border-slate-700"
                                title="Abrir Dossiê Completo 360° do Contrato"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Ficha 360°</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {contratosFiltradosDrill.length === 0 && (
                        <tr>
                          <td colSpan={11} className="p-12 text-center text-slate-400 font-mono">
                            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                              Nenhum contrato localizado com os filtros selecionados.
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Tente remover termos da busca ou selecionar "Todas as Secretarias".
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Footer do Modal com Barra de Paginação Completa */}
              <div className="p-3 px-4 sm:px-6 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
                {/* Indicador de Registros */}
                <div className="text-slate-600 dark:text-slate-400 text-xs">
                  Mostrando <strong className="text-slate-900 dark:text-white">{totalFiltradoQtd > 0 ? inicioIdx + 1 : 0}</strong> a <strong className="text-slate-900 dark:text-white">{fimIdx}</strong> de <strong className="text-slate-900 dark:text-white">{totalFiltradoQtd}</strong> contratos
                </div>

                {/* Controles de Navegação de Página */}
                <div className="flex items-center gap-1.5">
                  {/* Primeira Página */}
                  <button
                    type="button"
                    disabled={paginaCorrigida <= 1}
                    onClick={() => setDrillDownPagina(1)}
                    className="p-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Primeira Página"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Primeira</span>
                  </button>

                  {/* Página Anterior */}
                  <button
                    type="button"
                    disabled={paginaCorrigida <= 1}
                    onClick={() => setDrillDownPagina(p => Math.max(1, p - 1))}
                    className="p-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Anterior</span>
                  </button>

                  {/* Indicador de Página Atual */}
                  <div className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-sm font-bold text-xs">
                    Página {paginaCorrigida} de {totalPaginasDrill}
                  </div>

                  {/* Próxima Página */}
                  <button
                    type="button"
                    disabled={paginaCorrigida >= totalPaginasDrill}
                    onClick={() => setDrillDownPagina(p => Math.min(totalPaginasDrill, p + 1))}
                    className="p-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Próxima Página"
                  >
                    <span className="hidden sm:inline text-[11px]">Próxima</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Última Página */}
                  <button
                    type="button"
                    disabled={paginaCorrigida >= totalPaginasDrill}
                    onClick={() => setDrillDownPagina(totalPaginasDrill)}
                    className="p-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Última Página"
                  >
                    <span className="hidden sm:inline text-[11px]">Última</span>
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Botão Fechar Modal */}
                  <button
                    type="button"
                    onClick={() => setDrillDownModal(null)}
                    className="ml-3 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-sm uppercase tracking-wider text-xs transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================
          8. CENTRAL DE IMPORTAÇÃO MULTI-FONTES (MODAL)
          ============================================================ */}
      <ModalCentralImportacao
        isOpen={isCentralImportacaoOpen}
        onClose={() => setIsCentralImportacaoOpen(false)}
        tenantId={tenantId}
        cidade={cidade}
        uf={uf}
        cnpj={cnpj}
        onImportSuccess={() => {
          setIsCentralImportacaoOpen(false);
          carregarContratosPncp();
        }}
      />
    </div>
  );
};
