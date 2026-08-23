import React from "react";
import { SemaforoFinanceiro as SemaforoType } from "../../types/painel";
import { DataSourceBadge } from "../DataSourceBadge";
import { TrendingDown, TrendingUp, DollarSign, Target, Activity, AlertTriangle } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

interface SemaforoFinanceiroProps {
  semaforo: SemaforoType;
  titulo?: string;
}

export const SemaforoFinanceiro: React.FC<SemaforoFinanceiroProps> = ({
  semaforo, titulo = "Semáforo Orçamentário",
}) => {
  const saldoOk = semaforo.saldo > 0;
  const ritmoOk = semaforo.ritmoExecucao <= 1.15;

  const cards = [
    {
      label: "Orçamento Total",
      value: semaforo.orcamentoTotal,
      pct: 100,
      color: "text-sky-300",
      bar: "bg-sky-500/30",
      fill: "bg-sky-500",
      icon: Target,
    },
    {
      label: "Empenhado",
      value: semaforo.orcamentoEmpenhado,
      pct: semaforo.pctEmpenhado,
      color: "text-amber-300",
      bar: "bg-amber-950/50",
      fill: "bg-amber-500",
      icon: Activity,
    },
    {
      label: "Liquidado",
      value: semaforo.orcamentoLiquidado,
      pct: semaforo.pctLiquidado,
      color: "text-emerald-300",
      bar: "bg-emerald-950/50",
      fill: "bg-emerald-500",
      icon: DollarSign,
    },
    {
      label: "Saldo Disponível",
      value: semaforo.saldo,
      pct: semaforo.pctSaldo,
      color: saldoOk ? "text-emerald-300" : "text-rose-300",
      bar: saldoOk ? "bg-emerald-950/50" : "bg-rose-950/50",
      fill: saldoOk ? "bg-emerald-500" : "bg-rose-500",
      icon: saldoOk ? TrendingUp : TrendingDown,
    },
  ];

  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="panel-title text-sm font-bold text-slate-900 dark:text-slate-100">{titulo}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!ritmoOk && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/40 font-bold">
              <AlertTriangle className="w-3 h-3" />
              RITMO ACELERADO {fmtPct(semaforo.ritmoExecucao * 100)}
            </span>
          )}
          {semaforo.projecaoEstouro && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/40 font-bold">
              <AlertTriangle className="w-3 h-3" />
              PROJEÇÃO DE ESTOURO
            </span>
          )}
          <DataSourceBadge
            dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }}
            size="xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-800 rounded-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="kpi-label text-slate-500 dark:text-slate-400">{card.label}</span>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <div className={`font-mono font-extrabold text-lg sm:text-xl tracking-tight ${card.color}`}>
                {fmtBRL(card.value)}
              </div>
              <div className={`w-full h-1.5 rounded-full ${card.bar}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${card.fill}`}
                  style={{ width: `${Math.min(100, card.pct)}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-500">{fmtPct(card.pct)} do total</div>
            </div>
          );
        })}
      </div>

      {semaforo.projecaoDeficit && semaforo.projecaoDeficit > 0 && (
        <div className="bg-rose-950/40 border border-rose-700/40 rounded-sm px-3 py-2 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs text-rose-300">
            <strong>Déficit projetado para dezembro:</strong>{" "}
            <span className="font-mono">{fmtBRL(semaforo.projecaoDeficit)}</span>
          </span>
        </div>
      )}
    </div>
  );
};
