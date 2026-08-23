import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Copy,
  Check,
  X,
  Printer,
  ChevronRight,
  Scale,
  DollarSign,
  PieChart,
  HelpCircle,
} from 'lucide-react';
import { MonthTrendPoint, FiscalKPIs } from '../types/fiscal';
import { get12MonthsTrendData } from '../utils/comparative';
import { getAnalisePreditiva } from '../services/api';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';

interface PredictiveAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ano: number;
  summary?: FiscalKPIs;
  onNavigateToTab?: (tabId: string) => void;
}

export const PredictiveAnalysisModal: React.FC<PredictiveAnalysisModalProps> = ({
  isOpen,
  onClose,
  ano,
  summary,
  onNavigateToTab,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedFocus, setSelectedFocus] = useState<string>('geral');

  // Compute 12-month trend data and slice the last 6 completed/monitored months
  const allMonths = useMemo(() => get12MonthsTrendData(ano), [ano]);
  
  // Last 6 months (indices 2 to 7 or 6 to 11 depending on year / default to months 3..8 for mid-year or last 6)
  const ultimos6Meses = useMemo(() => {
    // Return months Mar (index 2) to Aug (index 7) or last 6 elements
    return allMonths.slice(2, 8);
  }, [allMonths]);

  // Compute month-over-month percentage variations for the 6 months
  const variaveisMoM = useMemo(() => {
    return ultimos6Meses.map((m, idx, arr) => {
      let deltaReceita = 0;
      let deltaDespesa = 0;
      if (idx > 0) {
        const prev = arr[idx - 1];
        deltaReceita = prev.receita > 0 ? ((m.receita - prev.receita) / prev.receita) * 100 : 0;
        deltaDespesa = prev.despesa > 0 ? ((m.despesa - prev.despesa) / prev.despesa) * 100 : 0;
      }
      return {
        ...m,
        deltaReceita: +deltaReceita.toFixed(1),
        deltaDespesa: +deltaDespesa.toFixed(1),
        isFirst: idx === 0,
      };
    });
  }, [ultimos6Meses]);

  // Summary statistics for the 6-month window
  const semestralStats = useMemo(() => {
    const totalRec = ultimos6Meses.reduce((acc, m) => acc + m.receita, 0);
    const totalDesp = ultimos6Meses.reduce((acc, m) => acc + m.despesa, 0);
    const totalSaldo = totalRec - totalDesp;
    const mediaRec = totalRec / ultimos6Meses.length;
    const mediaDesp = totalDesp / ultimos6Meses.length;
    const mediaFolhaPercent = +(ultimos6Meses.reduce((acc, m) => acc + m.pessoalPercent, 0) / ultimos6Meses.length).toFixed(2);
    
    // Growth rate across the 6-month period (first vs last)
    const firstMonth = ultimos6Meses[0];
    const lastMonth = ultimos6Meses[ultimos6Meses.length - 1];
    const crescimentoReceita6M = firstMonth && lastMonth && firstMonth.receita > 0 
      ? +(((lastMonth.receita - firstMonth.receita) / firstMonth.receita) * 100).toFixed(1)
      : 0;
    const crescimentoDespesa6M = firstMonth && lastMonth && firstMonth.despesa > 0
      ? +(((lastMonth.despesa - firstMonth.despesa) / firstMonth.despesa) * 100).toFixed(1)
      : 0;

    return {
      totalRec,
      totalDesp,
      totalSaldo,
      mediaRec,
      mediaDesp,
      mediaFolhaPercent,
      crescimentoReceita6M,
      crescimentoDespesa6M,
      mesesSuperavit: ultimos6Meses.filter(m => m.resultado >= 0).length,
    };
  }, [ultimos6Meses]);

  // Fetch prediction on modal open or year change
  useEffect(() => {
    if (isOpen) {
      handleFetchPrediction();
    }
  }, [isOpen, ano]);

  const handleFetchPrediction = async () => {
    setLoading(true);
    try {
      const res = await getAnalisePreditiva(ano, ultimos6Meses);
      setReport(res.analise);
      setProvider(res.provedor || 'Gemini 3.7 Flash AI');
    } catch (err: any) {
      console.error('Erro ao consultar análise preditiva:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6 animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-800 dark:text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="predictive-modal-title"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-800/40 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-inner">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="predictive-modal-title" className="text-sm sm:text-base font-bold uppercase tracking-wider font-mono text-white">
                  Análise Preditiva & Inteligência Fiscal (IA)
                </h2>
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Exercício {ano}
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5 font-sans">
                Interpretação das variações percentuais dos últimos 6 meses e pontos de atenção orçamentária para Araucária/PR
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: 6-Month Percentage Variations Dashboard Matrix */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Matriz de Variações Percentuais (Últimos 6 Meses: {ultimos6Meses[0]?.mesNome} a {ultimos6Meses[ultimos6Meses.length - 1]?.mesNome})
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>Receita Acum.: <strong className="text-emerald-600 dark:text-emerald-400">{formatCompactCurrency(semestralStats.totalRec)}</strong></span>
                <span>Despesa Acum.: <strong className="text-blue-600 dark:text-blue-400">{formatCompactCurrency(semestralStats.totalDesp)}</strong></span>
                <span>Saldo 6M: <strong className="text-amber-600 dark:text-amber-400">+{formatCompactCurrency(semestralStats.totalSaldo)}</strong></span>
              </div>
            </div>

            {/* Monthly Cards with MoM Variations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {variaveisMoM.map((m, idx) => {
                const isSuperavit = m.resultado >= 0;
                return (
                  <div
                    key={m.mesIndex}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-sm p-2.5 flex flex-col justify-between space-y-2 shadow-2xs hover:border-purple-400 transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                        {m.mesNome}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                        isSuperavit ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {isSuperavit ? 'SUPERÁVIT' : 'DÉFICIT'}
                      </span>
                    </div>

                    {/* Receita + MoM */}
                    <div className="space-y-0.5 text-[10px] font-mono">
                      <div className="text-slate-400 flex justify-between">
                        <span>Receita:</span>
                        {!m.isFirst && (
                          <span className={`flex items-center ${m.deltaReceita >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {m.deltaReceita >= 0 ? '+' : ''}{m.deltaReceita}% MoM
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-emerald-400">
                        {formatCompactCurrency(m.receita)}
                      </div>
                    </div>

                    {/* Despesa + MoM */}
                    <div className="space-y-0.5 text-[10px] font-mono">
                      <div className="text-slate-400 flex justify-between">
                        <span>Despesa:</span>
                        {!m.isFirst && (
                          <span className={`flex items-center ${m.deltaDespesa <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {m.deltaDespesa >= 0 ? '+' : ''}{m.deltaDespesa}% MoM
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-blue-400">
                        {formatCompactCurrency(m.despesa)}
                      </div>
                    </div>

                    {/* Pessoal / RCL */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1 text-[9px] font-mono flex justify-between items-center">
                      <span className="text-slate-400">Folha/RCL:</span>
                      <span className={`font-bold ${m.pessoalPercent >= 48.6 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {m.pessoalPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick 6-Month Trend Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Variação Receita no Semestre</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {semestralStats.crescimentoReceita6M >= 0 ? '+' : ''}{semestralStats.crescimentoReceita6M}% ({ultimos6Meses[0]?.mes} → {ultimos6Meses[ultimos6Meses.length - 1]?.mes})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <TrendingDown className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Variação Despesa no Semestre</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {semestralStats.crescimentoDespesa6M >= 0 ? '+' : ''}{semestralStats.crescimentoDespesa6M}% ({ultimos6Meses[0]?.mes} → {ultimos6Meses[ultimos6Meses.length - 1]?.mes})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Scale className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Média Comprometimento Folha (LRF)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {semestralStats.mediaFolhaPercent}% da RCL (Alerta: 48,6%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: AI Predictive Analysis Output Box */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-sm p-5 shadow-sm space-y-4">
            {/* Header / Actions of the report */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider font-mono">
                  Parecer Preditivo de Auditoria Contábil (Inteligência Artificial)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {provider && (
                  <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-1 rounded-sm uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                    {provider}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleFetchPrediction}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                  title="Atualizar Análise Preditiva"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-500' : ''}`} />
                  <span>{loading ? 'Processando...' : 'Recalcular'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="Copiar Parecer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="Imprimir Relatório"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* AI Text Display */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4 text-slate-400 font-mono text-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                  <BrainCircuit className="w-5 h-5 text-purple-500 absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Processando Variações Históricas dos Últimos 6 Meses...
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md">
                    O Gemini 3.7 Flash está correlacionando a oscilação do ICMS da REPAR, a rigidez da folha de pessoal e os limites da LRF.
                  </p>
                </div>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-purple-50/20 dark:bg-purple-950/10 p-4 rounded-sm border border-purple-100 dark:border-purple-900/30">
                {report}
              </div>
            )}
          </div>

          {/* Section 3: Strategic Quick Action Link Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div
              onClick={() => {
                onClose();
                onNavigateToTab?.('modulo4');
              }}
              className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-sm hover:border-amber-400 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  Módulo 04 • Limites LRF
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Verificar Margem de Pessoal (50,15% da RCL)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition" />
            </div>

            <div
              onClick={() => {
                onClose();
                onNavigateToTab?.('modulo2');
              }}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-sm hover:border-emerald-400 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Módulo 02 • Receitas Orçamentárias
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Analisar Queda de ICMS e Royalties REPAR
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
            </div>

            <div
              onClick={() => {
                onClose();
                onNavigateToTab?.('diagnostico');
              }}
              className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-sm hover:border-indigo-400 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                  Módulo 08 • Diagnóstico IA Completo
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Consultar Pareceres Técnicos Customizados
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Auditoria Contábil Automatizada • Prefeitura de Araucária/PR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-sm uppercase tracking-wider text-xs transition cursor-pointer"
          >
            Fechar Parecer
          </button>
        </div>
      </div>
    </div>
  );
};
