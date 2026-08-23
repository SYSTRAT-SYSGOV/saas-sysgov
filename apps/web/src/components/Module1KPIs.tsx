import React, { useState } from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  ShieldAlert,
  Wallet,
  Scale,
  GraduationCap,
  HeartPulse,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LayoutDashboard,
  HandCoins,
  Database,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  BarChart3,
  CalendarRange,
  Info,
} from 'lucide-react';
import {
  FiscalKPIs,
  FiscalAlert,
  ComparativeAnalysis,
  MonthlyComparativeAnalysis,
  QuarterlyComparativeAnalysis,
  ComparativeMode,
} from '../types/fiscal';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';
import { SparklineSummary12M } from './SparklineSummary12M';
import { PredictiveAnalysisModal } from './PredictiveAnalysisModal';
import { FiscalRadarLimitsChart } from './FiscalRadarLimitsChart';
import { DataSourceBadge } from './DataSourceBadge';

interface Module1KPIsProps {
  summary: FiscalKPIs;
  alerts: FiscalAlert[];
  ano: number;
  onNavigateToTab: (tabId: string) => void;
  isComparativoAnual?: boolean;
  comparativeData?: ComparativeAnalysis | null;
  activeMode?: ComparativeMode;
  comparativeMode?: ComparativeMode;
  monthlyComparativeData?: MonthlyComparativeAnalysis | null;
  quarterlyComparativeData?: QuarterlyComparativeAnalysis | null;
  tenantInfo?: {
    id?: string;
    nomePrefeitura?: string;
    cidade?: string;
    uf?: string;
    codigoIbge?: string;
  };
}

