import React, { useState } from 'react';
import {
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Calculator,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
  Calendar,
  FolderCheck,
  FileCheck2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Sliders,
  Landmark,
  Zap,
} from 'lucide-react';
import {
  ProgramaTransferegov,
  ProjetoPronto,
  ChamadaCalendario,
  SimulacaoContrapartida,
} from '../types/fiscal';
import { formatCompactCurrency, formatCurrency, formatPercent, formatDataBR } from '../utils/formatters';
import { DataSourceBadge } from './DataSourceBadge';

interface RadarCaptacaoProps {
  programas?: ProgramaTransferegov[];
  carteiraProjetosProntos?: ProjetoPronto[];
  calendarioChamadas?: ChamadaCalendario[];
  emendasParlamentares?: Array<{
    id: string;
    autor: string;
    partido: string;
    esfera: string;
    tipo: string;
    objeto: string;
    valorIndicado: number;
    valorEmpenhado: number;
    valorPago: number;
    prazoExecucao: string;
    status: string;
    fonte: string;
  }>;
  metaCaptacao?: {
    metaAnual: number;
    captadoRealizado: number;
    potencialGlobal: number;
    potencialPonderado?: number;
    percentualAtingido: number;
    resumoTexto?: string;
  };
  alertasJanela?: Array<{
    programaId: string;
    titulo: string;
    ministerio: string;
    diasRestantes: number;
    valorMaximo: number;
    mensagem: string;
  }>;
  resumo?: {
    totalProgramasAbertos: number;
    programasElegiveis: number;
    potencialGlobalCaptacao: number;
    potencialPonderado?: number;
    programasUrgentesPrazo: number;
    caucStatus?: string;
    caucRestricoes?: number;
    caucAlerta?: string;
    capagScore?: string;
  };
  cidade?: string;
  uf?: string;
}

