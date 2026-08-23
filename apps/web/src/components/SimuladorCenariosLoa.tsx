import React, { useState, useMemo } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  Sparkles,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Landmark,
  Building2,
  FileSpreadsheet,
  PieChart,
  HelpCircle,
  FileText,
  Percent,
} from 'lucide-react';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';
import { DataSourceBadge } from './DataSourceBadge';

interface SimuladorCenariosLoaProps {
  cidade?: string;
  uf?: string;
  orcamentoBase?: number;
  rclBase?: number;
  despesaPessoalBase?: number;
  onExportPdf?: () => void;
}

export const SimuladorCenariosLoa: React.FC<SimuladorCenariosLoaProps> = ({
  cidade = 'Araucária',
  uf = 'PR',
  orcamentoBase = 1910000000,
  rclBase = 1354000000,
  despesaPessoalBase = 679029000,
  onExportPdf,
}) => {
  // Sliders States
  const [variacaoIssPct, setVariacaoIssPct] = useState<number>(0);
  const [recadastramentoPgvPct, setRecadastramentoPgvPct] = useState<number>(0);
  const [corteCusteioPct, setCorteCusteioPct] = useState<number>(0);
  const [variacaoItbiPct, setVariacaoItbiPct] = useState<number>(0);

  // Valores Base da LOA
  const issBase = Math.round(orcamentoBase * 0.125);
  const iptuBase = Math.round(orcamentoBase * 0.082);
  const itbiBase = Math.round(orcamentoBase * 0.038);
  const transferenciasBase = Math.round(orcamentoBase * 0.755);
  const custeioBase = Math.round(orcamentoBase * 0.32);
  const investimentosBase = Math.round(orcamentoBase * 0.12);

  // Cálculos Simulados em Tempo Real (< 2ms)
  const issSimulado = Math.round(issBase * (1 + variacaoIssPct / 100));
  const iptuSimulado = Math.round(iptuBase * (1 + recadastramentoPgvPct / 100));
  const itbiSimulado = Math.round(itbiBase * (1 + variacaoItbiPct / 100));
  const custeioSimulado = Math.round(custeioBase * (1 + corteCusteioPct / 100));

  const deltaIss = issSimulado - issBase;
  const deltaIptu = iptuSimulado - iptuBase;
  const deltaItbi = itbiSimulado - itbiBase;
  const deltaCusteio = custeioSimulado - custeioBase; // negativo se houver corte
  const economiaCusteio = -deltaCusteio;

  const deltaReceitaPropria = deltaIss + deltaIptu + deltaItbi;
  const impactoLiquidoAnual = deltaReceitaPropria + economiaCusteio;

  const receitaTotalSimulada = orcamentoBase + deltaReceitaPropria;
  const despesaTotalSimulada = orcamentoBase + deltaCusteio;
  const saldoPrimarioSimulado = receitaTotalSimulada - despesaTotalSimulada;

  // Impacto na RCL e Folha de Pessoal
  const rclSimulada = Math.round(rclBase + deltaReceitaPropria * 0.95);
  const folhaPctBase = Number(((despesaPessoalBase / rclBase) * 100).toFixed(2));
  const folhaPctSimulada = Number(((despesaPessoalBase / rclSimulada) * 100).toFixed(2));
  const deltaFolhaPct = Number((folhaPctSimulada - folhaPctBase).toFixed(2));

  // Limite Prudencial LRF (51,3% da RCL)
  const limitePrudencialReaisBase = Math.round(rclBase * 0.513);
  const limitePrudencialReaisSimulado = Math.round(rclSimulada * 0.513);
  const folgaPrudencialBase = limitePrudencialReaisBase - despesaPessoalBase;
  const folgaPrudencialSimulada = limitePrudencialReaisSimulado - despesaPessoalBase;
  const ganhoFolgaPrudencial = folgaPrudencialSimulada - folgaPrudencialBase;

  // Presets Rápidos
  const aplicarPreset = (tipo: 'reforma' | 'ajuste' | 'investimento' | 'reset') => {
    if (tipo === 'reset') {
      setVariacaoIssPct(0);
      setRecadastramentoPgvPct(0);
      setCorteCusteioPct(0);
      setVariacaoItbiPct(0);
    } else if (tipo === 'reforma') {
      setVariacaoIssPct(12);
      setRecadastramentoPgvPct(18);
      setCorteCusteioPct(0);
      setVariacaoItbiPct(8);
    } else if (tipo === 'ajuste') {
      setVariacaoIssPct(5);
      setRecadastramentoPgvPct(5);
      setCorteCusteioPct(-8);
      setVariacaoItbiPct(0);
    } else if (tipo === 'investimento') {
      setVariacaoIssPct(15);
      setRecadastramentoPgvPct(25);
      setCorteCusteioPct(-10);
      setVariacaoItbiPct(12);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0 font-sans">
      {/* Top Banner: Cabeçalho Executivo */}
      <div className="bg-white dark:bg-navy-950 border border-slate-200/90 dark:border-navy-800/80 rounded-sm p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-sans">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#0a1128] text-white border border-navy-700 flex items-center gap-1 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              SIMULADOR DE CENÁRIOS LOA • TOMADA DE DECISÃO "E SE"
            </span>
            <DataSourceBadge size="xs" showDetails />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-950 dark:text-white font-sans">
            SIMULADOR DE IMPACTO FISCAL & RECEITAS PRÓPRIAS — {cidade} / {uf}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
            Simule o efeito imediato de revisões de alíquota de ISS/ITBI, recadastramento imobiliário (PGV) e corte de custeio na folha LRF e no orçamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden font-sans">
          <button
            onClick={() => aplicarPreset('reset')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-navy-900 hover:bg-slate-200 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xs transition flex items-center gap-1.5 border border-slate-300 dark:border-navy-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-[#0a1128] hover:bg-[#1a2a52] text-white text-xs font-bold rounded-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Síntese Executiva em Linguagem Humana */}
      <div className={`p-4 rounded-sm border shadow-xs transition-all duration-300 font-sans ${
        deltaReceitaPropria > 0 || economiaCusteio > 0
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
          : 'bg-slate-50 dark:bg-navy-900/60 border-slate-200 dark:border-navy-800 text-slate-800 dark:text-slate-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block font-sans">
              SÍNTESE EXECUTIVA PARA O GABINETE DO PREFEITO
            </span>
            <p className="text-sm font-sans font-bold leading-relaxed">
              {deltaReceitaPropria > 0 || economiaCusteio > 0 ? (
                <>
                  Com essas mudanças simuladas, a sua folha cairia de{' '}
                  <span className="text-amber-700 dark:text-amber-300 font-bold underline">{folhaPctBase}%</span> para{' '}
                  <span className="text-emerald-300 font-mono underline">{folhaPctSimulada}%</span> da RCL (
                  <span className="text-emerald-300 font-mono font-bold">
                    +R$ {(ganhoFolgaPrudencial / 1_000_000).toFixed(2)}M
                  </span>{' '}
                  de folga prudencial na LRF) e o impacto financeiro líquido seria de{' '}
                  <span className="text-emerald-300 font-mono font-bold">
                    +{formatCurrency(impactoLiquidoAnual)}/ano
                  </span>
                  .
                </>
              ) : (
                <>
                  Cenário Base da LOA 2026: Folha comprometendo{' '}
                  <span className="text-white font-mono">{folhaPctBase}%</span> da RCL ({folgaPrudencialBase >= 0 ? `folga de R$ ${(folgaPrudencialBase / 1_000_000).toFixed(2)}M até o limite prudencial` : 'atenção'}). Mova os 4 sliders abaixo para projetar ganhos e folga fiscal.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Presets Rápidos de Decisão */}
      <div className="flex flex-wrap items-center gap-2 pt-1 print:hidden">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase mr-1">Cenários Prontos:</span>
        <button
          onClick={() => aplicarPreset('reforma')}
          className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 rounded-xs text-xs font-mono font-bold transition cursor-pointer"
        >
          🚀 Reforma Tributária Local (ISS +12%, PGV +18%)
        </button>
        <button
          onClick={() => aplicarPreset('ajuste')}
          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xs text-xs font-mono font-bold transition cursor-pointer"
        >
          ⚖️ Ajuste Fiscal LRF (Corte Custeio -8%, ISS +5%)
        </button>
        <button
          onClick={() => aplicarPreset('investimento')}
          className="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-xs text-xs font-mono font-bold transition cursor-pointer"
        >
          ⚡ Pauta Máxima de Investimentos (+R$ {(orcamentoBase * 0.04 / 1_000_000).toFixed(1)}M)
        </button>
      </div>

      {/* Grid Principal: Sliders à Esquerda & Comparativo Visual à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =========================================================================
            COLUNA 1 (5 COLS): 4 SLIDERS INTERATIVOS
        ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block mb-1">
              PARÂMETROS DE SIMULAÇÃO
            </span>
            <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-500" />
              <span>Sliders de Decisão Executiva</span>
            </h3>
          </div>

          {/* Slider 1: Aumentar / Ajustar ISS (%) */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xs border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Aumentar Alíquota / Base do ISS</span>
              </span>
              <strong className="text-blue-600 dark:text-blue-400 text-sm">
                {variacaoIssPct > 0 ? `+${variacaoIssPct}%` : `${variacaoIssPct}%`}
              </strong>
            </div>
            <input
              type="range"
              min={-15}
              max={40}
              step={1}
              value={variacaoIssPct}
              onChange={(e) => setVariacaoIssPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Base: {formatCompactCurrency(issBase)}</span>
              <span className={deltaIss >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                Impacto: {deltaIss >= 0 ? `+${formatCompactCurrency(deltaIss)}` : formatCompactCurrency(deltaIss)}/ano
              </span>
            </div>
          </div>

          {/* Slider 2: Recadastrar Imóveis (PGV Atualizada %) */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xs border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recadastramento Imobiliário (PGV)</span>
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                +{recadastramentoPgvPct}%
              </strong>
            </div>
            <input
              type="range"
              min={0}
              max={35}
              step={1}
              value={recadastramentoPgvPct}
              onChange={(e) => setRecadastramentoPgvPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Base IPTU: {formatCompactCurrency(iptuBase)}</span>
              <span className="text-emerald-500 font-bold">
                Impacto: +{formatCompactCurrency(deltaIptu)}/ano
              </span>
            </div>
          </div>

          {/* Slider 3: Cortar Custeio em Z% */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xs border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                <span>Cortar Despesas Correntes de Custeio</span>
              </span>
              <strong className="text-amber-600 dark:text-amber-400 text-sm">
                {corteCusteioPct}%
              </strong>
            </div>
            <input
              type="range"
              min={-20}
              max={0}
              step={0.5}
              value={corteCusteioPct}
              onChange={(e) => setCorteCusteioPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Base Custeio: {formatCompactCurrency(custeioBase)}</span>
              <span className="text-emerald-500 font-bold">
                Economia: +{formatCompactCurrency(economiaCusteio)}/ano
              </span>
            </div>
          </div>

          {/* Slider 4: Revisar Alíquota ITBI */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xs border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-500" />
                <span>Revisar Alíquota / Avaliação ITBI</span>
              </span>
              <strong className="text-purple-600 dark:text-purple-400 text-sm">
                {variacaoItbiPct > 0 ? `+${variacaoItbiPct}%` : `${variacaoItbiPct}%`}
              </strong>
            </div>
            <input
              type="range"
              min={-10}
              max={30}
              step={1}
              value={variacaoItbiPct}
              onChange={(e) => setVariacaoItbiPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Base ITBI: {formatCompactCurrency(itbiBase)}</span>
              <span className={deltaItbi >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                Impacto: {deltaItbi >= 0 ? `+${formatCompactCurrency(deltaItbi)}` : formatCompactCurrency(deltaItbi)}/ano
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUNA 2 (7 COLS): CENÁRIO BASE VS CENÁRIO SIMULADO (VISUAL COMPARATIVO)
        ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* 3 KPI Cards de Comparação Direta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                % FOLHA SOBRE A RCL
              </span>
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold font-mono tracking-tighter text-slate-400 line-through">
                  {folhaPctBase}%
                </div>
                <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
                  {folhaPctSimulada}%
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                {deltaFolhaPct <= 0 ? `${deltaFolhaPct}% de alívio fiscal` : `+${deltaFolhaPct}% de aumento`}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                RECEITA PRÓPRIA ANUAL
              </span>
              <div className="text-2xl font-bold font-mono tracking-tighter text-blue-600 dark:text-blue-400">
                {formatCompactCurrency(issSimulado + iptuSimulado + itbiSimulado)}
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                +{formatCompactCurrency(deltaReceitaPropria)}/ano de ganho
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                SUPERÁVIT SIMULADO
              </span>
              <div className="text-2xl font-bold font-mono tracking-tighter text-purple-600 dark:text-purple-400">
                {formatCompactCurrency(saldoPrimarioSimulado)}
              </div>
              <span className="text-[10px] font-mono text-purple-400">
                Espaço para novos investimentos
              </span>
            </div>
          </div>

          {/* Tabela Analítica: Cenário Base vs Cenário Simulado */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                📊 Balanço Comparativo: Cenário Base vs. Simulado
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Valores em R$ Anuais</span>
            </div>

            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800/40 text-[10px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Conta / Rubrica Orçamentária</th>
                  <th className="p-3 text-right">Cenário Base</th>
                  <th className="p-3 text-right">Cenário Simulado</th>
                  <th className="p-3 text-right">Variação Nominal</th>
                  <th className="p-3 text-right">Impacto %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-blue-500" />
                    <span>ISSQN (Imposto sobre Serviços)</span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(issBase)}</td>
                  <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(issSimulado)}</td>
                  <td className={`p-3 text-right font-bold ${deltaIss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {deltaIss >= 0 ? `+${formatCurrency(deltaIss)}` : formatCurrency(deltaIss)}
                  </td>
                  <td className="p-3 text-right">{variacaoIssPct}%</td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                    <Landmark className="w-3 h-3 text-emerald-500" />
                    <span>IPTU (Recadastramento / PGV)</span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(iptuBase)}</td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(iptuSimulado)}</td>
                  <td className="p-3 text-right font-bold text-emerald-500">
                    +{formatCurrency(deltaIptu)}
                  </td>
                  <td className="p-3 text-right">+{recadastramentoPgvPct}%</td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                    <Percent className="w-3 h-3 text-purple-500" />
                    <span>ITBI (Transmissão de Imóveis)</span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(itbiBase)}</td>
                  <td className="p-3 text-right font-bold text-purple-600 dark:text-purple-400">{formatCurrency(itbiSimulado)}</td>
                  <td className={`p-3 text-right font-bold ${deltaItbi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {deltaItbi >= 0 ? `+${formatCurrency(deltaItbi)}` : formatCurrency(deltaItbi)}
                  </td>
                  <td className="p-3 text-right">{variacaoItbiPct}%</td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                    <TrendingDown className="w-3 h-3 text-amber-500" />
                    <span>Despesas Correntes de Custeio</span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(custeioBase)}</td>
                  <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency(custeioSimulado)}</td>
                  <td className="p-3 text-right font-bold text-emerald-500">
                    -{formatCurrency(economiaCusteio)}
                  </td>
                  <td className="p-3 text-right">{corteCusteioPct}%</td>
                </tr>

                <tr className="bg-slate-100/70 dark:bg-slate-800/70 font-bold">
                  <td className="p-3 font-sans uppercase">Receita Corrente Líquida (RCL)</td>
                  <td className="p-3 text-right">{formatCurrency(rclBase)}</td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(rclSimulada)}</td>
                  <td className="p-3 text-right text-emerald-500">+{formatCurrency(rclSimulada - rclBase)}</td>
                  <td className="p-3 text-right">+{(((rclSimulada - rclBase) / rclBase) * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
