import React from "react";
import { RankingSecretaria, RankingPotencialCorte as RankingCorteType } from "../../types/painel";
import { DataSourceBadge } from "../DataSourceBadge";
import { Building2, Scissors } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);

interface RankingSecretariasProps { ranking: RankingSecretaria[]; }
export const RankingSecretariasChart: React.FC<RankingSecretariasProps> = ({ ranking }) => {
  const max = Math.max(...ranking.map(r => r.valorTotal), 1);
  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">Ranking de Secretarias</span>
        </div>
        <DataSourceBadge dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }} size="xs" />
      </div>
      <div className="space-y-2">
        {ranking.map((r, i) => (
          <div key={r.secretariaId}>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-slate-400 w-4 text-right">{i + 1}.</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[160px] sm:max-w-none">{r.secretariaNome.replace("Secretaria Municipal de ", "")}</span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-navy-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-navy-700">{r.numContratos} cont.</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">{fmtBRL(r.valorLiquidado)}</span>
                <span className="text-slate-400 text-[10px]">/ {fmtBRL(r.valorTotal)}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-navy-900 rounded-full">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                   style={{ width: `${(r.valorTotal / max) * 100}%` }} />
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5 text-right">{r.pct.toFixed(1)}% do total contratual</div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RankingPotencialCorteProps { ranking: RankingCorteType[]; }
export const RankingPotencialCorte: React.FC<RankingPotencialCorteProps> = ({ ranking }) => {
  const max = Math.max(...ranking.map(r => r.volumeDiferivel + r.volumeImportante), 1);
  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-500" />
          <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">Potencial de Corte por Secretaria</span>
        </div>
        <DataSourceBadge dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }} size="xs" />
      </div>
      <div className="space-y-2">
        {ranking.map((r, i) => {
          const total = r.volumeDiferivel + r.volumeImportante;
          const pctDif = total > 0 ? (r.volumeDiferivel / total) * 100 : 0;
          return (
            <div key={r.secretariaId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-500 w-4 text-right">{i + 1}.</span>
                  <span className="text-slate-300 truncate max-w-[140px]">{r.secretariaNome.replace("Secretaria Municipal de ", "")}</span>
                  <span className="font-mono text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-700/30 px-1 rounded">{r.numContratosDiferiveis} dif.</span>
                </div>
                <div className="font-mono text-[11px] shrink-0">
                  <span className="text-emerald-300">{fmtBRL(r.volumeDiferivel)}</span>
                  <span className="text-slate-500 text-[10px]"> / {fmtBRL(total)}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full flex overflow-hidden">
                <div className="h-full bg-emerald-500/70" style={{ width: `${(r.volumeDiferivel / max) * 100}%` }} />
                <div className="h-full bg-amber-500/50" style={{ width: `${(r.volumeImportante / max) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                <span className="text-emerald-400">DIFERÍVEL: {fmtBRL(r.volumeDiferivel)}</span>
                <span className="text-amber-400">IMPORTANTE: {fmtBRL(r.volumeImportante)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