export const RadarCaptacao: React.FC<RadarCaptacaoProps> = ({
  programas: initialProgramas,
  carteiraProjetosProntos: initialProjetos,
  calendarioChamadas: initialCalendario,
  emendasParlamentares: initialEmendas,
  metaCaptacao: initialMeta,
  alertasJanela: initialAlertas,
  resumo: initialResumo,
  cidade = 'Araucária',
  uf = 'PR',
}) => {
  const [activeTab, setActiveTab] = useState<'editais' | 'emendas' | 'projetos' | 'calendario' | 'simulador'>('editais');
  const [selectedMinisterio, setSelectedMinisterio] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterUrgentes, setFilterUrgentes] = useState<boolean>(false);

  // Simulador de Contrapartida State
  const [simValorGlobal, setSimValorGlobal] = useState<number>(5000000);
  const [simPctContrapartida, setSimPctContrapartida] = useState<number>(5.0);

  // Fallback seguro de dados
  const programas: ProgramaTransferegov[] = initialProgramas || [
    {
      id: 'prog-1',
      codigoPrograma: '3600020260012',
      orgaoConcedente: 'Fundo Nacional de Saúde (FNS)',
      ministerio: 'Saúde',
      eixo: 'Saúde & Atenção Primária',
      titulo: 'Estruturação da Rede de Serviços de Atenção Primária — UBS Porte III',
      areaTematica: 'Construção e Equipamentos de Saúde',
      objeto: `Construção e ampliação de UBS e aquisição de equipamentos odontológicos e médicos em ${cidade}.`,
      valorMinimo: 850000,
      valorMaximo: 4500000,
      percentualContrapartidaMinima: 2.0,
      dataInicioInscricao: '2026-01-15',
      dataFimInscricao: '2026-02-28',
      diasRestantes: 12,
      statusPrazo: 'URGENTE',
      probabilidade: 'ALTA',
      valorPonderado: 3825000,
      elegibilidade: {
        status: 'ELEGIVEL',
        motivos: ['CAUC 100% adimplente', 'Piso da Saúde (18,4%) superado', 'CAPAG compatível (A)'],
        capagMinima: 'B',
        caucExigido: true,
      },
      linkTransferegov: 'https://transferegov.sistema.gov.br',
    },
    {
      id: 'prog-2',
      codigoPrograma: '5600020260005',
      orgaoConcedente: 'Ministério das Cidades / Caixa (Novo PAC)',
      ministerio: 'Cidades / Infraestrutura',
      eixo: 'Infraestrutura Urbana & Mobilidade',
      titulo: 'Programa Avançar Cidades — Pavimentação, Drenagem e Mobilidade Urbana',
      areaTematica: 'Infraestrutura Urbana',
      objeto: `Drenagem e pavimentação asfáltica em vias de conexão interbairros em ${cidade}.`,
      valorMinimo: 2000000,
      valorMaximo: 12500000,
      percentualContrapartidaMinima: 5.0,
      dataInicioInscricao: '2026-02-01',
      dataFimInscricao: '2026-02-22',
      diasRestantes: 6,
      statusPrazo: 'URGENTE',
      probabilidade: 'ALTA',
      valorPonderado: 10000000,
      elegibilidade: {
        status: 'ELEGIVEL',
        motivos: ['Endividamento DCL 12,8% (teto 120%)', 'Plano Diretor atualizado'],
        capagMinima: 'A',
        caucExigido: true,
      },
      linkTransferegov: 'https://transferegov.sistema.gov.br',
    },
    {
      id: 'prog-3',
      codigoPrograma: '2600020260088',
      orgaoConcedente: 'FNDE / Ministério da Educação',
      ministerio: 'Educação',
      eixo: 'Educação Infantil & Creches',
      titulo: 'Construção de Centros de Educação Infantil — Proinfância Tipo 1',
      areaTematica: 'Educação Infantil',
      objeto: `Construção de CMEI para 376 crianças em dois turnos em ${cidade}.`,
      valorMinimo: 3200000,
      valorMaximo: 5500000,
      percentualContrapartidaMinima: 1.0,
      dataInicioInscricao: '2026-01-20',
      dataFimInscricao: '2026-03-15',
      diasRestantes: 28,
      statusPrazo: 'MODERADO',
      probabilidade: 'ALTA',
      valorPonderado: 4950000,
      elegibilidade: {
        status: 'ELEGIVEL',
        motivos: ['Aplicação de 27,2% em MDE (Piso 25%)', 'Terreno desimpedido'],
        capagMinima: 'B',
        caucExigido: true,
      },
      linkTransferegov: 'https://transferegov.sistema.gov.br',
    },
    {
      id: 'prog-4',
      codigoPrograma: '4400020260019',
      orgaoConcedente: 'Ministério do Meio Ambiente / Fundo Clima',
      ministerio: 'Meio Ambiente',
      eixo: 'Saneamento & Gestão de Resíduos',
      titulo: 'Cidades Verdes e Resilientes — Gestão de Resíduos Sólidos e Ecopontos',
      areaTematica: 'Saneamento e Meio Ambiente',
      objeto: `Implantação de Usina de Triagem Mecanizada de Resíduos e ecopontos inteligentes em ${cidade}.`,
      valorMinimo: 1200000,
      valorMaximo: 4000000,
      percentualContrapartidaMinima: 3.0,
      dataInicioInscricao: '2026-02-10',
      dataFimInscricao: '2026-03-31',
      diasRestantes: 45,
      statusPrazo: 'CONFORTAVEL',
      probabilidade: 'MEDIA',
      valorPonderado: 2400000,
      elegibilidade: {
        status: 'ELEGIVEL',
        motivos: ['Licenciamento prévio emitido', 'Consórcio intermunicipal aderido'],
        capagMinima: 'C',
        caucExigido: true,
      },
      linkTransferegov: 'https://transferegov.sistema.gov.br',
    },
    {
      id: 'prog-5',
      codigoPrograma: '3000020260007',
      orgaoConcedente: 'Ministério da Justiça e Segurança Pública (FNSP)',
      ministerio: 'Segurança / Justiça',
      eixo: 'Segurança Pública & Muralha Digital',
      titulo: 'Fundo Nacional de Segurança Pública — Cercamento Digital e Câmeras OCR',
      areaTematica: 'Tecnologia em Segurança Pública',
      objeto: `Instalação de câmeras com leitura automática de placas (OCR) e central de monitoramento em ${cidade}.`,
      valorMinimo: 500000,
      valorMaximo: 2500000,
      percentualContrapartidaMinima: 0.0,
      dataInicioInscricao: '2026-01-10',
      dataFimInscricao: '2026-03-01',
      diasRestantes: 14,
      statusPrazo: 'URGENTE',
      probabilidade: 'ALTA',
      valorPonderado: 2125000,
      elegibilidade: {
        status: 'ELEGIVEL',
        motivos: ['Guarda Municipal regulamentada', 'Adesão ao SUSP'],
        capagMinima: 'C',
        caucExigido: true,
      },
      linkTransferegov: 'https://transferegov.sistema.gov.br',
    },
  ];

  const carteiraProjetos: ProjetoPronto[] = initialProjetos || [
    {
      id: 'proj-01',
      titulo: `Construção e Equipagem de Nova UBS Porte III — Centro de ${cidade}`,
      secretaria: 'Secretaria Municipal de Saúde',
      valorEstimado: 4500000,
      etpStatus: 'PRONTO',
      projetoExecutivoStatus: 'PRONTO',
      licencaAmbiental: 'DISPENSADA',
      maturidade: 'PRONTO_SUBMISSAO',
      potencialConcedente: 'Fundo Nacional de Saúde (FNS) / Emenda de Bancada',
    },
    {
      id: 'proj-02',
      titulo: `Recapeamento Asfáltico, Drenagem e Calçadas Acessíveis em ${cidade}`,
      secretaria: 'Secretaria Municipal de Obras e Infraestrutura',
      valorEstimado: 12500000,
      etpStatus: 'PRONTO',
      projetoExecutivoStatus: 'PRONTO',
      licencaAmbiental: 'EMITIDA',
      maturidade: 'PRONTO_SUBMISSAO',
      potencialConcedente: 'Ministério das Cidades (Novo PAC)',
    },
    {
      id: 'proj-03',
      titulo: `Construção de Centro Municipal de Educação Infantil (CMEI 376 vagas)`,
      secretaria: 'Secretaria Municipal de Educação',
      valorEstimado: 5500000,
      etpStatus: 'PRONTO',
      projetoExecutivoStatus: 'EM_ELABORACAO',
      licencaAmbiental: 'DISPENSADA',
      maturidade: 'EM_PREPARACAO',
      potencialConcedente: 'Fundo Nacional de Desenvolvimento da Educação (FNDE)',
    },
    {
      id: 'proj-04',
      titulo: `Muralha Digital, Câmeras com Leitura OCR e Central Integrada de Monitoramento`,
      secretaria: 'Secretaria Municipal de Segurança / Defesa Social',
      valorEstimado: 2500000,
      etpStatus: 'PRONTO',
      projetoExecutivoStatus: 'DISPENSADO',
      licencaAmbiental: 'DISPENSADA',
      maturidade: 'PRONTO_SUBMISSAO',
      potencialConcedente: 'Fundo Nacional de Segurança Pública (FNSP / MJSP)',
    },
    {
      id: 'proj-05',
      titulo: `Parque Linear e Drenagem Sustentável de Fundo de Vale em ${cidade}`,
      secretaria: 'Secretaria Municipal de Meio Ambiente',
      valorEstimado: 4000000,
      etpStatus: 'REVISAO',
      projetoExecutivoStatus: 'EM_ELABORACAO',
      licencaAmbiental: 'EM_ANALISE',
      maturidade: 'EM_PREPARACAO',
      potencialConcedente: 'Ministério do Meio Ambiente / Fundo Clima',
    },
  ];

  const calendarioChamadas: ChamadaCalendario[] = initialCalendario || [
    {
      id: 'cal-01',
      ministerio: 'Ministério da Saúde (FNS)',
      eixo: 'Atenção Primária / Equipamentos UBS',
      periodoAbertura: '15/01 a 28/02',
      mesAbertura: 'Janeiro / Fevereiro',
      status: 'ABERTO',
      diasRestantes: 12,
      valorEstimadoGlobal: 4500000,
    },
    {
      id: 'cal-02',
      ministerio: 'Ministério das Cidades (Novo PAC)',
      eixo: 'Drenagem Pluvial e Pavimentação Asfáltica',
      periodoAbertura: '01/02 a 22/02',
      mesAbertura: 'Fevereiro',
      status: 'ABERTO',
      diasRestantes: 6,
      valorEstimadoGlobal: 12500000,
    },
    {
      id: 'cal-03',
      ministerio: 'Segurança Pública (FNSP)',
      eixo: 'Câmeras OCR e Cercamento Digital',
      periodoAbertura: '10/01 a 01/03',
      mesAbertura: 'Fevereiro / Março',
      status: 'ABERTO',
      diasRestantes: 14,
      valorEstimadoGlobal: 2500000,
    },
    {
      id: 'cal-04',
      ministerio: 'MEC / FNDE',
      eixo: 'Construção de Creches e Escolas em Tempo Integral',
      periodoAbertura: '20/01 a 15/03',
      mesAbertura: 'Março',
      status: 'ABERTO',
      diasRestantes: 28,
      valorEstimadoGlobal: 5500000,
    },
    {
      id: 'cal-05',
      ministerio: 'Meio Ambiente & Clima',
      eixo: 'Ecopontos e Gestão Mecanizada de Resíduos',
      periodoAbertura: '10/02 a 31/03',
      mesAbertura: 'Março / Abril',
      status: 'ABERTO',
      diasRestantes: 45,
      valorEstimadoGlobal: 4000000,
    },
    {
      id: 'cal-06',
      ministerio: 'Ministério da Agricultura (MAPA)',
      eixo: 'Patrulha Rural, Estradas Vicinais e Caminhões Caçamba',
      periodoAbertura: '01/05 a 30/06',
      mesAbertura: 'Maio / Junho',
      status: 'EM_BREVE',
      diasRestantes: 75,
      valorEstimadoGlobal: 3000000,
    },
    {
      id: 'cal-07',
      ministerio: 'Secretaria Especial do Esporte',
      eixo: 'Arenas Esportivas e Complexos Multiuso',
      periodoAbertura: '01/07 a 31/08',
      mesAbertura: 'Julho / Agosto',
      status: 'EM_BREVE',
      diasRestantes: 135,
      valorEstimadoGlobal: 2000000,
    },
  ];

  const emendas = initialEmendas || [
    {
      id: 'emenda-fed-01',
      autor: `Bancada Federal de ${uf}`,
      partido: 'Bancada',
      esfera: 'Federal',
      tipo: 'Emenda de Bancada (RP7)',
      objeto: `Custeio de Média e Alta Complexidade (MAC) — Fundo Municipal de Saúde de ${cidade}`,
      valorIndicado: 1500000,
      valorEmpenhado: 1500000,
      valorPago: 1500000,
      prazoExecucao: '31/12/2026',
      status: 'PAGO_CONTA',
      fonte: 'CGU / Transparência Federal',
    },
    {
      id: 'emenda-fed-02',
      autor: `Deputado Federal Titular da Região (${uf})`,
      partido: 'PSD',
      esfera: 'Federal',
      tipo: 'Individual (Transferência Especial / Pix)',
      objeto: `Infraestrutura urbana, asfalto novo e iluminação pública em ${cidade}`,
      valorIndicado: 840000,
      valorEmpenhado: 840000,
      valorPago: 840000,
      prazoExecucao: '30/11/2026',
      status: 'PAGO_CONTA',
      fonte: 'CGU / Transparência Federal',
    },
    {
      id: 'emenda-fed-03',
      autor: `Senador da República (${uf})`,
      partido: 'PL',
      esfera: 'Federal',
      tipo: 'Comissão (RP8)',
      objeto: `Aquisição de vans de transporte de pacientes e insumos para UBS de ${cidade}`,
      valorIndicado: 500000,
      valorEmpenhado: 500000,
      valorPago: 500000,
      prazoExecucao: '31/10/2026',
      status: 'PAGO_CONTA',
      fonte: 'CGU / Transparência Federal',
    },
    {
      id: 'emenda-est-04',
      autor: `Deputado Estadual da Região Metropolitana (${uf})`,
      partido: 'PP',
      esfera: 'Estadual',
      tipo: 'Individual ALEP',
      objeto: `Reforma de praças públicas e quadras esportivas em ${cidade}`,
      valorIndicado: 350000,
      valorEmpenhado: 350000,
      valorPago: 210000,
      prazoExecucao: '30/09/2026',
      status: 'EM_EXECUCAO',
      fonte: 'SEFAZ-PR / ALEP',
    },
  ];

  const totalPotencial = programas.reduce((acc, p) => acc + p.valorMaximo, 0);
  const totalPonderado = programas.reduce((acc, p) => acc + (p.valorPonderado || 0), 0);

  const meta = initialMeta || {
    metaAnual: 6400000,
    captadoRealizado: 4040000,
    potencialGlobal: totalPotencial,
    potencialPonderado: totalPonderado,
    percentualAtingido: 63.2,
    resumoTexto: `Você captou R$ 4,0 mi de R$ 6,4 mi da meta anual (63,2% atingido). Potencial em editais abertos: R$ ${(totalPotencial / 1_000_000).toFixed(1)} mi.`,
  };

  const alertasJanela = initialAlertas || programas.filter(p => p.statusPrazo === 'URGENTE').map(p => ({
    programaId: p.id,
    titulo: p.titulo,
    ministerio: p.ministerio,
    diasRestantes: p.diasRestantes,
    valorMaximo: p.valorMaximo,
    mensagem: `A oportunidade "${p.titulo}" fecha em ${p.diasRestantes} dias. Valor de até ${formatCurrency(p.valorMaximo)}.`,
  }));

  const resumo = initialResumo || {
    totalProgramasAbertos: programas.length,
    programasElegiveis: programas.filter(p => p.elegibilidade.status === 'ELEGIVEL').length,
    potencialGlobalCaptacao: totalPotencial,
    potencialPonderado: totalPonderado,
    programasUrgentesPrazo: alertasJanela.length,
    caucStatus: 'ADIMPLENTE',
    caucRestricoes: 0,
    caucAlerta: 'CAUC 100% regularizado: município apto para captação integral de emendas e convênios federais.',
    capagScore: 'A (Capacidade Plena)',
  };

  const isCaucRegular = resumo.caucRestricoes === 0 || resumo.caucStatus === 'ADIMPLENTE';
  const ministerios = ['todos', 'Saúde', 'Cidades / Infraestrutura', 'Educação', 'Meio Ambiente', 'Segurança / Justiça'];

  const filteredProgramas = programas.filter(p => {
    const matchMin = selectedMinisterio === 'todos' || p.ministerio === selectedMinisterio;
    const matchSearch =
      searchTerm === '' ||
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoPrograma.includes(searchTerm);
    const matchUrgente = !filterUrgentes || p.statusPrazo === 'URGENTE';
    return matchMin && matchSearch && matchUrgente;
  });
  // Cálculo do Simulador de Contrapartida
  const contrapartidaCalculada = Math.round(simValorGlobal * (simPctContrapartida / 100));
  const repasseFederalCalculado = simValorGlobal - contrapartidaCalculada;
  const caixaLivreEstimado = 4678750;
  const impactoCaixaLivre = Number(((contrapartidaCalculada / caixaLivreEstimado) * 100).toFixed(2));
  const viabilidadeStatus = impactoCaixaLivre <= 15 ? 'ALTA' : impactoCaixaLivre <= 35 ? 'MODERADA' : 'CRITICA';

  return (
    <div className="space-y-6 font-sans">
      {/* =========================================================================
          HERO BANNER: META VS REALIZADO & ALERTAS DE JANELA
      ========================================================================= */}
      <div className="bg-white dark:bg-navy-950 border border-slate-200/90 dark:border-navy-800/80 rounded-sm p-4 shadow-sm font-sans space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#0a1128] text-white border border-navy-700 flex items-center gap-1 font-sans">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                RADAR DE CAPTAÇÃO DE RECURSOS • O QUE GERA RECEITA
              </span>
              <DataSourceBadge size="xs" showDetails />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-950 dark:text-white font-sans">
              PAUTA ESTRATÉGICA DE CAPTAÇÃO — {cidade} / {uf}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
              {meta.resumoTexto || `Você captou ${formatCompactCurrency(meta.captadoRealizado)} de ${formatCompactCurrency(meta.metaAnual)} potenciais (${meta.percentualAtingido}% atingido).`}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-sans">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Status CAUC / STN</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${isCaucRegular ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isCaucRegular ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {isCaucRegular ? '100% Regular (8/8)' : `${resumo.caucRestricoes} Restrição(ões)`}
              </span>
            </div>
            <div className="text-right border-l border-slate-200 dark:border-navy-800 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Classificação CAPAG</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">Score {resumo.capagScore || 'A'}</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Meta vs Realizado */}
        <div className="bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-2 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Captado Realizado:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold tabular-nums">{formatCurrency(meta.captadoRealizado)}</strong>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-medium">Meta Anual: <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(meta.metaAnual)}</strong></span>
              <span className="text-purple-600 dark:text-purple-400 font-bold tabular-nums">Potencial em Aberto: {formatCurrency(meta.potencialGlobal)}</span>
            </div>
          </div>

          <div className="h-2.5 bg-slate-200 dark:bg-navy-800 rounded-xs overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 rounded-xs transition-all duration-700"
              style={{ width: `${Math.min(100, meta.percentualAtingido)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-medium font-sans">
            <span>{meta.percentualAtingido}% da meta anual executada</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">Saldo para meta: {formatCurrency(Math.max(0, meta.metaAnual - meta.captadoRealizado))}</span>
          </div>
        </div>

        {/* Banner de Alertas de Janela (Editais que fecham em menos de 15 dias) */}
        {alertasJanela.length > 0 && (
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-sm p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <div>
                <strong className="text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider block font-sans">
                  ⚠️ ALERTA DE JANELA: {alertasJanela.length} OPORTUNIDADES FECHAM EM MENOS DE 15 DIAS
                </strong>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                  {alertasJanela.map(a => `${a.titulo} (${a.diasRestantes} dias)`).join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('editais');
                setFilterUrgentes(true);
              }}
              className="px-3.5 py-1.5 bg-[#0a1128] hover:bg-[#1a2a52] text-white font-bold rounded-xs shrink-0 transition cursor-pointer text-xs shadow-xs"
            >
              <span>Ver Editais Urgentes →</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          NAVEGAÇÃO POR ABAS DA FASE 8
      ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('editais')}
          className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'editais'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>1. Convênios Abertos ({programas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emendas')}
          className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'emendas'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-emerald-500" />
          <span>2. Emendas Parlamentares ({emendas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('projetos')}
          className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'projetos'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderCheck className="w-3.5 h-3.5 text-purple-500" />
          <span>3. Carteira de Projetos Prontos ({carteiraProjetos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendario')}
          className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'calendario'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>4. Calendário Anual de Chamadas</span>
        </button>

        <button
          onClick={() => setActiveTab('simulador')}
          className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'simulador'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-amber-500" />
          <span>5. Simulador de Contrapartida</span>
        </button>
      </div>

      {/* =========================================================================
          ABA 1: CONVÊNIOS ABERTOS & EDITAIS (TRANSFEREGOV / NOVO PAC / FNSP)
      ========================================================================= */}
      {activeTab === 'editais' && (
        <div className="space-y-4">
          {/* Filtros & Barra de Busca */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar edital, ministério ou objeto..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xs font-sans focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <select
                value={selectedMinisterio}
                onChange={(e) => setSelectedMinisterio(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xs font-mono"
              >
                {ministerios.map(m => (
                  <option key={m} value={m}>
                    {m === 'todos' ? 'Todos os Ministérios' : m}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setFilterUrgentes(prev => !prev)}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono font-bold transition cursor-pointer ${
                  filterUrgentes
                    ? 'bg-amber-500 text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                ⚡ Apenas Urgentes (&lt; 15 dias)
              </button>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Exibindo <strong>{filteredProgramas.length}</strong> de {programas.length} oportunidades
            </span>
          </div>

          {/* Grid de Programas & Editais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProgramas.map((prog) => (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-xs hover:border-blue-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {prog.ministerio}
                    </span>
                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                      prog.statusPrazo === 'URGENTE'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 animate-pulse'
                        : prog.statusPrazo === 'MODERADO'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {prog.diasRestantes} DIAS RESTANTES
                    </span>
                  </div>

                  <strong className="text-sm font-bold text-slate-900 dark:text-white leading-snug block mb-1">
                    {prog.titulo}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400 block mb-2">
                    Código Transferegov: {prog.codigoPrograma} • {prog.orgaoConcedente}
                  </span>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-3 leading-relaxed">
                    {prog.objeto}
                  </p>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xs border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Teto Financiável:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(prog.valorMaximo)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contrapartida Mínima:</span>
                      <span>{prog.percentualContrapartidaMinima}% ({formatCurrency(Math.round(prog.valorMaximo * (prog.percentualContrapartidaMinima / 100)))})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Probabilidade de Êxito:</span>
                      <strong className={prog.probabilidade === 'ALTA' ? 'text-emerald-500' : 'text-amber-500'}>
                        {prog.probabilidade || 'ALTA'} ({formatCurrency(prog.valorPonderado || Math.round(prog.valorMaximo * 0.85))} ponderado)
                      </strong>
                    </div>
                  </div>

                  {/* Elegibilidade Box */}
                  <div className="space-y-1 text-[11px] font-mono">
                    <span className="text-slate-400 block">Critérios de Elegibilidade:</span>
                    <ul className="space-y-0.5 text-slate-600 dark:text-slate-300">
                      {prog.elegibilidade.motivos.map((mot, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{mot}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    Prazo final: {formatDataBR(prog.dataFimInscricao)}
                  </span>
                  <a
                    href={prog.linkTransferegov}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Submeter Proposta</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 2: EMENDAS PARLAMENTARES (FEDERAIS & ESTADUAIS)
      ========================================================================= */}
      {activeTab === 'emendas' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>🏛️ Emendas Parlamentares Destinadas a {cidade} (Fonte: Portal da Transparência CGU / ALEP)</span>
              <span className="text-xs font-mono font-normal text-slate-400">Atualizado via API Oficial</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Parlamentar / Autor</th>
                    <th className="p-3">Esfera & Partido</th>
                    <th className="p-3">Tipo de Emenda</th>
                    <th className="p-3">Objeto / Destinação</th>
                    <th className="p-3 text-right">Indicado (R$)</th>
                    <th className="p-3 text-right">Pago na Conta (R$)</th>
                    <th className="p-3">Prazo Execução</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emendas.map((em, idx) => (
                    <tr key={em.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold font-sans">{em.autor}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded-xs text-[10px] bg-slate-200 dark:bg-slate-800 font-bold">
                          {em.esfera} • {em.partido}
                        </span>
                      </td>
                      <td className="p-3">{em.tipo}</td>
                      <td className="p-3 font-sans max-w-xs">{em.objeto}</td>
                      <td className="p-3 text-right">{formatCurrency(em.valorIndicado)}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(em.valorPago)}
                      </td>
                      <td className="p-3">{em.prazoExecucao}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          {em.status === 'PAGO_CONTA' ? '100% PAGO' : em.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 3: CARTEIRA DE PROJETOS PRONTOS (ETP & VIABILIDADE TÉCNICA)
      ========================================================================= */}
      {activeTab === 'projetos' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-sm border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
            <div>
              <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                📁 Banco Municipal de Projetos Estruturados (Prontos para Submissão)
              </strong>
              <p className="text-slate-500 dark:text-slate-400">
                Projetos com Estudo Técnico Preliminar (ETP), Termo de Referência e Licenças prontas para cadastramento imediato em editais abertos.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-bold rounded-xs">
              {carteiraProjetos.filter(p => p.maturidade === 'PRONTO_SUBMISSAO').length} Projetos Imediatos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {carteiraProjetos.map((proj) => (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{proj.secretaria}</span>
                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                      proj.maturidade === 'PRONTO_SUBMISSAO'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>
                      {proj.maturidade === 'PRONTO_SUBMISSAO' ? '✓ PRONTO P/ SUBMETER' : 'EM PREPARAÇÃO'}
                    </span>
                  </div>

                  <strong className="text-sm font-bold text-slate-900 dark:text-white block leading-snug">
                    {proj.titulo}
                  </strong>
                  <div className="mt-2 text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(proj.valorEstimado)}
                  </div>
                  <span className="text-[11px] font-sans text-slate-500 block mt-1">
                    Concedente Alvo: {proj.potencialConcedente}
                  </span>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Estudo Técnico (ETP):</span>
                      <span className="text-emerald-600 font-bold">✓ {proj.etpStatus}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Projeto Executivo:</span>
                      <span className={proj.projetoExecutivoStatus === 'PRONTO' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                        {proj.projetoExecutivoStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Licença Ambiental:</span>
                      <span className="text-blue-600 font-bold">{proj.licencaAmbiental}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('simulador')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold rounded-xs transition text-center cursor-pointer"
                >
                  Simular Contrapartida em R$ →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 4: CALENDÁRIO ANUAL DE CHAMADAS (12 MESES)
      ========================================================================= */}
      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>📅 Cronograma Oficial de Abertura de Janelas de Captação (Exercício 2026)</span>
              <span className="text-xs font-mono font-normal text-slate-400">Previsão Federal e Estadual</span>
            </h3>

            <div className="relative border-l-2 border-indigo-500/30 ml-4 pl-6 space-y-6 my-4">
              {calendarioChamadas.map((cal, idx) => (
                <div key={cal.id || idx} className="relative">
                  <div className={`w-3.5 h-3.5 rounded-full absolute -left-[31px] top-1.5 border-2 border-slate-900 ${
                    cal.status === 'ABERTO' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                  }`} />
                  <div className={`w-3.5 h-3.5 rounded-full absolute -left-[31px] top-1.5 border-2 border-slate-900 ${
                    cal.status === 'ABERTO' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                          {cal.mesAbertura}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {cal.ministerio}
                        </span>
                      </div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                        {cal.eixo}
                      </strong>
                      <span className="text-xs font-mono text-slate-400">
                        Período de Submissão: {cal.periodoAbertura}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(cal.valorEstimadoGlobal)}
                      </div>
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                        cal.status === 'ABERTO'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {cal.status === 'ABERTO' ? `ABERTO • ${cal.diasRestantes} DIAS RESTANTES` : 'PREVISTO (EM BREVE)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 5: SIMULADOR DE CONTRAPARTIDA MUNICIPAL EM R$
      ========================================================================= */}
      {activeTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block mb-1">
                CALCULADORA DE APORTE FISCAL
              </span>
              <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                Simulador de Contrapartida Municipal em R$
              </h3>
              <p className="text-xs text-slate-500">
                Calcule o impacto do desembolso no caixa livre de {cidade} antes de submeter propostas no Transferegov.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                  <span>Valor Global do Projeto / Convênio:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(simValorGlobal)}</strong>
                </label>
                <input
                  type="range"
                  min={500000}
                  max={30000000}
                  step={250000}
                  value={simValorGlobal}
                  onChange={(e) => setSimValorGlobal(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                  <span>Percentual de Contrapartida Municipal:</span>
                  <strong className="text-blue-600 dark:text-blue-400 font-bold">{simPctContrapartida.toFixed(1)}%</strong>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={25.0}
                  step={0.5}
                  value={simPctContrapartida}
                  onChange={(e) => setSimPctContrapartida(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block mb-1">
                RESULTADO DO IMPACTO FISCAL
              </span>
              <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                Composição do Investimento
              </h3>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="p-3 bg-emerald-500/10 rounded-xs border border-emerald-500/20">
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 block uppercase">Repasse Federal</span>
                  <strong className="text-lg font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(repasseFederalCalculado)}
                  </strong>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-xs border border-blue-500/20">
                  <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 block uppercase">Contrapartida Municipal</span>
                  <strong className="text-lg font-mono text-blue-700 dark:text-blue-300">
                    {formatCurrency(contrapartidaCalculada)}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xs border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo Livre Disponível em Caixa:</span>
                  <strong className="text-slate-900 dark:text-white">{formatCurrency(caixaLivreEstimado)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Comprometimento do Caixa Livre:</span>
                  <strong className={impactoCaixaLivre <= 15 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    {impactoCaixaLivre}%
                  </strong>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xs border text-xs font-mono ${
              viabilidadeStatus === 'ALTA'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}>
              <strong>Parecer Técnico de Viabilidade: {viabilidadeStatus}</strong>
              <p className="mt-1 text-[11px]">
                {viabilidadeStatus === 'ALTA'
                  ? `Contrapartida de ${formatCurrency(contrapartidaCalculada)} consome apenas ${impactoCaixaLivre}% da reserva livre. Operação recomendada sem restrição orçamentária.`
                  : `Atenção: A contrapartida consome ${impactoCaixaLivre}% do caixa livre. Requer aprovação prévia de crédito adicional na LOA.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
