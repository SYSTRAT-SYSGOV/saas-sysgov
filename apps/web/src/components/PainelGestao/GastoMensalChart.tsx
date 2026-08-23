// GastoMensalChart.tsx
import React from "react";
import { GastoMensal } from "../../types/painel";
import { DataSourceBadge } from "../DataSourceBadge";
import { TrendingUp, TrendingDown } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);

const MES_NOMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface GastoMensalChartProps {
  gastosMensais: GastoMensal[];
  titulo?: string;
  empresa?: string;
}

export const GastoMensalChart: React.FC<GastoMensalChartProps> = ({
  gastosMensais, titulo = "Histórico de Gastos Mensais", empresa,
}) => {
  if (!gastosMensais.length) return null;

  const max = Math.max(...gastosMensais.map(g => g.valorLiquidado));
  const historicos = gastosMensais.filter(g => !g.isProjecao);
  const projecoes = gastosMensais.filter(g => g.isProjecao);

  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">{titulo}</span>
          </div>
          {empresa && <span className="text-[11px] text-slate-500 ml-6 truncate max-w-[300px] inline-block">{empresa}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="w-4 h-0.5 bg-emerald-500 rounded-full inline-block" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Realizado</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">Projeção</span>
          </div>
          <DataSourceBadge
            dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }}
            size="xs"
          />
        </div>
      </div>

      {/* Gráfico de barras simples */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 min-w-max pb-4" style={{ height: "120px" }}>
          {gastosMensais.map((g, i) => {
            const altura = max > 0 ? (g.valorLiquidado / max) * 100 : 0;
            const label = `${MES_NOMES[(g.mes - 1) % 12]}/${String(g.ano).slice(2)}`;
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 group"
                style={{ minWidth: "28px" }}
              >
                <div
                  className="relative w-full flex items-end justify-center"
                  style={{ height: "100px" }}
                >
                  <div
                    title={`${label}: ${fmtBRL(g.valorLiquidado)}`}
                    className={`w-5 rounded-t-sm transition-all duration-300 cursor-help ${
                      g.isProjecao ? "bg-amber-500/40 border border-dashed border-amber-400/60" : "bg-emerald-500/70"
                    }`}
                    style={{ height: `${altura}%` }}
                  />
                </div>
                <span className={`text-[8px] font-mono rotate-45 origin-left ${g.isProjecao ? "text-amber-500" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
