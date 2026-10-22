import { describe, expect, it } from 'vitest';
import type { ElementoLeiaute } from '@sysgov/sdk';
import { alternarAssinatura, alternarCampo, comFixos, elementoFixo, leiauteInicial, temAssinatura, temCampo } from './leiauteCurso';

describe('regras do construtor por curso', () => {
  it('começa com texto principal, QR code e código de autenticidade', () => {
    const inicial = leiauteInicial('paisagem');
    expect(temCampo(inicial, 'corpo')).toBe(true);
    expect(inicial.filter((e) => e.tipo === 'qrcode')).toHaveLength(1);
    expect(inicial.some((e) => e.tipo === 'texto' && e.texto?.includes('{CODIGO_CERTIFICADO}'))).toBe(true);
    expect(inicial.every(elementoFixo)).toBe(true);
  });

  it('marca e desmarca elementos opcionais sem duplicar', () => {
    let lista = alternarCampo(leiauteInicial('paisagem'), 'participante', true, 'paisagem');
    lista = alternarCampo(lista, 'participante', true, 'paisagem');
    expect(lista.filter((e) => e.tipo === 'texto' && e.campo === 'participante')).toHaveLength(1);
    lista = alternarCampo(lista, 'participante', false, 'paisagem');
    expect(temCampo(lista, 'participante')).toBe(false);
  });

  it('assinaturas entram lado a lado dentro da página e saem com o selo', () => {
    let lista = leiauteInicial('retrato');
    for (const id of [1, 2, 3]) lista = alternarAssinatura(lista, id, true, 'retrato');
    const assinaturas = lista.filter((e) => e.tipo === 'assinatura');
    expect(new Set(assinaturas.map((e) => e.x)).size).toBe(3);
    assinaturas.forEach((e) => expect(e.x + e.largura).toBeLessThanOrEqual(595));

    lista = [...lista, { id: 'selo-2', tipo: 'selo', assinatura_id: 2, x: 10, y: 10, largura: 60 } as ElementoLeiaute];
    lista = alternarAssinatura(lista, 2, false, 'retrato');
    expect(temAssinatura(lista, 2)).toBe(false);
    expect(lista.some((e) => e.tipo === 'selo')).toBe(false);
  });

  it('completa os fixos que faltarem num leiaute carregado', () => {
    const lista = comFixos([], 'paisagem');
    expect(temCampo(lista, 'corpo')).toBe(true);
    expect(lista.some((e) => e.tipo === 'qrcode')).toBe(true);
  });
});
