import React from 'react';
import { Filter, Check, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';

export type FiltroRapidoStatus = 'disponivel' | 'ocupado' | 'capacidade_maxima' | 'apto_exumacao' | null;

interface FiltrosRapidosMapaProps {
  filtroAtivo: FiltroRapidoStatus;
  onFiltroChange: (filtro: FiltroRapidoStatus) => void;
}

export const FiltrosRapidosMapa: React.FC<FiltrosRapidosMapaProps> = ({
  filtroAtivo,
  onFiltroChange,
}) => {
  const filtros: { id: FiltroRapidoStatus; rotulo: string; cor: string; icone?: React.ReactNode }[] = [
    { id: null, rotulo: 'Todos', cor: 'border-border' },
    { id: 'disponivel', rotulo: 'Disponíveis', cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'ocupado', rotulo: 'Ocupados', cor: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    { id: 'capacidade_maxima', rotulo: 'Cheios', cor: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30', icone: <AlertCircle className="h-3 w-3 mr-1" /> },
    { id: 'apto_exumacao', rotulo: 'Aptos à Exumação', cor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icone: <Clock className="h-3 w-3 mr-1" /> },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span>Filtro Rápido de Túmulos</span>
        </div>
        {filtroAtivo !== null && (
          <button
            type="button"
            onClick={() => onFiltroChange(null)}
            className="text-[11px] text-primary hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {filtros.map((f) => {
          const selecionado = filtroAtivo === f.id;
          return (
            <button
              key={String(f.id)}
              type="button"
              onClick={() => onFiltroChange(f.id)}
              className={`flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
                selecionado
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : `hover:bg-muted/80 ${f.cor}`
              }`}
            >
              {f.icone}
              <span>{f.rotulo}</span>
              {selecionado && <Check className="ml-1 h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
