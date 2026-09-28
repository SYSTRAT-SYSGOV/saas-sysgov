import { describe, expect, it } from 'vitest';
import {
  caixaDe,
  calcularAreaPoligonoM2,
  calcularDistanciaMetros,
  estiloFeicao,
  estiloVia,
  limitesDoEnvelope,
  metrosPorPixel,
  poligonosPodemSobrepor,
  recuoMinimoValido,
} from './mapa.utils';

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

describe('estiloFeicao e estiloJazigoSemantico', () => {
  it('usa a cor do estado para jazigos e cores fixas para parques/setores', () => {
    expect(estiloFeicao('parques', {})).toMatchObject({ color: '#1351b4' });
    expect(estiloFeicao('setores', {})).toMatchObject({ color: '#0c326f' });
    expect(estiloFeicao('jazigos', { estado: 'disponivel' })).toMatchObject({ color: '#16a34a', fillColor: '#16a34a' });
  });

  it('destaca jazigo selecionado com borda branca e espessura maior', () => {
    const estilo = estiloFeicao('jazigos', { id: 42, estado: 'ocupado' }, 42);
    expect(estilo).toMatchObject({ color: '#ffffff', weight: 3, fillOpacity: 0.9 });
  });

  it('destaca túmulos aptos à exumação com borda tracejada âmbar', () => {
    const estilo = estiloFeicao('jazigos', { id: 10, estado: 'ocupado', apto_exumacao: true });
    expect(estilo).toMatchObject({ color: '#d97706', weight: 2.5, dashArray: '4 3' });
  });

  it('atenua opacidade quando há filtro ativo não correspondente', () => {
    const estilo = estiloFeicao('jazigos', { id: 10, estado: 'ocupado' }, null, 'disponivel');
    expect(estilo).toMatchObject({ color: '#9ca3af', fillOpacity: 0.15 });
  });

  it('usa cor neutra para estado desconhecido', () => {
    expect(estiloFeicao('jazigos', { estado: 'inexistente' })).toMatchObject({ color: '#6b7280' });
  });
});

describe('modo humanizado (planta acolhedora)', () => {
  it('mantém a mesma cor semântica do estado, mas com preenchimento mais denso e borda branca suave', () => {
    const tecnico = estiloFeicao('jazigos', { estado: 'disponivel' }, null, null, 'tecnico');
    const humanizado = estiloFeicao('jazigos', { estado: 'disponivel' }, null, null, 'humanizado');
    expect(tecnico.fillColor).toBe(humanizado.fillColor);
    expect(humanizado).toMatchObject({ color: '#ffffff', fillOpacity: 0.85 });
    expect(humanizado.fillOpacity).toBeGreaterThan(tecnico.fillOpacity as number);
  });

  it('não altera o resultado do modo técnico (comportamento por default)', () => {
    expect(estiloFeicao('jazigos', { estado: 'ocupado' })).toEqual(estiloFeicao('jazigos', { estado: 'ocupado' }, null, null, 'tecnico'));
  });

  it('reestiliza parques e setores com paleta pastel no modo humanizado', () => {
    expect(estiloFeicao('parques', {}, null, null, 'humanizado')).toMatchObject({ fillColor: '#d8ecd9' });
    expect(estiloFeicao('setores', {}, null, null, 'humanizado')).toMatchObject({ fillColor: '#eaf6ec' });
  });
});

describe('estiloVia', () => {
  it('usa traço fino tracejado no modo técnico e piso largo no humanizado', () => {
    expect(estiloVia('tecnico')).toMatchObject({ dashArray: '3 3' });
    expect(estiloVia('humanizado')).toMatchObject({ color: '#d8cdb8' });
    expect(estiloVia().weight).toBeLessThan(estiloVia('humanizado').weight);
  });
});

describe('metrosPorPixel', () => {
  it('diminui pela metade a cada nível de zoom a mais, na mesma latitude', () => {
    const lat = -25.43;
    const m18 = metrosPorPixel(lat, 18);
    const m19 = metrosPorPixel(lat, 19);
    expect(m19).toBeCloseTo(m18 / 2, 5);
  });

  it('retorna um valor positivo e plausível para zoom 19 perto do equador', () => {
    expect(metrosPorPixel(0, 19)).toBeGreaterThan(0.1);
    expect(metrosPorPixel(0, 19)).toBeLessThan(1);
  });
});

describe('poligonosPodemSobrepor', () => {
  it('detecta caixas envolventes que se cruzam', () => {
    const a: [number, number][] = [[-25.430, -49.270], [-25.430, -49.269], [-25.429, -49.269], [-25.429, -49.270]];
    const b: [number, number][] = [[-25.4295, -49.2695], [-25.4295, -49.2685], [-25.4285, -49.2685], [-25.4285, -49.2695]];
    expect(poligonosPodemSobrepor(a, b)).toBe(true);
  });

  it('não acusa sobreposição para polígonos distantes', () => {
    const a: [number, number][] = [[-25.430, -49.270], [-25.430, -49.269], [-25.429, -49.269], [-25.429, -49.270]];
    const b: [number, number][] = [[-25.500, -49.300], [-25.500, -49.299], [-25.499, -49.299], [-25.499, -49.300]];
    expect(poligonosPodemSobrepor(a, b)).toBe(false);
  });
});

describe('Medição Métrica e Recuo Sanitário', () => {
  it('calcula distância euclidiana/esférica em metros com fórmula de Haversine', () => {
    const p1: [number, number] = [-25.4284, -49.2733];
    const p2: [number, number] = [-25.4284, -49.2733];
    expect(calcularDistanciaMetros(p1, p2)).toBe(0);

    // Dois pontos separados por aprox ~111 metros em latitude (0.001 grau)
    const p3: [number, number] = [-25.4294, -49.2733];
    const dist = calcularDistanciaMetros(p1, p3);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('calcula área de polígono fechado em m²', () => {
    const triangulo: [number, number][] = [
      [-25.4280, -49.2730],
      [-25.4280, -49.2720],
      [-25.4290, -49.2720],
    ];
    const area = calcularAreaPoligonoM2(triangulo);
    expect(area).toBeGreaterThan(1000);
  });

  it('valida recuo sanitário mínimo de 0,60 m', () => {
    expect(recuoMinimoValido(0.65)).toBe(true);
    expect(recuoMinimoValido(0.60)).toBe(true);
    expect(recuoMinimoValido(0.55)).toBe(false);
    expect(recuoMinimoValido(0.20)).toBe(false);
  });
});

