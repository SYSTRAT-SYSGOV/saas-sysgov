import React from 'react';
import { Badge } from '@sysgov/ui';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface LdbComplianceBadgeProps {
  diasApurados: number;
  horasApuradas: number;
  compacto?: boolean;
}

export const LdbComplianceBadge: React.FC<LdbComplianceBadgeProps> = ({
  diasApurados,
  horasApuradas,
  compacto = false,
}) => {
  const metaDias = 200;
  const metaHoras = 800;

  const atingeDias = diasApurados >= metaDias;
  const atingeHoras = horasApuradas >= metaHoras;
  const plenamenteConforme = atingeDias && atingeHoras;
  const parcialmenteConforme = (atingeDias && !atingeHoras) || (!atingeDias && atingeHoras);

  if (compacto) {
    if (plenamenteConforme) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-xs gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          LDB OK ({diasApurados}d / {horasApuradas}h)
        </Badge>
      );
    }
    if (parcialmenteConforme) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-xs gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          LDB Alerta ({diasApurados}d / {horasApuradas}h)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-mono text-xs gap-1">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        LDB Não Conforme ({diasApurados}d / {horasApuradas}h)
      </Badge>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border flex items-start gap-3 ${
        plenamenteConforme
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
          : parcialmenteConforme
          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
          : 'bg-rose-50/60 border-rose-200 text-rose-900'
      }`}
    >
      <div className="mt-0.5">
        {plenamenteConforme ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : parcialmenteConforme ? (
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-600" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs uppercase tracking-wider">
            Conformidade LDB (Lei 9.394/1996, art. 24)
          </span>
          <span className="text-xs font-mono font-bold tabular-nums">
            {plenamenteConforme ? '100% REGULAR' : 'PENDENTE DE DIAS/HORAS'}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-4 text-xs font-mono tabular-nums">
          <div>
            <span className="text-gray-600 block text-[11px]">Dias Letivos:</span>
            <strong className={atingeDias ? 'text-emerald-700' : 'text-rose-700'}>
              {diasApurados} / {metaDias} dias
            </strong>
          </div>
          <div>
            <span className="text-gray-600 block text-[11px]">Carga Horária Anual:</span>
            <strong className={atingeHoras ? 'text-emerald-700' : 'text-rose-700'}>
              {horasApuradas} / {metaHoras} horas
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
