import React, { useState } from "react";
import { ContratoGestao } from "../../types/painel";
import { CriticidadeBadge } from "./CriticidadeBadge";
import { DataSourceBadge } from "../DataSourceBadge";
import {
  ChevronDown, ChevronUp, Users, TrendingUp, AlertTriangle, Eye,
  DollarSign, BarChart2,
} from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

interface ListaContratosProps {
  contratos: ContratoGestao[];
  titulo?: string;
}

export const ListaContratos: React.FC<ListaContratosProps> = ({
  contratos, titulo = "Contratos",
}) => {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [ordenar, setOrdenar] = useState<"valor" | "indice" | "criticidade">("indice");

  const sorted = [...contratos].sort((a, b) => {
    if (ordenar === "valor")      return b.valorTotal - a.valorTotal;
    if (ordenar === "indice")     return b.indiceCorte.total - a.indiceCorte.total;
    if (ordenar === "criticidade") {
      const peso = { ESSENCIAL: 0, IMPORTANTE: 1, DIFERIVEL: 2 };
      return (peso[a.criticidade] ?? 0) - (peso[b.criticidade] ?? 0);
    }
    return 0;
  });

  const indiceColor = (idx: number) => {
    if (idx > 70) return "text-rose-300";
    if (idx > 40) return "text-amber-300";
    return "text-emerald-300";
  };

  return (
    <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-900/60 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{titulo}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 text-slate-700 dark:text-slate-300">
            {contratos.length} contratos
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 mr-1 uppercase font-medium">Ordenar:</span>
          {(["indice", "valor", "criticidade"] as const).map((op) => (
            <button
              key={op}
              onClick={() => setOrdenar(op)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-sm border cursor-pointer transition ${
                ordenar === op
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-bold"
                  : "bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-navy-700 hover:border-slate-400"
              }`}
            >
              {op === "indice" ? "Índice de Corte" : op === "valor" ? "Maior Valor" : "Criticidade"}
            </button>
          ))}
          <DataSourceBadge
            dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }}
            size="xs"
          />
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-navy-800/60">
        {sorted.map((c) => (
          <div key={c.id} className="hover:bg-slate-800/30 transition">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandido(expandido === c.id ? null : c.id)}
            >
              {/* Índice de corte */}
              <div className="shrink-0 text-center w-10">
                <div className={`font-mono font-bold text-base ${indiceColor(c.indiceCorte.total)}`}>
                  {c.indiceCorte.total.toFixed(0)}
                </div>
                <div className="text-[9px] text-slate-500">índice</div>
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-slate-300 truncate">{c.empresa}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{c.numero}</span>
                  <CriticidadeBadge criticidade={c.criticidade} fonte={c.criticidadeFonte as any} size="sm" />
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.objeto}</p>
                {c.impactoSocial && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                    <span className="text-[10px] text-sky-400 truncate">{c.impactoSocial}</span>
                  </div>
                )}
              </div>

              {/* Valores */}
              <div className="shrink-0 text-right hidden sm:block">
                <div className="font-mono text-xs font-bold text-slate-200">{fmtBRL(c.valorTotal)}</div>
                <div className="font-mono text-[10px] text-emerald-400">{fmtPct(c.pctLiquidado)} liq.</div>
                <div className="font-mono text-[10px] text-amber-400">{fmtBRL(c.valorDisponivel)} disp.</div>
              </div>

              {/* Progresso */}
              <div className="w-24 shrink-0 hidden md:block">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-0.5">
                  <span>Liquidado</span>
                  <span>{fmtPct(c.pctLiquidado)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, c.pctLiquidado)}%` }}
                  />
                </div>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${expandido === c.id ? "rotate-180" : ""}`}
              />
            </div>

            {/* Painel expandido */}
            {expandido === c.id && (
              <div className="px-4 pb-4 pt-2 bg-slate-950/30 border-t border-slate-800/40 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-slate-800/50 rounded-sm p-2">
                    <div className="text-slate-500 text-[10px] mb-0.5">Valor Total</div>
                    <div className="text-slate-200 font-bold">{fmtBRL(c.valorTotal)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-sm p-2">
                    <div className="text-slate-500 text-[10px] mb-0.5">Liquidado</div>
                    <div className="text-emerald-300 font-bold">{fmtBRL(c.valorLiquidado)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-sm p-2">
                    <div className="text-slate-500 text-[10px] mb-0.5">Disponível</div>
                    <div className="text-amber-300 font-bold">{fmtBRL(c.valorDisponivel)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-sm p-2">
                    <div className="text-slate-500 text-[10px] mb-0.5">Representa</div>
                    <div className="text-sky-300 font-bold">{fmtPct(c.representatividadePct)}</div>
                  </div>
                </div>

                {c.projecao2026 && (
                  <div className={`flex items-center gap-2 rounded-sm px-3 py-2 border text-xs ${
                    c.projecao2026.alertaCrescimento
                      ? "bg-amber-950/40 border-amber-700/40 text-amber-300"
                      : "bg-slate-800/40 border-slate-700/40 text-slate-400"
                  }`}>
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>Projeção 2026:</strong>{" "}
                      <span className="font-mono">{fmtBRL(c.projecao2026.valorProjetado)}</span>
                      {" "}• crescimento{" "}
                      <span className="font-mono">{fmtPct(c.projecao2026.crescimentoAnualPct)}</span> a.a.
                      {" "}• método: {c.projecao2026.metodoProjecao === "MEDIA_MOVEL_SAZONAL" ? "Média Móvel Sazonal" : "Extrapolação Linear"}
                      {c.projecao2026.alertaCrescimento && " ⚠ CRESCIMENTO ACIMA DE 15%"}
                    </span>
                  </div>
                )}

                <div className="bg-slate-800/30 rounded-sm px-3 py-2 text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300 text-xs mb-1">Decomposição do Índice de Corte</div>
                  <div className="flex flex-wrap gap-3">
                    <span>Criticidade: <span className={indiceColor(Math.abs(c.indiceCorte.pesoCriticidade))}>{c.indiceCorte.pesoCriticidade > 0 ? "+" : ""}{c.indiceCorte.pesoCriticidade}</span></span>
                    <span>Impacto: {c.indiceCorte.pesoImpacto > 0 ? "+" : ""}{c.indiceCorte.pesoImpacto}</span>
                    <span>Disponível: +{c.indiceCorte.pctDisponivel.toFixed(1)}</span>
                    <span>Trajetória: +{c.indiceCorte.fatorTrajetoria}</span>
                    <span className="font-bold text-slate-200">Total: {c.indiceCorte.total.toFixed(0)}</span>
                  </div>
                  <div className={`text-[10px] mt-1 ${indiceColor(c.indiceCorte.total)}`}>
                    {c.indiceCorte.classificacao === "SUPRESSAO_PRIORITARIA" && "⚠ SUPRESSÃO PRIORITÁRIA (>70)"}
                    {c.indiceCorte.classificacao === "RENEGOCIACAO" && "✱ RENEGOCIAÇÃO RECOMENDADA (40–70)"}
                    {c.indiceCorte.classificacao === "PROTEGER" && "✓ PROTEGER (<40)"}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
