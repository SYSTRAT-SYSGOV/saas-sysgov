import React from "react";
import { CriticidadeType } from "../../types/painel";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CriticidadeBadgeProps {
  criticidade: CriticidadeType;
  fonte?: "AUTOMATICA" | "MANUAL";
  autor?: string;
  size?: "sm" | "md";
}

export const CriticidadeBadge: React.FC<CriticidadeBadgeProps> = ({
  criticidade, fonte = "AUTOMATICA", autor, size = "sm",
}) => {
  const config = {
    ESSENCIAL:  { label: "ESSENCIAL",  color: "bg-rose-950/70 text-rose-300 border-rose-700/50",  icon: ShieldAlert  },
    IMPORTANTE: { label: "IMPORTANTE", color: "bg-amber-950/70 text-amber-300 border-amber-700/50", icon: AlertTriangle },
    DIFERIVEL:  { label: "DIFERÍVEL",  color: "bg-emerald-950/70 text-emerald-300 border-emerald-700/50", icon: CheckCircle2 },
  }[criticidade];

  const Icon = config.icon;
  const px   = size === "md" ? "px-2.5 py-1" : "px-1.5 py-0.5";
  const txt  = size === "md" ? "text-xs" : "text-[10px]";
  const iconSize = size === "md" ? "w-3.5 h-3.5" : "w-3 h-3";

  const tooltip = fonte === "MANUAL"
    ? `Criticidade ajustada manualmente${autor ? ` por ${autor}` : ""}`
    : "Criticidade definida automaticamente pela categoria do contrato";

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-sm border font-mono font-bold ${px} ${txt} ${config.color} cursor-help`}
    >
      <Icon className={iconSize} />
      {config.label}
      {fonte === "MANUAL" && (
        <span className="ml-0.5 text-[9px] opacity-70" title={tooltip}>✎</span>
      )}
    </span>
  );
};
