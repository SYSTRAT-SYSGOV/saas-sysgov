import React, { useState, useMemo } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  FileText,
  Info,
  BookOpen,
  HelpCircle,
  Bell,
  Zap,
  Sliders,
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Calculator,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LRFLimit, ToastMessage } from '../types/fiscal';
import { formatCurrency, formatPercent, formatCompactCurrency } from '../utils/formatters';
import { DataSourceBadge } from './DataSourceBadge';

interface Module4LRFProps {
  limites: LRFLimit[];
  ano: number;
  onTriggerToast?: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
}

export const Module4LRF: React.FC<Module4LRFProps> = ({ limites, ano, onTriggerToast }) => {
  // Simulador de Pessoal & Concursos
  const [reajusteGeral, setReajusteGeral] = useState<number>(0);
  const [reajusteMagisterio, setReajusteMagisterio] = useState<number>(0);
  const [numMedicos, setNumMedicos] = useState<number>(0);
  const [numProfessores, setNumProfessores] = useState<number>(0);
  const [numGuardas, setNumGuardas] = useState<number>(0);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(true);

  // Extrai limite de pessoal do array de limites
  const limitePessoal = useMemo(() => {
    const arr = Array.isArray(limites) ? limites : ((limites as any)?.limites || []);
    return (
      arr.find((l: any) => l.id === 'pessoal_executivo' || l.nome?.toLowerCase().includes('pessoal')) || {
        baseCalculoValor: 1354000000, // RCL
        valorRealizado: 667522000,    // Despesa atual
        percentualRealizado: 49.3,
        limiteAlerta: 48.6,
        limitePrudencial: 51.3,
        limiteLegal: 54.0,
      }
    );
  }, [limites]);

  const rcl = limitePessoal.baseCalculoValor || 1354000000;
  const gastoAtual = limitePessoal.valorRealizado || 667522000;

  // Cálculo do impacto do simulador
  const simulacaoResult = useMemo(() => {
    // 1. Reajuste Geral (incide sobre ~65% da folha não-magistério)
    const impactoReajusteGeral = (gastoAtual * 0.65) * (reajusteGeral / 100);

    // 2. Reajuste Magistério (incide sobre ~35% da folha)
    const impactoReajusteMagisterio = (gastoAtual * 0.35) * (reajusteMagisterio / 100);

    // 3. Concursos / Contratações (salário + encargos de 27,5% + 13º + 1/3 férias = ~1.4x)
    const custoMedicoAno = 18000 * 13.33 * 1.275; // ~R$ 305k/ano
    const custoProfessorAno = 6200 * 13.33 * 1.275; // ~R$ 105k/ano
    const custoGuardaAno = 5100 * 13.33 * 1.275; // ~R$ 86k/ano

    const impactoContratacoes =
      numMedicos * custoMedicoAno +
      numProfessores * custoProfessorAno +
      numGuardas * custoGuardaAno;

    const impactoTotalAno = impactoReajusteGeral + impactoReajusteMagisterio + impactoContratacoes;
    const impactoMensal = impactoTotalAno / 12;

    const novoGasto = gastoAtual + impactoTotalAno;
    const novoPercentual = Number(((novoGasto / rcl) * 100).toFixed(2));

    // Determina status
    let statusSimulacao: 'REGULAR' | 'ALERTA' | 'PRUDENCIAL' | 'ESTOURO' = 'REGULAR';
    if (novoPercentual > 54.0) {
      statusSimulacao = 'ESTOURO';
    } else if (novoPercentual > 51.3) {
      statusSimulacao = 'PRUDENCIAL';
    } else if (novoPercentual > 48.6) {
      statusSimulacao = 'ALERTA';
    }

    return {
      impactoTotalAno,
      impactoMensal,
      novoGasto,
      novoPercentual,
      statusSimulacao,
      diferencaPercentual: +(novoPercentual - (limitePessoal.percentualRealizado || 49.3)).toFixed(2),
    };
  }, [reajusteGeral, reajusteMagisterio, numMedicos, numProfessores, numGuardas, gastoAtual, rcl, limitePessoal]);

  const handleResetSimulator = () => {
    setReajusteGeral(0);
    setReajusteMagisterio(0);
    setNumMedicos(0);
    setNumProfessores(0);
    setNumGuardas(0);
  };

  const handleSimulatePrudencial = () => {
    if (!onTriggerToast) return;
    onTriggerToast({
      type: 'danger',
      title: 'LRF: Limite Prudencial Ultrapassado!',
      message: `[Simulação de Estresse] A Despesa Total com Pessoal atingiu 52,10% da RCL no exercício ${ano}, ultrapassando o Limite Prudencial da LRF (51,30%). Vedações do art. 22 ativadas: proibição de contratação de horas extras, reajustes remuneratórios e criação de novos cargos públicos.`,
      limitName: 'Despesa Total com Pessoal — Poder Executivo',
      metricValue: '52,10%',
      threshold: 'Prudencial: 51,30% | Legal: 54,00%',
      ano: ano,
      actionLabel: 'Ver Limites LRF',
      actionTabId: 'modulo4',
      duration: 10000,
    });
  };

  const handleSimulateDivida = () => {
    if (!onTriggerToast) return;
    onTriggerToast({
      type: 'warning',
      title: 'LRF: Limite de Alerta de Dívida Atingido',
      message: `[Simulação de Estresse] A Dívida Consolidada Líquida atingiu 109,20% da RCL, ultrapassando o Limite de Alerta do Senado Federal (108,00%). Recomendada suspensão de novas operações de crédito.`,
      limitName: 'Dívida Consolidada Líquida (DCL)',
      metricValue: '109,20%',
      threshold: 'Alerta: 108,00% | Legal: 120,00%',
      ano: ano,
      actionLabel: 'Ver Limites LRF',
      actionTabId: 'modulo4',
      duration: 9000,
    });
  };

  const handleSimulateLegal = () => {
    if (!onTriggerToast) return;
    onTriggerToast({
      type: 'danger',
      title: 'LRF: Limite Legal Ultrapassado!',
      message: `[Simulação de Estresse] A Despesa Total com Pessoal atingiu 54,80% da RCL no exercício ${ano}, ultrapassando o Teto Legal Máximo de 54,00%. Município sujeito ao bloqueio de transferências voluntárias da União e sanções institucionais do TCE-PR.`,
      limitName: 'Despesa Total com Pessoal — Poder Executivo',
      metricValue: '54,80%',
      threshold: 'Teto Legal: 54,00%',
      ano: ano,
      actionLabel: 'Ver Limites LRF',
      actionTabId: 'modulo4',
      duration: 11000,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                MÓDULO 04 • LIMITES CONSTITUCIONAIS & LEI DE RESPONSABILIDADE FISCAL (LRF)
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Auditoria em tempo real dos limites legais da LC nº 101/2000, Instruções Normativas do TCE-PR e Constituição Federal. Acompanhe a folga prudencial de pessoal, pisos de saúde/educação e simule o impacto de reajustes e concursos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap font-mono">
            <DataSourceBadge size="sm" showDetails />
            <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              RGF OFICIAL • {ano}
            </span>
          </div>
        </div>

        {/* Simulation / Testing bar for Toast Notifications */}
        {onTriggerToast && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Simulação de Notificações Toast LRF:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                id="btn-test-toast-prudencial"
                onClick={handleSimulatePrudencial}
                className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                title="Testar disparo de toast quando Despesa com Pessoal ultrapassa o Limite Prudencial (51,30%)"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Simular Pessoal &gt; 51,3% (Prudencial)</span>
              </button>
              <button
                type="button"
                id="btn-test-toast-divida"
                onClick={handleSimulateDivida}
                className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 transition flex items-center gap-1 cursor-pointer"
                title="Testar disparo de toast quando Dívida Consolidada atinge o Limite de Alerta (108%)"
              >
                <Zap className="w-3 h-3 text-blue-500" />
                <span>Simular Dívida &gt; 108% (Alerta)</span>
              </button>
              <button
                type="button"
                id="btn-test-toast-legal"
                onClick={handleSimulateLegal}
                className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 transition flex items-center gap-1 cursor-pointer"
                title="Testar disparo de toast quando limite legal máximo é violado"
              >
                <Zap className="w-3 h-3 text-rose-500" />
                <span>Simular Pessoal &gt; 54% (Legal)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          NOVO: SIMULADOR DE IMPACTO SALARIAL E CONCURSOS (DTP / LRF)
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-800">
                SIMULADOR DE IMPACTO SALARIAL & CONCURSOS (ART. 22 LRF)
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                Simulador Preditivo de Reajustes da Folha, Piso do Magistério e Novas Contratações
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={handleResetSimulator}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Redefinir</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(prev => !prev)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              {isSimulatorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isSimulatorOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 font-mono">
            {/* Controles do Simulador (7 cols) */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              {/* Slider 1: Reajuste Geral */}
              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    1. Reajuste Salarial Geral da Prefeitura (Data-Base):
                  </span>
                  <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                    {reajusteGeral.toFixed(1)}% a.a.
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={reajusteGeral}
                  onChange={e => setReajusteGeral(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (Sem aumento)</span>
                  <span>4,5% (Inflação IPCA)</span>
                  <span>10% (Ganho Real)</span>
                  <span>15%</span>
                </div>
              </div>

              {/* Slider 2: Piso do Magistério */}
              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    2. Reajuste Específico do Piso do Magistério / Professores:
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                    {reajusteMagisterio.toFixed(1)}% a.a.
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={reajusteMagisterio}
                  onChange={e => setReajusteMagisterio(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>7,0% (Piso MEC Estimado)</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
              </div>

              {/* Concursos & Novas Vagas */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  3. Novas Contratações via Concurso Público:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-500 block">Médicos / Saúde</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={numMedicos}
                        onChange={e => setNumMedicos(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">vagas</span>
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-500 block">Professores / Educação</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={numProfessores}
                        onChange={e => setNumProfessores(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">vagas</span>
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-500 block">Guardas / Operacional</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={numGuardas}
                        onChange={e => setNumGuardas(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">vagas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado do Impacto da Simulação (5 cols) */}
            <div className="lg:col-span-5 p-4 bg-slate-950 text-white rounded border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    IMPACTO PROJETADO NA LRF ({ano})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      simulacaoResult.statusSimulacao === 'REGULAR'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : simulacaoResult.statusSimulacao === 'ALERTA'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {simulacaoResult.statusSimulacao === 'REGULAR'
                      ? '✓ SITUAÇÃO REGULAR'
                      : simulacaoResult.statusSimulacao === 'ALERTA'
                      ? '⚠️ LIMITE DE ALERTA'
                      : simulacaoResult.statusSimulacao === 'PRUDENCIAL'
                      ? '⛔ LIMITE PRUDENCIAL'
                      : '❌ TETO LEGAL ESTOURADO'}
                  </span>
                </div>

                <div className="py-2.5 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-400 text-xs">Novo % Folha / RCL:</span>
                    <div className="text-right">
                      <strong className={`text-2xl font-bold ${
                        simulacaoResult.novoPercentual > 51.3 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {simulacaoResult.novoPercentual}%
                      </strong>
                      {simulacaoResult.diferencaPercentual > 0 && (
                        <span className="text-[10px] text-amber-400 block">
                          (+{simulacaoResult.diferencaPercentual}% de aumento)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Acréscimo Anual:</span>
                    <strong className="text-amber-400 font-bold">
                      +{formatCurrency(simulacaoResult.impactoTotalAno)}
                    </strong>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Impacto Mensal:</span>
                    <strong className="text-white">
                      +{formatCurrency(simulacaoResult.impactoMensal)}/mês
                    </strong>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Nova Folha Anual:</span>
                    <span className="text-slate-300 font-bold">
                      {formatCurrency(simulacaoResult.novoGasto)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parecer das Vedações da LRF */}
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] font-sans leading-relaxed">
                {simulacaoResult.novoPercentual <= 51.3 ? (
                  <p className="text-emerald-300">
                    ✓ <strong>Espaço Fiscal Disponível:</strong> O município possui folga fiscal para absorver esta política salarial sem violar o limite prudencial de 51,30%.
                  </p>
                ) : (
                  <p className="text-rose-300">
                    ⛔ <strong>Vedações do Art. 22 da LRF Ativadas:</strong> Ao atingir {simulacaoResult.novoPercentual}%, o município fica expressamente proibido de conceder novas horas extras, criar cargos e contratar reajustes adicionais.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LRF Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Array.isArray(limites) ? limites : ((limites as any)?.limites || [])).map(item => {
          const isAtencao = item.status === 'ATENCAO';
          const isCritico = item.status === 'CRITICO';
          const isOk = item.status === 'OK';

          const borderClass = isCritico
            ? 'border-rose-300 dark:border-rose-800'
            : isAtencao
            ? 'border-amber-300 dark:border-amber-800'
            : 'border-emerald-300 dark:border-emerald-800';

          const badgeClass = isCritico
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            : isAtencao
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';

          const Icon = isCritico ? XCircle : isAtencao ? AlertTriangle : CheckCircle2;

          return (
            <div
              key={item.id}
              id={`lrf-card-${item.id}`}
              className={`border rounded-sm p-4 shadow-sm flex flex-col justify-between transition ${borderClass} bg-white dark:bg-slate-900`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-mono">
                      {item.baseCalculoNome}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {item.nome}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${badgeClass}`}>
                    <Icon className="w-3 h-3" />
                    {item.status}
                  </span>
                </div>

                {/* Values & Progress Visual */}
                <div className="my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-sm border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">Realizado / Aplicado:</span>
                    <div className="text-right">
                      <span className="text-lg font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
                        {formatPercent(item.percentualRealizado)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        ({formatCurrency(item.valorRealizado)})
                      </span>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div
                      className={`h-full ${
                        isCritico ? 'bg-rose-500' : isAtencao ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (item.percentualRealizado / (item.limiteLegal * 1.2 || 100)) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Legal Benchmarks */}
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                    {item.limiteAlerta && (
                      <span className="text-amber-600 dark:text-amber-400">Alerta: {item.limiteAlerta}%</span>
                    )}
                    {item.limitePrudencial && (
                      <span className="text-orange-600 dark:text-orange-400">Prudencial: {item.limitePrudencial}%</span>
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.limiteMinimoOuMaximo === 'minimo' ? 'Piso Mínimo' : 'Teto Legal'}: {item.limiteLegal}%
                    </span>
                  </div>
                </div>

                {/* Legal foundation & audit note */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    <BookOpen className="w-3 h-3" />
                    <span>Fundamento: {item.fundamentoLegal}</span>
                  </div>
                  <p className="text-xs leading-relaxed bg-slate-50/60 dark:bg-slate-800/30 p-2 rounded-sm border border-slate-100 dark:border-slate-800 font-mono text-[11px]">
                    {item.observacao}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 uppercase">Base de Cálculo:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(item.baseCalculoValor)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
