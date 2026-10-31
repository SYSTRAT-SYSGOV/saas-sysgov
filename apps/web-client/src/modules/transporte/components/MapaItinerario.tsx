import React, { Suspense } from 'react';
import { Skeleton } from '@sysgov/ui';
import type { ItemItinerario } from '../api';
import type { PontoMapa } from './MapaLeaflet';

const MapaItinerarioLeaflet = React.lazy(() => import('./MapaLeaflet').then((m) => ({ default: m.MapaItinerarioLeaflet })));

/** Pontos georreferenciados na ordem do itinerário; a ordem exibida é a do itinerário, mesmo com paradas sem coordenada. */
export function pontosDoMapa(itens: ItemItinerario[]): PontoMapa[] {
  return itens
    .filter((i) => i.parada.latitude !== null && i.parada.longitude !== null)
    .map((i) => ({ ordem: i.ordem, nome: i.parada.nome, latitude: i.parada.latitude as number, longitude: i.parada.longitude as number }));
}

/** Mapa do itinerário (D15): marcadores numerados e linha; paradas sem coordenada ficam numa lista, com aviso. */
export const MapaItinerario: React.FC<{ itens: ItemItinerario[]; escola?: string | null }> = ({ itens, escola }) => {
  const pontos = pontosDoMapa(itens);
  const semCoordenada = itens.filter((i) => !i.parada.tem_coordenadas);

  return (
    <div className="space-y-2">
      {escola && <p className="text-sm text-muted-foreground">Destino: <strong className="text-foreground">{escola}</strong> (a escola não tem coordenadas no cadastro escolar).</p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <Suspense fallback={<Skeleton className="w-full" style={{ height: 360 }} />}>
          <MapaItinerarioLeaflet pontos={pontos} />
        </Suspense>
        <aside aria-label="Paradas sem coordenada" className="space-y-1 text-sm">
          <h4 className="font-semibold">Sem coordenada</h4>
          {semCoordenada.length === 0 && <p className="text-xs text-muted-foreground">Todas as paradas estão no mapa.</p>}
          <ul className="space-y-1">
            {semCoordenada.map((i) => (
              <li key={i.parada.id} className="rounded border border-dashed border-border px-2 py-1">
                <span className="font-mono tabular-nums">{i.ordem}.</span> {i.parada.nome}
                <span className="block text-xs text-amber-700 dark:text-amber-400">sem coordenada</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
};
