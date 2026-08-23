import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FundebData } from '../types/fiscal';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../utils/formatters';

interface Module6FundebProps {
  fundebData: FundebData;
}

const COLORS = ['#10b981', '#3b82f6'];

export const Module6Fundeb: React.FC<Module6FundebProps> = ({ fundebData }) => {
  const pieData = [
    { name: 'Remuneração do Magistério (Profissionais da Educação)', value: fundebData.gastoProfissionaisEducacao, percent: fundebData.percentualMagisterio },
    { name: 'Manutenção e Desenvolvimento da Educação (MDE)', value: fundebData.gastoManutencaoDesenvolvimento, percent: fundebData.percentualManutencao },
  ];

  const monthlyData = (fundebData?.repassesMensais || []).map(r => ({
    mes: r.mes,
    VAAF: +(r.vaaf / 1_000_000).toFixed(2),
    VAAT: +(r.vaat / 1_000_000).toFixed(2),
    VAAR: +(r.vaar / 1_000_000).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner - TCE-PR Regularity Status */}
      <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/80 rounded-sm p-4 shadow-sm text-slate-900 dark:text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-sm bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                CERTIFICAÇÃO TCE-PR / SIOPE
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mt-1">
              Araucária está Regular e Fora da Lista de Risco do TCE-PR (Exercício 2027)
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              Todas as transmissões contábeis da Matriz de Saldos (MSC) e do sistema SIOPE/FNDE foram homologadas sem inconsistências.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="px-3 py-1.5 rounded-sm bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VAAT / VAAR Garantidos</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL RECEBIDO FUNDEB</span>
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
            {formatCompactCurrency(fundebData.repassesRecebidosTotal)}
          </div>
          <span className="text-[10px] font-mono text-slate-400">Transferido em {fundebData.exercicio}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/80 rounded-sm p-4 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">APLICAÇÃO MAGISTÉRIO</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              PISO 70%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
            {formatPercent(fundebData.percentualMagisterio)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">{formatCompactCurrency(fundebData.gastoProfissionaisEducacao)} aplicados</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MANUTENÇÃO E DESENV.</span>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-blue-600 dark:text-blue-400">
            {formatPercent(fundebData.percentualManutencao)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">{formatCompactCurrency(fundebData.gastoManutencaoDesenvolvimento)} aplicados</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS SIOPE / MSC</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{fundebData.statusSIOPE}</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-1 block">
            {fundebData.statusMSC}
          </span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Inflow by Modality (VAAF, VAAT, VAAR) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Composição Mensal dos Repasses FUNDEB (R$ Milhões)
              </h3>
              <p className="text-[11px] text-slate-500">Distribuição entre VAAF (ordinário), VAAT (total) e VAAR (resultado)</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              FNDE / TESOURO NACIONAL
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${val} mi`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontFamily: 'monospace' }} />
                <Bar dataKey="VAAF" stackId="a" fill="#10b981" />
                <Bar dataKey="VAAT" stackId="a" fill="#3b82f6" />
                <Bar dataKey="VAAR" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 70/30 Split Donut */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Divisão Obrigatória 70 / 30
              </h3>
              <p className="text-[11px] text-slate-500">Art. 212-A, XI da Constituição Federal</p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${formatCurrency(val)}`, 'Valor']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300 font-sans text-xs">Magistério (Professores)</span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fundebData.percentualMagisterio}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-blue-500" />
                <span className="text-slate-700 dark:text-slate-300 font-sans text-xs">Manutenção e Custeio</span>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">{fundebData.percentualManutencao}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
