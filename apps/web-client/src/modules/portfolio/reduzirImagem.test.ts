import { describe, expect, it } from 'vitest';
import { dimensoesReduzidas, validarArquivo } from './reduzirImagem';

const arquivo = (tipo: string, bytes: number) => new File([new Uint8Array(bytes)], 'foto', { type: tipo });

describe('reduzirImagem', () => {
  it('calcula dimensões com o lado maior em 1600 px sem ampliar', () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ largura: 1600, altura: 1200 });
    expect(dimensoesReduzidas(3000, 4000)).toEqual({ largura: 1200, altura: 1600 });
    expect(dimensoesReduzidas(800, 600)).toEqual({ largura: 800, altura: 600 });
  });

  it('valida tipo e tamanho do arquivo escolhido', () => {
    expect(validarArquivo(arquivo('image/webp', 1000))).toBeNull();
    expect(validarArquivo(arquivo('application/pdf', 1000))).toBe('Escolha uma foto JPG, PNG ou WebP.');
    expect(validarArquivo(arquivo('image/jpeg', 6 * 1024 * 1024))).toBe('A foto deve ter no máximo 5 MB.');
  });
});
