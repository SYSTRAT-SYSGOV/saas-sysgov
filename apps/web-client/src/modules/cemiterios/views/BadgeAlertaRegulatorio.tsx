import React from 'react';
import { Badge } from '@sysgov/ui';
import { Clock, AlertTriangle, AlertCircle, FileWarning, Sparkles, UserX } from 'lucide-react';
import type { AlertaRegulatorio, TipoAlertaRegulatorio, SeveridadeAlerta } from '../regulamentacao.utils';
import { Mono } from './comum';

export interface BadgeAlertaRegulatorioProps {
  alerta: AlertaRegulatorio;
  compacto?: boolean;
}

export const BadgeAlertaRegulatorio: React.FC<BadgeAlertaRegulatorioProps> = ({
  alerta,
  compacto = false,
}) => {
  const getIcone = (tipo: TipoAlertaRegulatorio) => {
    switch (tipo) {
      case 'concessao_vencida':
        return <AlertTriangle className="h-3 w-3 shrink-0" />;
      case 'concessao_a_vencer':
        return <Clock className="h-3 w-3 shrink-0" />;
      case 'titular_falecido':
        return <UserX className="h-3 w-3 shrink-0" />;
      case 'exumacao_elegivel':
        return <Sparkles className="h-3 w-3 shrink-0" />;
      case 'risco_estrutural':
        return <AlertCircle className="h-3 w-3 shrink-0" />;
      case 'processo_abandono':
        return <FileWarning className="h-3 w-3 shrink-0" />;
    }
  };

  const getVariante = (severidade: SeveridadeAlerta) => {
    switch (severidade) {
      case 'critico':
        return 'destructive' as const;
      case 'atencao':
        return 'secondary' as const;
      case 'info':
        return 'outline' as const;
    }
  };

  const getClassesCores = (severidade: SeveridadeAlerta) => {
    switch (severidade) {
      case 'critico':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400';
      case 'atencao':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400';
      case 'info':
        return 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-400';
    }
  };

  return (
    <Badge
      variant={getVariante(alerta.severidade)}
      title={alerta.descricao}
      className={`text-[10px] uppercase font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 tracking-tight border ${getClassesCores(
        alerta.severidade
      )}`}
    >
      {getIcone(alerta.tipo)}
      <span>{alerta.rotulo}</span>
      {alerta.dias !== undefined && (
        <Mono className="font-mono tabular-nums font-bold ml-0.5">
          {alerta.tipo === 'concessao_a_vencer' ? `${alerta.dias}d` : `${alerta.dias}d atr.`}
        </Mono>
      )}
    </Badge>
  );
};

export const GrupoAlertasRegulorios: React.FC<{
  alertas: AlertaRegulatorio[];
  limite?: number;
}> = ({ alertas, limite = 2 }) => {
  if (!alertas || alertas.length === 0) return null;

  const visiveis = alertas.slice(0, limite);
  const excedente = alertas.length - visiveis.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visiveis.map((alerta, idx) => (
        <BadgeAlertaRegulatorio key={`${alerta.tipo}-${idx}`} alerta={alerta} />
      ))}
      {excedente > 0 && (
        <Badge
          variant="outline"
          title={alertas
            .slice(limite)
            .map((a) => a.rotulo)
            .join(', ')}
          className="text-[9px] px-1 py-0 font-mono tabular-nums text-muted-foreground"
        >
          +{excedente}
        </Badge>
      )}
    </div>
  );
};
