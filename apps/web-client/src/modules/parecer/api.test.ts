import { describe, expect, it } from 'vitest';
import { dataBr, formatarNota, lerNota, linkWhats } from './api';

describe('Parecer — utilitários portados do PHP', () => {
  it('monta o link do WhatsApp com 55 quando vem só DDD + número', () => {
    expect(linkWhats('(41) 99999-1234')).toBe('https://wa.me/5541999991234');
    expect(linkWhats('5541999991234', 'Olá!')).toBe('https://wa.me/5541999991234?text=Ol%C3%A1!');
    expect(linkWhats('')).toBeNull();
    expect(linkWhats(null)).toBeNull();
  });

  it('lê notas de 0 a 10 com vírgula; vazio apaga; fora da faixa é inválido', () => {
    expect(lerNota('7,5')).toBe(7.5);
    expect(lerNota(' 10 ')).toBe(10);
    expect(lerNota('')).toBeNull();
    expect(lerNota('11')).toBeUndefined();
    expect(lerNota('abc')).toBeUndefined();
  });

  it('formata nota e data no padrão brasileiro', () => {
    expect(formatarNota(7.5)).toBe('7,5');
    expect(formatarNota(8)).toBe('8');
    expect(formatarNota(null)).toBe('');
    expect(dataBr('2026-03-05')).toBe('05/03/2026');
  });
});
