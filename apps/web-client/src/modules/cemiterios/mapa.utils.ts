import { ESTADOS, type EstadoJazigo } from './api';

export type Caixa = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

/** Estilo Leaflet de cada camada; jazigos coloridos pelo estado (spec gis › cores). */
export function estiloFeicao(camada: 'parques' | 'setores' | 'jazigos', propriedades: Record<string, unknown>) {
  if (camada === 'parques') return { color: '#1351b4', weight: 3, fillOpacity: 0.03 };
  if (camada === 'setores') return { color: '#0c326f', weight: 2, dashArray: '6 4', fillOpacity: 0.05 };
  const cor = ESTADOS[propriedades.estado as EstadoJazigo]?.cor ?? '#6b7280';
  return { color: cor, weight: 1, fillColor: cor, fillOpacity: 0.65 };
}

/** Caixa [minLng, minLat, maxLng, maxLat] a partir dos limites do mapa. */
export function caixaDe(sul: number, oeste: number, norte: number, leste: number): Caixa {
  return [oeste, sul, leste, norte];
}

/** Limites Leaflet [[lat, lng], [lat, lng]] do envelope da busca, com folga mínima para pontos. */
export function limitesDoEnvelope([minLng, minLat, maxLng, maxLat]: Caixa, folga = 0.00008): [[number, number], [number, number]] {
  return [[minLat - folga, minLng - folga], [maxLat + folga, maxLng + folga]];
}

/** Só busca jazigos a partir de um zoom em que a quadra é legível (evita carregar o município inteiro). */
export const ZOOM_MINIMO_JAZIGOS = 17;
