import { describe, expect, it } from 'vitest';
import { formatarCentavos, formatarData, paraCentavos } from './formatacao';

describe('formatacao', () => {
  it('formata e interpreta reais sem float', () => {
    expect(formatarCentavos(15050)).toBe('R$ 150,50');
    expect(paraCentavos('150,50')).toBe(15050);
    expect(paraCentavos('1.234,56')).toBe(123456);
    expect(paraCentavos('1,234')).toBeNull();
    expect(formatarData('2026-07-10')).toBe('10/07/2026');
  });

  it('ponto seguido de 3 dígitos só é milhar em número válido; nunca multiplica decimais', () => {
    expect(paraCentavos('0.555')).toBeNull();
    expect(paraCentavos('00.500')).toBeNull();
    expect(paraCentavos('1.234')).toBe(123400);
    expect(paraCentavos('12.345.678,90')).toBe(1234567890);
    expect(paraCentavos('1234.5')).toBe(123450);
    expect(paraCentavos('150')).toBe(15000);
    expect(paraCentavos('1,2,3')).toBeNull();
  });
});
