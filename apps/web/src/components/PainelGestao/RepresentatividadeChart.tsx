import React from 'react';
import { ContratoGestao } from '../../types/painel';
import { DataSourceBadge } from '../DataSourceBadge';
import { PieChart, AlertCircle } from 'lucide-react';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

interface RepresentatividadeChartProps {
  contratos: ContratoGestao[];
  orcamentoTotal: number;
  titulo?: string;
}

export const RepresentatividadeChart: React.FC<RepresentatividadeChartProps> = ({
  contratos,
  orcamentoTotal,
  titulo = 'Concentração Orçamentária (Regra de Pareto 80/20)',
}) => {
  const sorted = [...contratos].sort((a, b) => b.valorTotal - a.valorTotal);
  const totalContratosValor = sorted.reduce((acc, c) => acc + c.valorTotal, 0);

  // Top 3 contratos
  const top3 = sorted.slice(0, 3);
  const top3Valor = top3.reduce((acc, c) => acc + c.valorTotal, 0);
  const top3Pct = totalContratosValor > 0 ? (top3Valor / totalContratosValor) * 100 : 0;

  // Top 8 contratos (para análise de concentração)
  const top8 = sorted.slice(0, 8);
  const top8Valor = top8.reduce((acc, c) => acc + c.valorTotal, 0);
  const top8Pct = totalContratosValor > 0 ? (top8Valor / totalContratosValor) * 100 : 0;

  const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-slate-600'];

  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-sky-500" />
          <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">{titulo}</span>
        </div>
        <DataSourceBadge
          dataSource={{ origin: 'OFICIAL', source: 'Base local (PNCP/TCE/uploads)', collectedAt: new Date().toISOString() }}
          size="xs"
        />
      </div>

      {/* Banner de Concentração Pareto */}
      <div className="bg-sky-950/40 border border-sky-700/40 rounded-sm p-3 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-200 leading-relaxed">
          <strong>Concentração Contratual:</strong> Os <strong>3 maiores contratos</strong> representam{' '}
          <span className="font-mono font-bold text-emerald-300">{top3Pct.toFixed(1)}%</span> do volume contratado
          (R$ {fmtBRL(top3Valor)}). Os <strong>8 maiores</strong> concentram{' '}
          <span className="font-mono font-bold text-amber-300">{top8Pct.toFixed(1)}%</span>.
        </div>
      </div>

      {/* Barra segmentada representativa */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Distribuição dos Principais Contratos</span>
          <span>Total: {fmtBRL(totalContratosValor)}</span>
        </div>

        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
          {top8.map((c, i) => {
            const pct = totalContratosValor > 0 ? (c.valorTotal / totalContratosValor) * 100 : 0;
            return (
              <div
                key={c.id}
                className={`${colors[i % colors.length]} transition-all duration-300 hover:opacity-80`}
                style={{ width: `${pct}%` }}
                title={`${c.empresa}: ${fmtBRL(c.valorTotal)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
          {totalContratosValor > top8Valor && (
            <div
              className="bg-slate-700 transition-all duration-300"
              style={{ width: `${100 - top8Pct}%` }}
              title={`Demais contratos: ${fmtBRL(totalContratosValor - top8Valor)} (${(100 - top8Pct).toFixed(1)}%)`}
            />
          )}
        </div>
      </div>

      {/* Legenda dos top contratos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {top3.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 bg-slate-800/40 rounded-sm p-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-slate-200 truncate">{c.empresa}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {fmtBRL(c.valorTotal)} • {c.representatividadePct.toFixed(1)}% da pasta
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
