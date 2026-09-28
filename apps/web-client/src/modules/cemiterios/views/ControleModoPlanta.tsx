import React from 'react';
import { Map as MapIcon, Trees } from 'lucide-react';
import { Card } from '@/components/ui';
import type { ModoPlanta } from '../mapa.utils';

interface ControleModoPlantaProps {
  modo: ModoPlanta;
  onMudar: (modo: ModoPlanta) => void;
}

/** Alterna entre o mapa técnico e a planta humanizada (spec: mapa-gis › modo de apresentação). */
export const ControleModoPlanta: React.FC<ControleModoPlantaProps> = ({ modo, onMudar }) => (
  <Card className="p-1" role="group" aria-label="Modo de apresentação do mapa">
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onMudar('tecnico')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
          modo === 'tecnico' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <MapIcon className="h-3.5 w-3.5" /> Técnico
      </button>
      <button
        type="button"
        onClick={() => onMudar('humanizado')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
          modo === 'humanizado' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Trees className="h-3.5 w-3.5" /> Planta Humanizada
      </button>
    </div>
  </Card>
);
