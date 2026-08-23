import React from "react";
import { AlertaDecisao } from "../../types/painel";
import { AlertTriangle, XCircle, Info, TrendingUp, TrendingDown, Zap } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

interface AlertasDecisaoProps {
  alertas: AlertaDecisao[];
}

export const AlertasDecisao: React.FC<AlertasDecisaoProps> = ({ alertas }) => {
  if (!alertas.length) return null;

  const config = {
    CRITICO: { bg: "bg-rose-950/50 border-rose-700/50", text: "text-rose-300", icon: XCircle, iconColor: "text-rose-400", badge: "bg-rose-900/60 text-rose-300 border-rose-700/40" },
    ATENCAO: { bg: "bg-amber-950/50 border-amber-700/50", text: "text-amber-300", icon: AlertTriangle, iconColor: "text-amber-400", badge: "bg-amber-900/60 text-amber-300 border-amber-700/40" },
    INFO:    { bg: "bg-sky-950/50 border-sky-700/50",     text: "text-sky-300",   icon: Info,         iconColor: "text-sky-400",   badge: "bg-sky-900/60 text-sky-300 border-sky-700/40" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-slate-200">Alertas de Decisão</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40">
          {alertas.filter(a => a.tipo === "CRITICO").length} críticos
        </span>
      </div>

      {alertas.map((alerta) => {
        const c = config[alerta.tipo];
        const Icon = c.icon;
        return (
          <div key={alerta.id} className={`rounded-sm border ${c.bg} p-3`}>
            <div className="flex items-start gap-2.5">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${c.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${c.text}`}>{alerta.titulo}</span>
                  {alerta.impactoFinanceiro && (
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${c.badge}`}>
                      {fmtBRL(alerta.impactoFinanceiro)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{alerta.descricao}</p>
                {alerta.secretaria && (
                  <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">{alerta.secretaria}</span>
                )}
                <div className="mt-1.5 text-xs text-slate-300 bg-slate-900/50 rounded-sm px-2 py-1 border border-slate-800/50">
                  <span className="text-slate-500 mr-1">→</span>{alerta.acaoRecomendada}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
