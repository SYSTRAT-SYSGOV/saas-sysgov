import React from 'react';
import { Ruler, Trash2, Undo2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  calcularDistanciaMetros,
  calcularAreaPoligonoM2,
  recuoMinimoValido,
} from '../mapa.utils';

interface FerramentaMedicaoProps {
  ativa: boolean;
  pontos: [number, number][];
  onAlternar: () => void;
  onLimpar: () => void;
  onDesfazer: () => void;
}

export const FerramentaMedicao: React.FC<FerramentaMedicaoProps> = ({
  ativa,
  pontos,
  onAlternar,
  onLimpar,
  onDesfazer,
}) => {
  if (!ativa) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onAlternar}
        className="gap-1.5 text-xs shadow-sm bg-background/95 backdrop-blur-sm"
        title="Medir distâncias e áreas no mapa"
      >
        <Ruler className="h-3.5 w-3.5" />
        <span>Régua de Medição</span>
      </Button>
    );
  }

  // Cálculo de distâncias entre segmentos consecutivos
  let distanciaTotal = 0;
  let ultimoRecuoValido = true;
  let ultimoSegmento = 0;

  for (let i = 0; i < pontos.length - 1; i++) {
    const d = calcularDistanciaMetros(pontos[i], pontos[i + 1]);
    distanciaTotal += d;
    if (i === pontos.length - 2) {
      ultimoSegmento = d;
      ultimoRecuoValido = recuoMinimoValido(d);
    }
  }

  const areaM2 = pontos.length >= 3 ? calcularAreaPoligonoM2(pontos) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-background/95 p-3 shadow-md backdrop-blur-sm text-xs">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-primary">
          <Ruler className="h-4 w-4" />
          <span>Medição Topográfica Ativa</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onAlternar} className="h-6 px-1.5 text-[11px]">
          Fechar
        </Button>
      </div>

      <div className="space-y-1.5 py-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Distância Total:</span>
          <span className="font-mono text-sm font-bold text-foreground">
            {distanciaTotal.toFixed(2)} m
          </span>
        </div>

        {pontos.length >= 2 && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Último recuo medido:</span>
            <div className="flex items-center gap-1 font-mono">
              <span>{ultimoSegmento.toFixed(2)} m</span>
              {ultimoRecuoValido ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400" title="Atende ao recuo mínimo sanitário de 0,60 m">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400" title="Abaixo do recuo mínimo sanitário de 0,60 m">
                  <AlertCircle className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        )}

        {pontos.length >= 3 && (
          <div className="flex justify-between items-center border-t border-border/50 pt-1">
            <span className="text-muted-foreground">Área Fechada:</span>
            <span className="font-mono text-sm font-bold text-primary">
              {areaM2.toFixed(2)} m²
            </span>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground italic">
          {pontos.length === 0
            ? 'Clique no mapa para marcar o primeiro ponto.'
            : `${pontos.length} ponto(s) marcado(s). Clique para adicionar mais.`}
        </div>
      </div>

      <div className="flex items-center gap-1 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onDesfazer}
          disabled={pontos.length === 0}
          className="h-7 flex-1 gap-1 text-[11px]"
        >
          <Undo2 className="h-3 w-3" />
          Desfazer
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLimpar}
          disabled={pontos.length === 0}
          className="h-7 flex-1 gap-1 text-[11px] text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Limpar
        </Button>
      </div>
    </div>
  );
};
