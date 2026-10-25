import React from 'react';
import { Badge } from '@sysgov/ui';
import { CheckCircle2, AlertOctagon } from 'lucide-react';

interface PisoDocenteMeterProps {
  horasInteracao: number;
  horasAtividade: number;
  jornadaSemanal: number;
}

export const PisoDocenteMeter: React.FC<PisoDocenteMeterProps> = ({
  horasInteracao,
  horasAtividade,
  jornadaSemanal,
}) => {
  const percentualAtividade = jornadaSemanal > 0 ? (horasAtividade / jornadaSemanal) * 100 : 0;
  const minimoLeiPiso = 33.33; // 1/3 da jornada
  const emConformidade = percentualAtividade >= minimoLeiPiso;

  return (
    <div className="bg-white p-4 rounded-lg border border-gov-border shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gov-text-primary">
          Hora-Atividade (Lei do Piso 11.738/2008)
        </span>
        <Badge
          variant="outline"
          className={`font-mono text-xs gap-1 ${
            emConformidade
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {emConformidade ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          )}
          {emConformidade ? 'Conforme (≥ 33,3%)' : 'Irregular (< 33,3%)'}
        </Badge>
      </div>

      {/* Barra de Progresso Visual */}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex mb-2">
        <div
          className="bg-blue-600 h-3"
          style={{ width: `${Math.min(100 - percentualAtividade, 100)}%` }}
          title={`Interação em Sala: ${horasInteracao}h`}
        />
        <div
          className={`h-3 ${emConformidade ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(percentualAtividade, 100)}%` }}
          title={`Hora-Atividade: ${horasAtividade}h`}
        />
      </div>

      {/* Detalhamento Quantitativo em JetBrains Mono */}
      <div className="flex items-center justify-between text-xs text-gov-text-secondary font-mono tabular-nums">
        <div>
          <span>Em Sala: </span>
          <strong className="text-gov-text-primary">{horasInteracao}h</strong>
        </div>
        <div>
          <span>Atividade / Planejamento: </span>
          <strong className={emConformidade ? 'text-emerald-700' : 'text-rose-700'}>
            {horasAtividade}h ({percentualAtividade.toFixed(1)}%)
          </strong>
        </div>
        <div>
          <span>Jornada Total: </span>
          <strong className="text-gov-text-primary">{jornadaSemanal}h/sem</strong>
        </div>
      </div>
    </div>
  );
};
