import { describe, expect, it } from 'vitest';
import { caixaDe, estiloFeicao, limitesDoEnvelope } from './mapa.utils';

describe('caixaDe', () => {
  it('converte limites do Leaflet (sul/oeste/norte/leste) para bbox [minLng,minLat,maxLng,maxLat]', () => {
    expect(caixaDe(-25.44, -49.28, -25.42, -49.26)).toEqual([-49.28, -25.44, -49.26, -25.42]);
  });
});

describe('limitesDoEnvelope', () => {
  it('converte bbox em limites Leaflet [[lat,lng],[lat,lng]] com folga', () => {
    const [[latMin, lngMin], [latMax, lngMax]] = limitesDoEnvelope([-49.28, -25.44, -49.26, -25.42], 0.001);
    expect(latMin).toBeCloseTo(-25.441);
    expect(lngMin).toBeCloseTo(-49.281);
    expect(latMax).toBeCloseTo(-25.419);
    expect(lngMax).toBeCloseTo(-49.259);
  });
});

describe('estiloFeicao', () => {
  it('usa a cor do estado para jazigos e cores fixas para parques/setores', () => {
    expect(estiloFeicao('parques', {})).toMatchObject({ color: '#1351b4' });
    expect(estiloFeicao('setores', {})).toMatchObject({ color: '#0c326f' });
    expect(estiloFeicao('jazigos', { estado: 'disponivel' })).toMatchObject({ color: '#16a34a', fillColor: '#16a34a' });
  });

  it('usa cor neutra para estado desconhecido', () => {
    expect(estiloFeicao('jazigos', { estado: 'inexistente' })).toMatchObject({ color: '#6b7280' });
  });
});
