import { ESTADOS, type EstadoJazigo } from './api';

export type Caixa = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

/** Modo de apresentação do mapa: "tecnico" (padrão) ou "humanizado" (planta acolhedora). */
export type ModoPlanta = 'tecnico' | 'humanizado';

/** Estilo semântico de jazigo baseado no estado físico, seleção e regras sanitárias (exumação). */
export function estiloJazigoSemantico(
  propriedades: Record<string, unknown>,
  selecionadoId?: number | null,
  filtroStatus?: string | null,
  modo: ModoPlanta = 'tecnico'
) {
  const estado = propriedades.estado as EstadoJazigo;
  const aptoExumacao = Boolean(propriedades.apto_exumacao);
  const id = Number(propriedades.id);
  const isSelecionado = selecionadoId != null && id === selecionadoId;
  const humanizado = modo === 'humanizado';

  // Se houver filtro ativo e o item não corresponder, reduz opacidade
  if (filtroStatus) {
    if (filtroStatus === 'disponivel' && estado !== 'disponivel') {
      return { color: '#9ca3af', weight: 1, fillColor: '#9ca3af', fillOpacity: 0.15 };
    }
    if (filtroStatus === 'apto_exumacao' && !aptoExumacao) {
      return { color: '#9ca3af', weight: 1, fillColor: '#9ca3af', fillOpacity: 0.15 };
    }
    if (filtroStatus === 'capacidade_maxima' && estado !== 'capacidade_maxima') {
      return { color: '#9ca3af', weight: 1, fillColor: '#9ca3af', fillOpacity: 0.15 };
    }
    if (filtroStatus === 'ocupado' && estado !== 'ocupado' && estado !== 'concedido') {
      return { color: '#9ca3af', weight: 1, fillColor: '#9ca3af', fillOpacity: 0.15 };
    }
  }

  const corBase = ESTADOS[estado]?.cor ?? '#6b7280';

  if (isSelecionado) {
    return {
      color: '#ffffff',
      weight: 3,
      fillColor: corBase,
      fillOpacity: 0.9,
    };
  }

  if (aptoExumacao) {
    return {
      color: '#d97706',
      weight: 2.5,
      dashArray: '4 3',
      fillColor: corBase,
      fillOpacity: 0.75,
    };
  }

  // Humanizado: mesma cor semântica do estado, borda mais suave e preenchimento mais denso
  // (planta acolhedora), em vez do traço técnico fino (spec mapa-gis › modo de apresentação).
  return humanizado
    ? { color: '#ffffff', weight: 1, fillColor: corBase, fillOpacity: 0.85 }
    : { color: corBase, weight: 1, fillColor: corBase, fillOpacity: 0.65 };
}

/** Estilo Leaflet de cada camada; jazigos coloridos pelo estado (spec gis › cores). */
export function estiloFeicao(
  camada: 'parques' | 'setores' | 'jazigos',
  propriedades: Record<string, unknown>,
  selecionadoId?: number | null,
  filtroStatus?: string | null,
  modo: ModoPlanta = 'tecnico'
) {
  if (camada === 'parques') {
    return modo === 'humanizado'
      ? { color: '#7c9885', weight: 2, fillColor: '#d8ecd9', fillOpacity: 0.25 }
      : { color: '#1351b4', weight: 3, fillColor: undefined, fillOpacity: 0.03 };
  }
  if (camada === 'setores') {
    return modo === 'humanizado'
      ? { color: '#a8c3ad', weight: 1.5, dashArray: undefined, fillColor: '#eaf6ec', fillOpacity: 0.2 }
      : { color: '#0c326f', weight: 2, dashArray: '6 4', fillColor: undefined, fillOpacity: 0.05 };
  }
  return estiloJazigoSemantico(propriedades, selecionadoId, filtroStatus, modo);
}

/** Estilo Leaflet das vias/alamedas — traço técnico fino ou piso ilustrado no modo humanizado. */
export function estiloVia(modo: ModoPlanta = 'tecnico') {
  return modo === 'humanizado'
    ? { color: '#d8cdb8', weight: 6, opacity: 0.9, lineCap: 'round' as const }
    : { color: '#6b7280', weight: 2, dashArray: '3 3', opacity: 0.6 };
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

/** Calcula distância em metros entre dois pontos geográficos (Fórmula de Haversine). */
export function calcularDistanciaMetros([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/** Calcula a área aproximada em metros quadrados (m²) de um anel de coordenadas [lat, lng]. */
export function calcularAreaPoligonoM2(coordenadas: [number, number][]): number {
  if (coordenadas.length < 3) return 0;
  const R = 6371000;
  const rad = Math.PI / 180;
  let total = 0;
  const n = coordenadas.length;

  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = coordenadas[i];
    const [lat2, lon2] = coordenadas[(i + 1) % n];
    total += (lon2 * rad - lon1 * rad) * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  const area = Math.abs((total * R * R) / 2);
  return Math.round(area * 100) / 100;
}

/** Verifica se a distância atende ao recuo mínimo sanitário entre jazigos (default 0.60m). */
export function recuoMinimoValido(distanciaMetros: number, minimo = 0.6): boolean {
  return distanciaMetros >= minimo;
}

/** Metros por pixel de tile Web Mercator num zoom/latitude — base da barra de escala da planta exportada. */
export function metrosPorPixel(latitude: number, zoom: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Verificação de sobreposição de dois polígonos [lat,lng] por bounding box — feedback antecipado no
 * cliente ao desenhar/editar; a validação real (poligonal exata) continua sendo feita no backend
 * (`Geo::sobrepoe`) ao salvar.
 * ponytail: checagem por caixa envolvente (bounding box), não pela forma exata do polígono — pode alertar
 * um falso positivo em polígonos côncavos que só se aproximam; suficiente como alerta antecipado porque o
 * backend é a autoridade final.
 */
export function poligonosPodemSobrepor(a: [number, number][], b: [number, number][]): boolean {
  const caixa = (p: [number, number][]) => ({
    minLat: Math.min(...p.map((pt) => pt[0])), maxLat: Math.max(...p.map((pt) => pt[0])),
    minLng: Math.min(...p.map((pt) => pt[1])), maxLng: Math.max(...p.map((pt) => pt[1])),
  });
  const ca = caixa(a);
  const cb = caixa(b);
  return ca.minLat <= cb.maxLat && ca.maxLat >= cb.minLat && ca.minLng <= cb.maxLng && ca.maxLng >= cb.minLng;
}
