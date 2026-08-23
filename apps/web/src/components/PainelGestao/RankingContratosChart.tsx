import React from 'react';
import { ContratoGestao } from '../../types/painel';
import { DataSourceBadge } from '../DataSourceBadge';
import { BarChart3, TrendingUp } from 'lucide-react';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

interface RankingContratosChartProps {
  contratos: ContratoGestao[];
  titulo?: string;
  limit?: number;
}

export const RankingContratosChart: React.FC<RankingContratosChartProps> = ({
  contratos,
  titulo = 'Ranking de Contratos por Valor',
  limit = 8,
}) => {
  const topContratos = [...contratos].sort((a, b) => b.valorTotal - a.valorTotal).slice(0, limit);
  const max = topContratos.length > 0 ? topContratos[0].valorTotal : 1;

  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">{titulo}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 text-slate-700 dark:text-slate-300 font-bold">
            Top {topContratos.length}
          </span>
        </div>
        <DataSourceBadge
          dataSource={{ origin: 'OFICIAL', source: 'Base local (PNCP/TCE/uploads)', collectedAt: new Date().toISOString() }}
          size="xs"
        />
      </div>

      <div className="space-y-2.5">
        {topContratos.map((c, i) => {
          const pctMax = (c.valorTotal / max) * 100;
          const critColor =
            c.criticidade === 'ESSENCIAL'
              ? 'bg-rose-500'
              : c.criticidade === 'IMPORTANTE'
              ? 'bg-amber-500'
              : 'bg-emerald-500';

          return (
            <div key={c.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-slate-500 w-4 text-right">{i + 1}.</span>
                  <span className="font-mono text-slate-300 truncate max-w-[180px] sm:max-w-[240px]" title={c.objeto}>
                    {c.empresa}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">({c.numero})</span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-slate-200 font-bold">{fmtBRL(c.valorTotal)}</span>
                  <span className="text-slate-500 text-[10px]">({c.representatividadePct.toFixed(1)}%)</span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${critColor}`}
                  style={{ width: `${Math.max(5, pctMax)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
