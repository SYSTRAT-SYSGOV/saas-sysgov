import React, { useState } from "react";
import { SimuladorInput, SimuladorResult, ContratoRecomendado } from "../../types/painel";
import { DataSourceBadge } from "../DataSourceBadge";
import { Scissors, AlertTriangle, CheckCircle2, TrendingDown, Users, ChevronDown, ChevronUp } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

interface SimuladorProps {
  resultado: SimuladorResult | null;
  loading?: boolean;
  onSimular: (input: SimuladorInput) => void;
  orcamentoBase: number;
  exercicio?: number;
}

export const SimuladorContingenciamento: React.FC<SimuladorProps> = ({
  resultado, loading, onSimular, orcamentoBase, exercicio = 2026,
}) => {
  const [metaPct, setMetaPct] = useState(10);
  const [showDetalhes, setShowDetalhes] = useState(false);

  const metaValor = Math.round(orcamentoBase * metaPct / 100);

  const faixaColor = (pct: number) => {
    if (pct <= 10) return "text-emerald-300";
    if (pct <= 20) return "text-amber-300";
    return "text-rose-300";
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-sm p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-slate-200">Simulador de Contingenciamento</span>
        </div>
        <DataSourceBadge
          dataSource={{ origin: "OFICIAL", source: "Base local (PNCP/TCE/uploads)", collectedAt: new Date().toISOString() }}
          size="xs"
        />
      </div>

      {/* Slider de meta */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Meta de redução orçamentária</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold text-lg ${faixaColor(metaPct)}`}>{metaPct}%</span>
            <span className="font-mono text-xs text-slate-400">= {fmtBRL(metaValor)}</span>
          </div>
        </div>

        <input
          type="range" min={5} max={40} step={1} value={metaPct}
          onChange={(e) => setMetaPct(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>5% (leve)</span>
          <span className="text-amber-400">25% (corte linear padrão TCE)</span>
          <span>40% (drástico)</span>
        </div>

        <button
          onClick={() => onSimular({ metaPct, exercicio })}
          disabled={loading}
          className="w-full mt-2 py-2 rounded-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition cursor-pointer"
        >
          {loading ? "Calculando..." : `Simular corte de ${metaPct}%`}
        </button>
      </div>

      {resultado && (
        <div className="space-y-3">
          {/* Resumo */}
          <div className={`rounded-sm border p-3 space-y-2 ${
            resultado.avisoCortaEssenciais
              ? "bg-rose-950/40 border-rose-700/40"
              : resultado.metaAtingida
              ? "bg-emerald-950/40 border-emerald-700/40"
              : "bg-amber-950/40 border-amber-700/40"
          }`}>
            <div className="flex items-center gap-2">
              {resultado.avisoCortaEssenciais
                ? <AlertTriangle className="w-4 h-4 text-rose-400" />
                : resultado.metaAtingida
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={`text-sm font-bold ${
                resultado.avisoCortaEssenciais ? "text-rose-300" : resultado.metaAtingida ? "text-emerald-300" : "text-amber-300"
              }`}>
                {resultado.avisoCortaEssenciais
                  ? "⚠ Meta exige corte em contratos ESSENCIAIS"
                  : resultado.metaAtingida
                  ? "✓ Meta atingível sem tocar em contratos ESSENCIAIS"
                  : "Meta parcialmente atingível com contratos DIFERÍVEIS"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center">
                <div className="font-mono font-bold text-emerald-300 text-sm">{fmtBRL(resultado.economiaOtimaTotalR)}</div>
                <div className="text-[10px] text-slate-400">economia ótima</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-amber-300 text-sm">{resultado.economiaOtimaTotalPct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-400">da meta {metaPct}%</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-sky-300 text-sm">{resultado.contratosRecomendados.length}</div>
                <div className="text-[10px] text-slate-400">contratos</div>
              </div>
            </div>
          </div>

          {/* Top contratos recomendados */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Contratos Recomendados para Supressão</span>
              <button
                onClick={() => setShowDetalhes(!showDetalhes)}
                className="text-[10px] text-emerald-400 flex items-center gap-1 cursor-pointer hover:text-emerald-300"
              >
                {showDetalhes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetalhes ? "Ocultar" : "Ver todos"}
              </button>
            </div>
            {resultado.contratosRecomendados.slice(0, showDetalhes ? undefined : 5).map((c) => (
              <div key={c.contratoId} className="bg-slate-800/40 border border-slate-700/30 rounded-sm p-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-300 truncate">{c.empresa}</span>
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">DIFERÍVEL</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{c.objeto}</p>
                  {c.impactoSocial && (
                    <div className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-sky-400" />
                      <span className="text-[9px] text-sky-400 truncate">{c.impactoSocial}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs font-bold text-emerald-300">{fmtBRL(c.economiaEstimada)}</div>
                  <div className="font-mono text-[10px] text-slate-500">índice {c.indiceCorte.toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Por secretaria */}
          {resultado.resultadoPorSecretaria.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300">Resultado por Secretaria</span>
              {resultado.resultadoPorSecretaria.map((sec) => (
                <div key={sec.secretariaId} className="flex items-center gap-3 bg-slate-800/30 rounded-sm px-3 py-2">
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-slate-300 truncate">{sec.secretariaNome}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                      <span className="text-slate-500">Linear: {fmtBRL(sec.corteLinear)}</span>
                      <span className="text-emerald-400">Ótimo: {fmtBRL(sec.economiaOtima)}</span>
                    </div>
                  </div>
                  <TrendingDown className={`w-4 h-4 shrink-0 ${
                    sec.impactoMunicipal === "ALTO" ? "text-rose-400" :
                    sec.impactoMunicipal === "MEDIO" ? "text-amber-400" : "text-emerald-400"
                  }`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
