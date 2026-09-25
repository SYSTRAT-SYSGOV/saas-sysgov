import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@sysgov/ui';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';
import type { Jazigo } from '../api';
import { Mono } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';

export interface LocalizacaoGeorreferenciadaProps {
  jazigo: Pick<Jazigo, 'id' | 'codigo' | 'lat' | 'lng' | 'comprimento_m' | 'largura_m'>;
  onFecharDrawer?: () => void;
}

export const LocalizacaoGeorreferenciada: React.FC<LocalizacaoGeorreferenciadaProps> = ({
  jazigo,
  onFecharDrawer,
}) => {
  const { navegarParaMapa } = useCemiteriosNavigation();
  const georreferenciado = jazigo.lat !== null && jazigo.lng !== null && jazigo.lat !== undefined && jazigo.lng !== undefined;

  const handleVerNoMapa = () => {
    navegarParaMapa({
      jazigoId: jazigo.id,
      codigo: jazigo.codigo,
      lat: jazigo.lat,
      lng: jazigo.lng,
    });
    onFecharDrawer?.();
  };

  return (
    <Card className="gap-0 py-0 overflow-hidden shadow-2xs border-border">
      <CardHeader className="p-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-primary" /> Georreferenciamento & Mapa GIS
        </CardTitle>
        {georreferenciado ? (
          <Badge
            variant="outline"
            className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"
          >
            <MapPin className="h-3 w-3" /> Georreferenciado
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" /> Mapeamento Pendente
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3 space-y-2.5 text-xs">
        {georreferenciado ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-muted/40 border border-border/50">
                <span className="text-[10px] text-muted-foreground block">Latitude (Y):</span>
                <Mono className="font-semibold text-foreground text-xs">
                  {jazigo.lat?.toFixed(6)}
                </Mono>
              </div>
              <div className="p-2 rounded bg-muted/40 border border-border/50">
                <span className="text-[10px] text-muted-foreground block">Longitude (X):</span>
                <Mono className="font-semibold text-foreground text-xs">
                  {jazigo.lng?.toFixed(6)}
                </Mono>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Polígono cartográfico associado no SIGCM.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            Esta unidade ainda não possui coordenadas georreferenciadas ou polígono vetorial associado na base cartográfica.
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10 font-medium"
          onClick={handleVerNoMapa}
        >
          <Navigation className="h-3.5 w-3.5" /> Ver no Mapa GIS
        </Button>
      </CardContent>
    </Card>
  );
};
