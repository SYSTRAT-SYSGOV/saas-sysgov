import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  GraduationCap,
  HeartPulse,
  Users,
  PiggyBank,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Maximize2,
  Layers,
} from 'lucide-react';
import { FiscalKPIs } from '../types/fiscal';
import { formatPercent, formatCurrency, formatCompactCurrency } from '../utils/formatters';

interface FiscalRadarLimitsChartProps {
  summary: FiscalKPIs;
  ano: number;
  onNavigateToTab: (tabId: string) => void;
}

interface RadarDataPoint {
  id: string;
  grupo: string;
  grupoCurto: string;
  baseLegal: string;
  tipoLimite: 'PISO_MINIMO' | 'TETO_MAXIMO' | 'META_EQUACIONAMENTO';
  limiteConstitucionalPct: number;
  executadoPct: number;
  // Normalized score 0-100% where 100% represents exact compliance with target/floor or legal threshold
  aderenciaPct: number;
  limiteNormPct: number;
  valorNominal: number;
  valorReferenciaNominal: number;
  folgaOuExcessoNominal: number;
  status: 'EM_CONFORMIDADE' | 'ALERTA' | 'CRITICO';
  statusDesc: string;
  descricao: string;
  moduloAlvo: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const FiscalRadarLimitsChart: React.FC<FiscalRadarLimitsChartProps> = ({
  summary,
  ano,
  onNavigateToTab,
}) => {
  const [viewMode, setViewMode] = useState<'aderencia' | 'percentualDireto'>('aderencia');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Define the 5 main constitutional/statutory expense groups
  const radarData: RadarDataPoint[] = [
    {
      id: 'educacao',
      grupo: 'Educação (MDE)',
      grupoCurto: 'Educação (25%)',
      baseLegal: 'Art. 212 da CF/88',
      tipoLimite: 'PISO_MINIMO',
      limiteConstitucionalPct: 25.0,
      executadoPct: summary.aplicacaoEducacaoPercentual, // 26.68%
      aderenciaPct: Number(((summary.aplicacaoEducacaoPercentual / 25.0) * 100).toFixed(1)), // ~106.7%
      limiteNormPct: 100.0,
      valorNominal: summary.aplicacaoEducacaoValor,
      valorReferenciaNominal: summary.rcl * 0.25,
      folgaOuExcessoNominal: summary.aplicacaoEducacaoValor - (summary.rcl * 0.25),
      status: summary.aplicacaoEducacaoPercentual >= 25.0 ? 'EM_CONFORMIDADE' : 'CRITICO',
      statusDesc: `Piso Constitucional Superado (+${(summary.aplicacaoEducacaoPercentual - 25.0).toFixed(2)} p.p.)`,
      descricao: 'Aplicação mínima em Manutenção e Desenvolvimento do Ensino (MDE) sobre a receita resultante de impostos.',
      moduloAlvo: 'modulo6',
      icon: GraduationCap,
    },
    {
      id: 'saude',
      grupo: 'Saúde Pública (ASPS)',
      grupoCurto: 'Saúde (15%)',
      baseLegal: 'LC 141/2012 / Art. 198 CF',
      tipoLimite: 'PISO_MINIMO',
      limiteConstitucionalPct: 15.0,
      executadoPct: summary.aplicacaoSaudePercentual, // 20.30%
      aderenciaPct: Number(((summary.aplicacaoSaudePercentual / 15.0) * 100).toFixed(1)), // ~135.3%
      limiteNormPct: 100.0,
      valorNominal: summary.aplicacaoSaudeValor,
      valorReferenciaNominal: summary.rcl * 0.15,
      folgaOuExcessoNominal: summary.aplicacaoSaudeValor - (summary.rcl * 0.15),
      status: summary.aplicacaoSaudePercentual >= 15.0 ? 'EM_CONFORMIDADE' : 'CRITICO',
      statusDesc: `Piso Constitucional Superado (+${(summary.aplicacaoSaudePercentual - 15.0).toFixed(2)} p.p.)`,
      descricao: 'Ações e Serviços Públicos de Saúde (ASPS) financiados com recursos próprios do tesouro municipal.',
      moduloAlvo: 'modulo4',
      icon: HeartPulse,
    },
    {
      id: 'pessoal',
      grupo: 'Despesa com Pessoal',
      grupoCurto: 'Pessoal LRF (54%)',
      baseLegal: 'Art. 19 e 20 da LRF',
      tipoLimite: 'TETO_MAXIMO',
      limiteConstitucionalPct: 54.0,
      executadoPct: summary.despesaPessoalPercentualRCL, // 50.15%
      aderenciaPct: Number(((summary.despesaPessoalPercentualRCL / 54.0) * 100).toFixed(1)), // ~92.9% do teto
      limiteNormPct: 100.0,
      valorNominal: summary.despesaPessoalTotal,
      valorReferenciaNominal: summary.rcl * 0.54,
      folgaOuExcessoNominal: (summary.rcl * 0.54) - summary.despesaPessoalTotal,
      status: summary.despesaPessoalPercentualRCL > 51.3 ? 'CRITICO' : summary.despesaPessoalPercentualRCL > 48.6 ? 'ALERTA' : 'EM_CONFORMIDADE',
      statusDesc: summary.despesaPessoalPercentualRCL > 48.6 ? 'Acima do Limite de Alerta (48,60% TCE-PR)' : 'Dentro da Faixa Segura',
      descricao: 'Limite máximo legal de 54,00% da Receita Corrente Líquida (RCL 12 meses) para o Poder Executivo Municipal.',
      moduloAlvo: 'modulo4',
      icon: Users,
    },
    {
      id: 'previdencia',
      grupo: 'Aportes FPMA (Previdência)',
      grupoCurto: 'Previdência (FPMA)',
      baseLegal: 'Art. 40 da CF / Lei Municipal',
      tipoLimite: 'META_EQUACIONAMENTO',
      limiteConstitucionalPct: 100.0,
      executadoPct: 92.5, // 92.5% executado do cronograma atuarial
      aderenciaPct: 92.5,
      limiteNormPct: 100.0,
      valorNominal: summary.aportePrevidenciarioFPMA, // R$ 82.000.000
      valorReferenciaNominal: 88648000,
      folgaOuExcessoNominal: summary.aportePrevidenciarioFPMA - 88648000,
      status: 'EM_CONFORMIDADE',
      statusDesc: 'Equacionamento Atuarial Conforme Cronograma',
      descricao: 'Plano de amortização suplementar para equacionamento do déficit atuarial do Fundo de Previdência de Araucária.',
      moduloAlvo: 'modulo3',
      icon: PiggyBank,
    },
    {
      id: 'legislativo',
      grupo: 'Repasse Câmara Municipal',
      grupoCurto: 'Câmara (Art. 29-A)',
      baseLegal: 'Art. 29-A, I da CF/88',
      tipoLimite: 'TETO_MAXIMO',
      limiteConstitucionalPct: 5.0, // Limite para cidades de 100.001 a 300.000 hab = 6% ou 5%
      executadoPct: 4.22, // 4.22% da base tributária + transferências
      aderenciaPct: Number(((4.22 / 5.0) * 100).toFixed(1)), // 84.4% do teto
      limiteNormPct: 100.0,
      valorNominal: 51200000,
      valorReferenciaNominal: (51200000 / 0.0422) * 0.05,
      folgaOuExcessoNominal: ((51200000 / 0.0422) * 0.05) - 51200000,
      status: 'EM_CONFORMIDADE',
      statusDesc: 'Dentro do Teto Constitucional (4,22% de 5,00%)',
      descricao: 'Total da despesa da Câmara de Vereadores, incluindo subsídios, não pode exceder o teto constitucional da base.',
      moduloAlvo: 'modulo3',
      icon: Landmark,
    },
  ];

  // Chart data format
  const chartData = radarData.map(item => {
    if (viewMode === 'aderencia') {
      return {
        grupo: item.grupoCurto,
        fullName: item.grupo,
        id: item.id,
        'Execução Atual (%)': item.aderenciaPct,
        'Limite / Meta (100%)': 100,
        rawExec: item.executadoPct,
        rawLimit: item.limiteConstitucionalPct,
        tipoLimite: item.tipoLimite,
        baseLegal: item.baseLegal,
        status: item.status,
      };
    } else {
      return {
        grupo: item.grupoCurto,
        fullName: item.grupo,
        id: item.id,
        'Executado Real (%)': item.executadoPct,
        'Limite Legal (%)': item.limiteConstitucionalPct,
        rawExec: item.executadoPct,
        rawLimit: item.limiteConstitucionalPct,
        tipoLimite: item.tipoLimite,
        baseLegal: item.baseLegal,
        status: item.status,
      };
    }
  });

  const activeGroupData = radarData.find(d => d.id === selectedGroup) || radarData[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm space-y-4">
      {/* Header with Title, Mode Switch and Legal Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-indigo-600 dark:bg-indigo-700 text-white shadow-sm">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
              RADAR DE EXECUÇÃO ORÇAMENTÁRIA vs LIMITES CONSTITUCIONAIS & LRF ({ano})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Confronto polar dos 5 principais grupos de vinculação e restrição fiscal do Município de Araucária
            </p>
          </div>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex items-center self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode('aderencia')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === 'aderencia'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Exibe a aderência normalizada (onde 100% representa o exato cumprimento do piso/teto/meta)"
          >
            <Layers className="w-3 h-3" />
            Índice de Aderência (%)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('percentualDireto')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === 'percentualDireto'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Exibe as alíquotas diretas de cada indicador fiscal (% da base de cálculo)"
          >
            <Maximize2 className="w-3 h-3" />
            Alíquotas Diretas (%)
          </button>
        </div>
      </div>

      {/* Main Layout: 2 Columns (Radar Canvas + Interactive Inspector Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Radar Chart */}
        <div className="lg:col-span-7 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              {viewMode === 'aderencia'
                ? 'Escala normalizada: 100% = Cumprimento pleno do limite / piso / meta'
                : 'Escala real dos limites (% sobre bases tributárias e RCL)'}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">5 Eixos Fiscais</span>
          </div>

          {/* Chart Container */}
          <div className="w-full h-[320px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
                <PolarAngleAxis
                  dataKey="grupo"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={viewMode === 'aderencia' ? [0, 140] : [0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  stroke="#cbd5e1"
                  className="dark:stroke-slate-700"
                />
                <Radar
                  name={viewMode === 'aderencia' ? 'Limite / Meta (100%)' : 'Limite Legal (%)'}
                  dataKey={viewMode === 'aderencia' ? 'Limite / Meta (100%)' : 'Limite Legal (%)'}
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.15}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
                <Radar
                  name={viewMode === 'aderencia' ? 'Execução Atual (%)' : 'Executado Real (%)'}
                  dataKey={viewMode === 'aderencia' ? 'Execução Atual (%)' : 'Executado Real (%)'}
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.45}
                  strokeWidth={2.5}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    const fullItem = radarData.find(d => d.id === item.id);
                    if (!fullItem) return null;

                    return (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-mono max-w-xs space-y-1.5 z-50">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-900 dark:text-white font-sans">
                            {fullItem.grupo}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                            {fullItem.baseLegal}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Realizado:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {fullItem.executadoPct.toFixed(2)}% ({formatCompactCurrency(fullItem.valorNominal)})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              {fullItem.tipoLimite === 'PISO_MINIMO' ? 'Piso Mínimo:' : 'Teto Máximo:'}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {fullItem.limiteConstitucionalPct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                            <span className="text-slate-500">Índice de Aderência:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {fullItem.aderenciaPct}%
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] font-sans font-semibold pt-1 ${
                          fullItem.status === 'EM_CONFORMIDADE'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : fullItem.status === 'ALERTA'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          ● {fullItem.statusDesc}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-mono mt-1">
            Clique nos eixos da tabela ao lado para inspecionar os cálculos orçamentários específicos
          </div>
        </div>

        {/* Right Column: Interactive 5-Group Inspector & Details */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Detalhamento dos 5 Grupos de Despesas Vinculadas
            </span>

            <div className="space-y-1.5">
              {radarData.map(group => {
                const Icon = group.icon;
                const isSelected = (selectedGroup || radarData[0].id) === group.id;

                const statusColor = group.status === 'EM_CONFORMIDADE'
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300'
                  : group.status === 'ALERTA'
                  ? 'border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300'
                  : 'border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10 text-rose-700 dark:text-rose-300';

                return (
                  <button
                    type="button"
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={`w-full text-left p-2.5 rounded-sm border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {group.grupo}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {group.baseLegal}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {group.executadoPct.toFixed(2)}%
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Limite: {group.limiteConstitucionalPct.toFixed(1)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Group Focus Card */}
          {activeGroupData && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <activeGroupData.icon className="w-4 h-4 text-indigo-500" />
                  {activeGroupData.grupo}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  activeGroupData.status === 'EM_CONFORMIDADE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {activeGroupData.statusDesc}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeGroupData.descricao}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[9px] text-slate-400 uppercase">Valor Liquidado</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(activeGroupData.valorNominal)}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[9px] text-slate-400 uppercase">
                    {activeGroupData.folgaOuExcessoNominal >= 0 ? 'Margem de Folga' : 'Excesso'}
                  </div>
                  <div className={`font-bold ${activeGroupData.folgaOuExcessoNominal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {activeGroupData.folgaOuExcessoNominal >= 0 ? '+' : ''}
                    {formatCompactCurrency(activeGroupData.folgaOuExcessoNominal)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab(activeGroupData.moduloAlvo)}
                className="w-full mt-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                Inspecionar no Módulo Especializado →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