export const Module1KPIs: React.FC<Module1KPIsProps> = ({
  summary,
  alerts,
  ano,
  onNavigateToTab,
  isComparativoAnual = false,
  comparativeData = null,
  activeMode: activeModeProp,
  comparativeMode = 'nenhum',
  monthlyComparativeData = null,
  quarterlyComparativeData = null,
  tenantInfo,
}) => {
  const [isPredictiveModalOpen, setIsPredictiveModalOpen] = useState<boolean>(false);
  const chosenMode = activeModeProp || comparativeMode;
  const activeMode: ComparativeMode =
    chosenMode && chosenMode !== 'nenhum'
      ? chosenMode
      : isComparativoAnual
      ? 'anual'
      : 'nenhum';

  // LRF Personnel calculations
  const folhaPercent = summary.despesaPessoalPercentualRCL;
  const limiteAlerta = summary.limiteAlertaPessoal; // 48.60
  const limiteLegal = summary.limiteLegalPessoal; // 54.00

  // Determine personnel badge color
  const getPersonnelStatusBadge = () => {
    if (folhaPercent >= limiteLegal) {
      return {
        bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
        text: 'CRÍTICO (Acima de 54%)',
        icon: XCircle,
        color: 'rose',
      };
    }
    if (folhaPercent >= limiteAlerta) {
      return {
        bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
        text: 'ATENÇÃO (Acima de 48,6%)',
        icon: AlertTriangle,
        color: 'amber',
      };
    }
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      text: 'REGULAR',
      icon: CheckCircle2,
      color: 'emerald',
    };
  };

  const pessoalStatus = getPersonnelStatusBadge();
  const PessoalIcon = pessoalStatus.icon;

  // Counts of alerts
  const criticosCount = alerts.filter(a => a.tipo === 'CRITICO').length;
  const atencaoCount = alerts.filter(a => a.tipo === 'ATENCAO').length;
  const okCount = alerts.filter(a => a.tipo === 'OK').length;

  const quickNavModules = [
    {
      id: 'modulo2',
      number: '02',
      title: 'Receitas Orçamentárias',
      subtitle: 'ICMS / REPAR, ISSQN, IPTU e LOA',
      icon: TrendingUp,
      stat: formatCompactCurrency(summary.receitaTotalRealizada),
      statLabel: 'Realizado',
      color: 'emerald',
    },
    {
      id: 'modulo3',
      number: '03',
      title: 'Despesas e Funções',
      subtitle: 'Educação, Saúde, Custeio e Obras',
      icon: Receipt,
      stat: formatCompactCurrency(summary.despesaTotalLiquidada),
      statLabel: 'Liquidado',
      color: 'blue',
    },
    {
      id: 'modulo4',
      number: '04',
      title: 'Limites da LRF',
      subtitle: 'Folha 50,15%, Pisos CF/88 e Dívida',
      icon: Scale,
      stat: `${summary.despesaPessoalPercentualRCL}%`,
      statLabel: 'Folha / RCL',
      color: 'amber',
    },
    {
      id: 'modulo5',
      number: '05',
      title: 'Captação & Convênios',
      subtitle: 'Emendas Federais, Estaduais e Transferegov',
      icon: HandCoins,
      stat: formatCompactCurrency(summary.captacaoRealizada),
      statLabel: 'Captado',
      color: 'teal',
    },
    {
      id: 'modulo6',
      number: '06',
      title: 'Painel FUNDEB',
      subtitle: 'Magistério 74,2%, VAAT/VAAR e SIOPE',
      icon: GraduationCap,
      stat: `${summary.fundebMagisterioPercentual}%`,
      statLabel: 'Magistério',
      color: 'indigo',
    },
    {
      id: 'siconfi',
      number: '07',
      title: 'API Siconfi Live',
      subtitle: 'Data Lake Tesouro Nacional em Tempo Real',
      icon: Database,
      stat: 'IBGE 4101804',
      statLabel: 'Ente Araucária',
      color: 'slate',
    },
    {
      id: 'diagnostico',
      number: '08',
      title: 'Diagnóstico IA',
      subtitle: 'Parecer Técnico & Consultor Financeiro',
      icon: Sparkles,
      stat: 'Auditoria',
      statLabel: 'Especialista',
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Geometric Executive Overview */}
      <div className="bg-white dark:bg-navy-950 border border-slate-200/90 dark:border-navy-800/80 rounded-sm p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#0a1128] text-white border border-navy-700 font-sans">
              EXERCÍCIO {ano} {ano === 2026 && '— ORÇAMENTO REESTIMADO'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              IBGE: {tenantInfo?.codigoIbge || '4101804'} ({(tenantInfo?.cidade || 'ARAUCÁRIA').toUpperCase()}/{tenantInfo?.uf || 'PR'})
            </span>
            <DataSourceBadge dataSource={summary.dataSource} size="xs" showDetails />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white uppercase font-sans">
            PAINEL EXECUTIVO DE GESTÃO FISCAL & ORÇAMENTÁRIA — {tenantInfo?.cidade || 'ARAUCÁRIA'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
            Consolidação contábil via API Siconfi do Tesouro Nacional. Monitoramento da execução orçamentária,
            folha de pessoal ({summary.despesaPessoalPercentualRCL}% da RCL) e indicadores constitucionais de {tenantInfo?.nomePrefeitura || 'Araucária'}.
          </p>
        </div>

        {/* Quick Alert Summary Badges & AI Action */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-sans">
          <button
            type="button"
            id="executive-open-predictive-btn"
            onClick={() => setIsPredictiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xs bg-[#0a1128] hover:bg-[#1a2a52] text-white text-xs font-bold transition uppercase cursor-pointer shadow-xs border border-navy-700"
            title="Clique para abrir a Análise Preditiva de IA baseada nas variações dos últimos 6 meses"
          >
            <BrainCircuit className="w-3.5 h-3.5 animate-pulse text-purple-300" />
            <span>Análise Preditiva (IA)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('modulo4')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition uppercase cursor-pointer"
            title="Clique para ver os limites da LRF e alertas do TCE-PR"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{atencaoCount} EM ATENÇÃO</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('modulo4')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition uppercase cursor-pointer"
            title="Clique para ver indicadores regulares"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{okCount} REGULARES</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Clickable Geometric Balance Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Receita Total */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo2')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-emerald-500 dark:hover:border-emerald-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Arrecadação Líquida] Representa os recursos financeiros efetivamente recolhidos à Conta Única do Tesouro Municipal. Clique para abrir o Módulo 02 - Receitas."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition flex items-center gap-1">
                RECEITA TOTAL →
                <span
                  className="text-slate-400 hover:text-emerald-600 transition"
                  title="Conceito Fiscal: Total de ingressos orçamentários arrecadados (arrecadação líquida de deduções do FUNDEB) computados no exercício financeiro."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  comparativeData.receitaTotalReestimada.variacaoPct >= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {comparativeData.receitaTotalReestimada.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {comparativeData.receitaTotalReestimada.variacaoPct.toFixed(1)}% YoY
                </span>
              ) : activeMode === 'trimestral' && quarterlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  quarterlyComparativeData.receitaTotal.variacaoPct >= 0
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {quarterlyComparativeData.receitaTotal.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {quarterlyComparativeData.receitaTotal.variacaoPct.toFixed(1)}% Tri
                </span>
              ) : activeMode === 'mensal' && monthlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  monthlyComparativeData.receitaTotal.variacaoPct >= 0
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {monthlyComparativeData.receitaTotal.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {monthlyComparativeData.receitaTotal.variacaoPct.toFixed(1)}% MoM
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              )}
            </div>
            <div className="kpi-value text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition font-mono">
              {formatCompactCurrency(summary.receitaTotalRealizada)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2">
              <div
                className="bg-emerald-500 h-1 transition-all"
                style={{ width: `${Math.min(100, (summary.receitaTotalRealizada / summary.receitaTotalReestimada) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between" title="Previsão inicial de arrecadação aprovada na LOA (Lei Orçamentária Anual)">
              <span>Orçado:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCompactCurrency(summary.receitaTotalOrcada)}</span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold" title="Projeção atualizada com frustrações de ICMS e REPAR">
              <span>Reestimado:</span>
              <span>{formatCompactCurrency(summary.receitaTotalReestimada)}</span>
            </div>
          </div>
        </button>

        {/* Card 2: Despesa Total */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo3')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-blue-500 dark:hover:border-blue-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Despesa Liquidada] Segundo estágio da despesa pública (Lei 4.320/64, Art. 63). Representa o reconhecimento formal de que o bem foi entregue ou o serviço foi prestado pelo credor, gerando a obrigação irrevogável de pagamento pelo Ente. Clique para abrir o Módulo 03 - Despesas."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-1">
                DESPESA TOTAL →
                <span
                  className="text-slate-400 hover:text-blue-600 transition"
                  title="Conceito Fiscal: A liquidação verifica o direito do credor mediante títulos e comprovantes da prestação do serviço ou entrega do bem."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  comparativeData.despesaTotalLiquidada.variacaoPct <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {comparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {comparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}% YoY
                </span>
              ) : activeMode === 'trimestral' && quarterlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  quarterlyComparativeData.despesaTotalLiquidada.variacaoPct <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                }`}>
                  {quarterlyComparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {quarterlyComparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}% Tri
                </span>
              ) : activeMode === 'mensal' && monthlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  monthlyComparativeData.despesaTotalLiquidada.variacaoPct <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {monthlyComparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {monthlyComparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}% MoM
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              )}
            </div>
            <div className="kpi-value text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition font-mono">
              {formatCompactCurrency(summary.despesaTotalLiquidada)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2">
              <div
                className="bg-blue-500 h-1 transition-all"
                style={{ width: `${Math.min(100, (summary.despesaTotalLiquidada / summary.receitaTotalReestimada) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between" title="Empenhado: 1º estágio da despesa (reserva prévia de dotação orçamentária para fim específico)">
              <span>Empenhada:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCompactCurrency(summary.despesaTotalEmpenhada)}</span>
            </div>
            <div className="flex justify-between" title="Pago: 3º estágio da despesa (emissão de ordem bancária e débito em conta)">
              <span>Paga:</span>
              <span>{formatCompactCurrency(summary.despesaTotalPaga)}</span>
            </div>
          </div>
        </button>

        {/* Card 3: Pessoal / LRF */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo4')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-amber-500 dark:hover:border-amber-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Despesa Total com Pessoal / RCL] Apuração dos últimos 12 meses (Art. 18 e 19 da LRF). O limite legal para o Poder Executivo é de 54% da RCL. Clique para abrir o Módulo 04 - Limites LRF."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-amber-600 dark:group-hover:text-amber-400 transition flex items-center gap-1">
                PESSOAL / RCL (LRF) →
                <span
                  className="text-slate-400 hover:text-amber-600 transition"
                  title="Conceito Fiscal: Relação entre a Despesa Total com Pessoal (ativos, inativos e pensionistas) e a Receita Corrente Líquida dos últimos 12 meses."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  comparativeData.despesaPessoalPercentualRCL.deltaPp <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {comparativeData.despesaPessoalPercentualRCL.deltaPp >= 0 ? '▲ +' : '▼ '}
                  {Math.abs(comparativeData.despesaPessoalPercentualRCL.deltaPp).toFixed(2)} p.p. YoY
                </span>
              ) : activeMode === 'trimestral' && quarterlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  quarterlyComparativeData.despesaPessoalTrimestral.variacaoPct <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {quarterlyComparativeData.despesaPessoalTrimestral.variacaoPct >= 0 ? '+' : ''}
                  {quarterlyComparativeData.despesaPessoalTrimestral.variacaoPct.toFixed(1)}% Tri
                </span>
              ) : activeMode === 'mensal' && monthlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  monthlyComparativeData.despesaPessoalMensal.variacaoPct <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {monthlyComparativeData.despesaPessoalMensal.variacaoPct >= 0 ? '+' : ''}
                  {monthlyComparativeData.despesaPessoalMensal.variacaoPct.toFixed(1)}% MoM
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-sm border ${pessoalStatus.bg}`}>
                  ALERTA LRF
                </span>
              )}
            </div>
            <div className="kpi-value font-mono text-amber-600 dark:text-amber-400">
              {formatPercent(summary.despesaPessoalPercentualRCL)}
            </div>
            {/* LRF Progress bar with limit indicators */}
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2 relative">
              <div
                className="bg-amber-500 h-1 transition-all"
                style={{ width: `${(summary.despesaPessoalPercentualRCL / 60) * 100}%` }}
              ></div>
              <div
                className="absolute top-0 bottom-0 w-[1.5px] bg-rose-500"
                style={{ left: `${(54 / 60) * 100}%` }}
                title="Limite Legal 54%"
              ></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between text-amber-600 font-semibold" title="Limite de Alerta do TCE-PR (Art. 59 §1º II da LRF): 90% do teto legal (48,60%)">
              <span>Alerta LRF:</span>
              <span>48,60%</span>
            </div>
            <div className="flex justify-between text-rose-600" title="Limite Máximo Legal do Poder Executivo Municipal (Art. 20 III 'b' da LRF): 54,00%">
              <span>Máximo Legal:</span>
              <span>54,00%</span>
            </div>
          </div>
        </button>

        {/* Card 4: Aporte Previdenciário FPMA */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo3')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-indigo-500 dark:hover:border-indigo-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Aporte Previdenciário RPPS/FPMA] Contribuição suplementar e plano de amortização patronal do Ente para cobrir o déficit atuarial do Fundo de Previdência Municipal de Araucária (FPMA), garantindo o equilíbrio financeiro e atuarial (Art. 40 da CF/88). Clique para ver detalhes das despesas."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1">
                APORTES FPMA →
                <span
                  className="text-slate-400 hover:text-indigo-600 transition"
                  title="Conceito Fiscal: Aportes patronais para equacionamento do déficit atuarial da previdência própria municipal."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {comparativeData.aportePrevidenciarioFPMA.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {comparativeData.aportePrevidenciarioFPMA.variacaoPct.toFixed(1)}% YoY
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
              )}
            </div>
            <div className="kpi-value text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition font-mono">
              {formatCompactCurrency(summary.aportePrevidenciarioFPMA)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2">
              <div className="bg-indigo-500 h-1" style={{ width: '65%' }}></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between" title="Plano de amortização estabelecido por lei municipal sob cálculo atuarial">
              <span>Equacionamento:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Atuarial</span>
            </div>
            <div className="flex justify-between" title="Percentual da despesa total orçamentária comprometido com o déficit previdenciário">
              <span>Impacto Orçamentário:</span>
              <span>~5,1% Total</span>
            </div>
          </div>
        </button>

        {/* Card 5: Serviço da Dívida */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo4')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-teal-500 dark:hover:border-teal-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Serviço da Dívida e Dívida Consolidada Líquida (DCL)] Pagamento de amortização do principal, juros e encargos contratuais de operações de crédito (ex: Finisa/Caixa, Paranacidade). Limite do Senado (RSF 43/2001): DCL de até 120% da RCL. Clique para abrir o Módulo 04 - Limites LRF."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-teal-600 dark:group-hover:text-teal-400 transition flex items-center gap-1">
                SERVIÇO DÍVIDA →
                <span
                  className="text-slate-400 hover:text-teal-600 transition"
                  title="Conceito Fiscal: Amortizações contratuais e encargos financeiros da dívida fundada interna municipal."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  {comparativeData.servicoDivida.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {comparativeData.servicoDivida.variacaoPct.toFixed(1)}% YoY
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
              )}
            </div>
            <div className="kpi-value text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition font-mono">
              {formatCompactCurrency(summary.servicoDivida)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2">
              <div className="bg-teal-500 h-1" style={{ width: '12.8%' }}></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between" title="Dívida Consolidada Líquida em relação à Receita Corrente Líquida (atualmente 12,8%, patamar muito confortável)">
              <span>DCL / RCL:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">12,8% (OK)</span>
            </div>
            <div className="flex justify-between" title="Teto fixado pela Resolução nº 43/2001 do Senado Federal para Municípios: 120% da RCL">
              <span>Limite Senado:</span>
              <span>120,0%</span>
            </div>
          </div>
        </button>

        {/* Card 6: Resultado Primário */}
        <button
          type="button"
          onClick={() => onNavigateToTab('modulo2')}
          className="text-left bg-white dark:bg-navy-900 p-4 border border-slate-200 dark:border-navy-800 shadow-sm rounded-sm flex flex-col justify-between hover:border-emerald-500 dark:hover:border-emerald-500 transition group cursor-pointer"
          title="[Conceito Fiscal: Resultado Primário] Diferença entre Receitas Primárias (arrecadação total menos receitas financeiras/aplicações) e Despesas Primárias (despesas totais menos juros/serviço da dívida). Mede a capacidade fiscal do Ente de honrar seus compromissos operacionais sem contrair novas dívidas. Clique para ver detalhes."
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition flex items-center gap-1">
                RESULTADO PRIMÁRIO →
                <span
                  className="text-slate-400 hover:text-emerald-600 transition"
                  title="Conceito Fiscal: Saldo entre receitas e despesas não-financeiras, indicando equilíbrio fiscal estrutural conforme o Anexo de Metas Fiscais da LDO."
                >
                  <Info className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </span>
              </span>
              {activeMode === 'anual' && comparativeData ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {comparativeData.resultadoPrimario.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {comparativeData.resultadoPrimario.variacaoPct.toFixed(1)}% YoY
                </span>
              ) : activeMode === 'trimestral' && quarterlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  quarterlyComparativeData.resultadoTrimestral.diferencaNominal >= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {quarterlyComparativeData.resultadoTrimestral.diferencaNominal >= 0 ? '▲ +' : '▼ '}{formatCompactCurrency(Math.abs(quarterlyComparativeData.resultadoTrimestral.diferencaNominal))} Tri
                </span>
              ) : activeMode === 'mensal' && monthlyComparativeData ? (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  monthlyComparativeData.resultadoMensal.variacaoPct >= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {monthlyComparativeData.resultadoMensal.variacaoPct >= 0 ? '▲ +' : '▼ '}
                  {monthlyComparativeData.resultadoMensal.variacaoPct.toFixed(1)}% MoM
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              )}
            </div>
            <div className="kpi-value text-emerald-600 dark:text-emerald-400 font-mono">
              +{formatCompactCurrency(summary.resultadoPrimario)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-navy-800 h-1 mt-2">
              <div className="bg-emerald-500 h-1" style={{ width: '85%' }}></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-navy-800 pt-2">
            <div className="flex justify-between" title="Condição de superávit primário (receitas primárias superiores às despesas primárias)">
              <span>Superávit:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Equilibrado</span>
            </div>
            <div className="flex justify-between" title="Resultado Nominal: Resultado primário deduzido do serviço da dívida (juros líquidos)">
              <span>Nominal:</span>
              <span>+{formatCompactCurrency(summary.resultadoNominal)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Summary Sparkline & 12-Month Trend Visualizer (Revenues vs. Expenses) */}
      <SparklineSummary12M
        ano={ano}
        onNavigateToTab={onNavigateToTab}
        onOpenPredictive={() => setIsPredictiveModalOpen(true)}
      />

      {/* Dedicated Comparative Annual Analysis Section (When Mode is Active) */}
      {activeMode === 'anual' && comparativeData && (
        <div className="bg-gradient-to-r from-blue-900/10 via-slate-900/5 to-indigo-900/10 dark:from-blue-950/40 dark:via-slate-900/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/60 dark:border-blue-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-blue-600 text-white shadow-sm">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Painel de Análise Comparativa Anual ({comparativeData.anoAtual} vs {comparativeData.anoAnterior})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Variações percentuais (%) e nominais (R$) dos agregados fiscais e limites da LRF
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-800">
              MODO COMPARATIVO ANUAL ATIVO
            </span>
          </div>

          {/* Key Metric Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receita Reestimada</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(comparativeData.receitaTotalReestimada.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${comparativeData.receitaTotalReestimada.variacaoPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {comparativeData.receitaTotalReestimada.variacaoPct >= 0 ? '+' : ''}{comparativeData.receitaTotalReestimada.variacaoPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Anterior ({comparativeData.anoAnterior}): {formatCompactCurrency(comparativeData.receitaTotalReestimada.anterior)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Despesa Liquidada</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(comparativeData.despesaTotalLiquidada.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${comparativeData.despesaTotalLiquidada.variacaoPct <= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {comparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '+' : ''}{comparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Anterior ({comparativeData.anoAnterior}): {formatCompactCurrency(comparativeData.despesaTotalLiquidada.anterior)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receita Corrente Líquida (RCL)</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(comparativeData.rcl.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${comparativeData.rcl.variacaoPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {comparativeData.rcl.variacaoPct >= 0 ? '+' : ''}{comparativeData.rcl.variacaoPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Anterior ({comparativeData.anoAnterior}): {formatCompactCurrency(comparativeData.rcl.anterior)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folha / RCL (% LRF)</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {comparativeData.despesaPessoalPercentualRCL.atual.toFixed(2)}%
                </span>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                  {comparativeData.despesaPessoalPercentualRCL.deltaPp ? (
                    (comparativeData.despesaPessoalPercentualRCL.deltaPp >= 0 ? '+' : '') +
                    comparativeData.despesaPessoalPercentualRCL.deltaPp.toFixed(2) + ' p.p.'
                  ) : ''}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Anterior ({comparativeData.anoAnterior}): {comparativeData.despesaPessoalPercentualRCL.anterior.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Comparative Quarterly Analysis Section (When Mode is Active) */}
      {activeMode === 'trimestral' && quarterlyComparativeData && (
        <div className="bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-purple-900/10 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-purple-950/40 border border-indigo-300 dark:border-indigo-800/80 rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/60 dark:border-indigo-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-indigo-600 text-white shadow-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Painel de Análise Comparativa Trimestral ({quarterlyComparativeData.trimestreNome}: {quarterlyComparativeData.meses?.join(', ') || ''} — {quarterlyComparativeData.ano} vs {quarterlyComparativeData.anoAnterior})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visão consolidada de execução trimestral com arrecadação de 3 meses, liquidações agregadas e deltas YoY homólogos
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded border border-indigo-300 dark:border-indigo-800">
              MODO COMPARATIVO TRIMESTRAL (YoY)
            </span>
          </div>

          {/* Key Metric Quarterly Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Receita no Trimestre */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Receita Realizada ({quarterlyComparativeData.trimestreNome})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(quarterlyComparativeData.receitaTotal.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${quarterlyComparativeData.receitaTotal.variacaoPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {quarterlyComparativeData.receitaTotal.variacaoPct >= 0 ? '+' : ''}{quarterlyComparativeData.receitaTotal.variacaoPct.toFixed(1)}% YoY
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{quarterlyComparativeData.trimestreNome}/{quarterlyComparativeData.anoAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(quarterlyComparativeData.receitaTotal.anterior)}</span>
              </div>
            </div>

            {/* Despesa no Trimestre */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Despesa Liquidada ({quarterlyComparativeData.trimestreNome})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(quarterlyComparativeData.despesaTotalLiquidada.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${quarterlyComparativeData.despesaTotalLiquidada.variacaoPct <= 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {quarterlyComparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '+' : ''}{quarterlyComparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}% YoY
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{quarterlyComparativeData.trimestreNome}/{quarterlyComparativeData.anoAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(quarterlyComparativeData.despesaTotalLiquidada.anterior)}</span>
              </div>
            </div>

            {/* Saldo Trimestral */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Superávit do Trimestre ({quarterlyComparativeData.trimestreNome})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCompactCurrency(quarterlyComparativeData.resultadoTrimestral.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${quarterlyComparativeData.resultadoTrimestral.diferencaNominal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {quarterlyComparativeData.resultadoTrimestral.diferencaNominal >= 0 ? '▲ +' : '▼ '}{formatCompactCurrency(Math.abs(quarterlyComparativeData.resultadoTrimestral.diferencaNominal))}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{quarterlyComparativeData.trimestreNome}/{quarterlyComparativeData.anoAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">+{formatCompactCurrency(quarterlyComparativeData.resultadoTrimestral.anterior)}</span>
              </div>
            </div>

            {/* Folha / RCL Trimestral */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Folha / RCL ({quarterlyComparativeData.trimestreNome})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {quarterlyComparativeData.folhaRclPercentual.atual.toFixed(2)}%
                </span>
                <span className={`text-xs font-mono font-bold ${quarterlyComparativeData.folhaRclPercentual.deltaPp <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {quarterlyComparativeData.folhaRclPercentual.deltaPp >= 0 ? '+' : ''}{quarterlyComparativeData.folhaRclPercentual.deltaPp.toFixed(2)} p.p.
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{quarterlyComparativeData.trimestreNome}/{quarterlyComparativeData.anoAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{quarterlyComparativeData.folhaRclPercentual.anterior.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* All 4 Quarters Execution Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Matriz Comparativa dos Trimestres ({quarterlyComparativeData.ano} vs {quarterlyComparativeData.anoAnterior})
              </span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                Trimestre Selecionado: <strong>{quarterlyComparativeData.trimestreNome} ({quarterlyComparativeData.meses?.join('-') || ''})</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2.5">Trimestre</th>
                    <th className="py-2 px-2.5">Meses</th>
                    <th className="py-2 px-2.5 text-right">Rec {quarterlyComparativeData.ano}</th>
                    <th className="py-2 px-2.5 text-right">Rec {quarterlyComparativeData.anoAnterior}</th>
                    <th className="py-2 px-2.5 text-right">Var Rec (%)</th>
                    <th className="py-2 px-2.5 text-right">Desp {quarterlyComparativeData.ano}</th>
                    <th className="py-2 px-2.5 text-right">Desp {quarterlyComparativeData.anoAnterior}</th>
                    <th className="py-2 px-2.5 text-right">Var Desp (%)</th>
                    <th className="py-2 px-2.5 text-right">Superávit {quarterlyComparativeData.ano}</th>
                    <th className="py-2 px-2.5 text-right">Folha/RCL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {quarterlyComparativeData.historicoTrimestral?.map(q => {
                    const isSelected = q.trimestre === quarterlyComparativeData.trimestre;
                    return (
                      <tr
                        key={q.trimestre}
                        className={`${isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/50 font-bold text-indigo-950 dark:text-indigo-100 border-l-2 border-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="py-2 px-2.5 flex items-center gap-1.5">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                          <span>{q.trimestreNome}</span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 text-[11px]">{q.meses}</td>
                        <td className="py-2 px-2.5 text-right">{formatCompactCurrency(q.receitaAtual)}</td>
                        <td className="py-2 px-2.5 text-right text-slate-400">{formatCompactCurrency(q.receitaAnterior)}</td>
                        <td className={`py-2 px-2.5 text-right font-bold ${q.variacaoReceitaYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {q.variacaoReceitaYoY >= 0 ? '+' : ''}{q.variacaoReceitaYoY.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2.5 text-right">{formatCompactCurrency(q.despesaAtual)}</td>
                        <td className="py-2 px-2.5 text-right text-slate-400">{formatCompactCurrency(q.despesaAnterior)}</td>
                        <td className={`py-2 px-2.5 text-right font-bold ${q.variacaoDespesaYoY <= 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                          {q.variacaoDespesaYoY >= 0 ? '+' : ''}{q.variacaoDespesaYoY.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCompactCurrency(q.resultadoAtual)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {q.pessoalPercentAtual.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Comparative Monthly Analysis Section (When Mode is Active) */}
      {activeMode === 'mensal' && monthlyComparativeData && (
        <div className="bg-gradient-to-r from-blue-900/10 via-slate-900/5 to-cyan-900/10 dark:from-blue-950/40 dark:via-slate-900/40 dark:to-cyan-950/40 border border-blue-300 dark:border-blue-800/80 rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/60 dark:border-blue-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-blue-600 text-white shadow-sm">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Painel de Análise Comparativa Mensal ({monthlyComparativeData.mesAtual} vs {monthlyComparativeData.mesAnterior} / {monthlyComparativeData.ano})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Variação mês a mês (MoM) de receitas realizadas, despesas liquidadas e saldo primário do mês
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-800">
              MODO COMPARATIVO MENSAL (MoM)
            </span>
          </div>

          {/* Key Metric Monthly Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Receita no Mês */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Receita Realizada ({monthlyComparativeData.mesAtual})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(monthlyComparativeData.receitaTotal.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${monthlyComparativeData.receitaTotal.variacaoPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {monthlyComparativeData.receitaTotal.variacaoPct >= 0 ? '+' : ''}{monthlyComparativeData.receitaTotal.variacaoPct.toFixed(1)}% MoM
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{monthlyComparativeData.mesAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(monthlyComparativeData.receitaTotal.anterior)}</span>
              </div>
            </div>

            {/* Despesa no Mês */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Despesa Liquidada ({monthlyComparativeData.mesAtual})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(monthlyComparativeData.despesaTotalLiquidada.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${monthlyComparativeData.despesaTotalLiquidada.variacaoPct <= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {monthlyComparativeData.despesaTotalLiquidada.variacaoPct >= 0 ? '+' : ''}{monthlyComparativeData.despesaTotalLiquidada.variacaoPct.toFixed(1)}% MoM
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{monthlyComparativeData.mesAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(monthlyComparativeData.despesaTotalLiquidada.anterior)}</span>
              </div>
            </div>

            {/* Resultado Mensal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Saldo Orçamentário ({monthlyComparativeData.mesAtual})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {monthlyComparativeData.resultadoMensal.atual >= 0 ? '+' : ''}{formatCompactCurrency(monthlyComparativeData.resultadoMensal.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${monthlyComparativeData.resultadoMensal.diferencaNominal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {monthlyComparativeData.resultadoMensal.diferencaNominal >= 0 ? '▲ +' : '▼ '}{formatCompactCurrency(Math.abs(monthlyComparativeData.resultadoMensal.diferencaNominal))}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{monthlyComparativeData.mesAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(monthlyComparativeData.resultadoMensal.anterior)}</span>
              </div>
            </div>

            {/* RCL Mensal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                RCL Mensal ({monthlyComparativeData.mesAtual})
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(monthlyComparativeData.rclMensal.atual)}
                </span>
                <span className={`text-xs font-mono font-bold ${monthlyComparativeData.rclMensal.variacaoPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {monthlyComparativeData.rclMensal.variacaoPct >= 0 ? '+' : ''}{monthlyComparativeData.rclMensal.variacaoPct.toFixed(1)}% MoM
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                <span>{monthlyComparativeData.mesAnterior}:</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCompactCurrency(monthlyComparativeData.rclMensal.anterior)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Historical Series Overview Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Evolução Mensal e Taxas de Variação MoM ({monthlyComparativeData.ano})
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Mês em foco: <strong>{monthlyComparativeData.mesAtual}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-1.5 px-2">Mês</th>
                    <th className="py-1.5 px-2 text-right">Receita (R$)</th>
                    <th className="py-1.5 px-2 text-right">Var. MoM Rec (%)</th>
                    <th className="py-1.5 px-2 text-right">Despesa (R$)</th>
                    <th className="py-1.5 px-2 text-right">Var. MoM Desp (%)</th>
                    <th className="py-1.5 px-2 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {monthlyComparativeData.historicoMensal.slice(0, 8).map(h => {
                    const isCurrent = h.mesNome === monthlyComparativeData.mesAtual;
                    return (
                      <tr
                        key={h.mes}
                        className={`${isCurrent ? 'bg-blue-50/80 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="py-1.5 px-2 flex items-center gap-1.5">
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                          <span>{h.mesNome}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right">{formatCompactCurrency(h.receitaTotal)}</td>
                        <td className={`py-1.5 px-2 text-right ${h.variacaoReceitaMoM >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.variacaoReceitaMoM >= 0 ? '+' : ''}{h.variacaoReceitaMoM.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-right">{formatCompactCurrency(h.despesaTotal)}</td>
                        <td className={`py-1.5 px-2 text-right ${h.variacaoDespesaMoM <= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {h.variacaoDespesaMoM >= 0 ? '+' : ''}{h.variacaoDespesaMoM.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCompactCurrency(h.resultado)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Interactive Module Access Deck */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              ACESSO DIRETO AOS MÓDULOS DE GESTÃO (CLIQUE PARA NAVEGAR)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            7 MÓDULOS ESPECÍFICOS DISPONÍVEIS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {quickNavModules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                type="button"
                key={mod.id}
                id={`quick-nav-${mod.id}`}
                onClick={() => onNavigateToTab(mod.id)}
                className="text-left p-3 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      MÓDULO {mod.number}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-tight">
                    {mod.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                    {mod.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">{mod.statLabel}:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 flex items-center gap-0.5">
                    {mod.stat}
                    <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Radar Chart: 5 Main Expenditure Groups vs Constitutional & Statutory Limits */}
      <FiscalRadarLimitsChart
        summary={summary}
        ano={ano}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Macro Gauge Progress Section: Constitutional Floors & Personnel Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Folha de Pessoal Gauge Card */}
        <div
          onClick={() => onNavigateToTab('modulo4')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm hover:border-amber-500 transition cursor-pointer group"
          title="Clique para ir para os Limites da LRF"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider group-hover:text-amber-600 transition">
                Despesa com Pessoal (Executivo / LRF) →
              </h3>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm border ${pessoalStatus.bg}`}>
              {summary.despesaPessoalPercentualRCL}% DA RCL
            </span>
          </div>

          {/* Visual Gauge Bar */}
          <div className="space-y-2 mt-4">
            <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden flex">
              {/* Green Zone (0% to 48.6%) */}
              <div className="h-full bg-emerald-500" style={{ width: '81%' }} title="Faixa Segura (até 48,6%)" />
              {/* Yellow Zone (48.6% to 51.3%) */}
              <div className="h-full bg-amber-500" style={{ width: '4.5%' }} title="Limite de Alerta (48,6% a 51,3%)" />
              {/* Red Zone (51.3% to 54.0%) */}
              <div className="h-full bg-rose-500" style={{ width: '14.5%' }} title="Limite Legal (51,3% a 54,0%)" />
            </div>

            {/* Pointer Marker */}
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              <span>0%</span>
              <span className="text-amber-600 font-semibold">Alerta: 48,6%</span>
              <span className="text-orange-600 font-semibold">Prudencial: 51,3%</span>
              <span className="text-rose-600 font-semibold">Legal: 54,0%</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-sm text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
            <strong>Diagnóstico:</strong> A despesa com pessoal encontra-se a <strong>50,15% da RCL</strong>. O município ultrapassou o Limite de Alerta do TCE-PR (48,60%). Recomenda-se contenção rigorosa de novas admissões e horas extras.
          </div>
        </div>

        {/* Educação Floor (MDE) */}
        <div
          onClick={() => onNavigateToTab('modulo6')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm hover:border-emerald-500 transition cursor-pointer group"
          title="Clique para ir para o Módulo FUNDEB / Educação"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider group-hover:text-emerald-600 transition">
                Aplicação em Educação (Art. 212 CF) →
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {formatPercent(summary.aplicacaoEducacaoPercentual)} (PISO 25%)
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.aplicacaoEducacaoPercentual / 30) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              <span>0%</span>
              <span className="text-slate-400">Piso Constitucional: 25,00%</span>
              <span className="text-emerald-600 font-semibold">Realizado: {formatPercent(summary.aplicacaoEducacaoPercentual)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-sm text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
            <strong>Conformidade:</strong> Aplicação de <strong>{formatCurrency(summary.aplicacaoEducacaoValor)}</strong> ({formatPercent(summary.aplicacaoEducacaoPercentual)} da base de impostos), com superávit de +R$ 21,2 mi sobre o piso.
          </div>
        </div>

        {/* Saúde Floor (ASPS) */}
        <div
          onClick={() => onNavigateToTab('modulo4')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm hover:border-teal-500 transition cursor-pointer group"
          title="Clique para ir para os Limites LRF / Saúde"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-teal-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider group-hover:text-teal-600 transition">
                Aplicação em Saúde (LC 141/2012) →
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {formatPercent(summary.aplicacaoSaudePercentual)} (PISO 15%)
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.aplicacaoSaudePercentual / 25) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              <span>0%</span>
              <span className="text-slate-400">Piso Constitucional: 15,00%</span>
              <span className="text-teal-600 font-semibold">Realizado: {formatPercent(summary.aplicacaoSaudePercentual)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-sm text-xs text-teal-900 dark:text-teal-300 leading-relaxed">
            <strong>Conformidade:</strong> Aplicação de <strong>{formatCurrency(summary.aplicacaoSaudeValor)}</strong> ({formatPercent(summary.aplicacaoSaudePercentual)} da base de impostos), superando o mínimo com folga de +R$ 60,4 mi.
          </div>
        </div>
      </div>

      {/* Real-time Fiscal Alert Center (Semáforos) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              CENTRAL DE ALERTAS & SEMÁFOROS FISCAIS (TCE-PR / LRF)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            TRANSMISSÕES SICONFI ATIVAS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map(alert => {
            const isCritico = alert.tipo === 'CRITICO';
            const isAtencao = alert.tipo === 'ATENCAO';

            const borderClass = isCritico
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
              : isAtencao
              ? 'border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20'
              : 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20';

            const badgeClass = isCritico
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              : isAtencao
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';

            const Icon = isCritico ? XCircle : isAtencao ? AlertTriangle : CheckCircle2;

            // Determine target module for the alert
            const targetModule = alert.id === 'alerta-01' ? 'modulo4' : alert.id === 'alerta-02' ? 'modulo2' : alert.id === 'alerta-04' ? 'modulo6' : 'modulo4';

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                onClick={() => onNavigateToTab(targetModule)}
                className={`border rounded-sm p-4 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${borderClass}`}
                title={`Clique para inspecionar este alerta no Módulo correspondente`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 uppercase ${badgeClass}`}>
                      <Icon className="w-3 h-3" />
                      {alert.tipo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.dataAlerta}</span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug mb-1.5">
                    {alert.titulo}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {alert.descricao}
                  </p>
                </div>

                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-2.5 mt-2 space-y-1 text-[11px] font-mono">
                  <div className="text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">IMPACTO:</span> {alert.impacto}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">AÇÃO:</span> {alert.acaoRecomendada}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Predictive Analysis Modal */}
      <PredictiveAnalysisModal
        isOpen={isPredictiveModalOpen}
        onClose={() => setIsPredictiveModalOpen(false)}
        ano={ano}
        summary={summary}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};


