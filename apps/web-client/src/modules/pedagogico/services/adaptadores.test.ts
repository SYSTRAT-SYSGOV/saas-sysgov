import { describe, expect, it } from 'vitest';
import type { Nota } from '../api';
import { boletimPorMateria } from './adaptadores';

const nota = (materia_id: number, trimestre: 1 | 2 | 3, valor: string, rec: string | null = null): Nota => ({
  id: materia_id * 10 + trimestre, aluno_id: 1, materia_id, ano_letivo: 2026, trimestre, nota: valor, nota_recuperacao: rec,
});

describe('boletimPorMateria', () => {
  it('usa a maior entre nota e recuperação e trunca a média em uma casa', () => {
    const b = boletimPorMateria([nota(1, 1, '6.0'), nota(1, 2, '5.0', '7.0'), nota(1, 3, '4.9')]);
    expect(b.get(1)).toEqual({ trimestres: [6, 7, 4.9], media: 5.9 }); // 17.9 / 3 = 5.966… → 5.9
  });

  it('média só dos trimestres lançados e matéria sem nota fica de fora', () => {
    const b = boletimPorMateria([nota(2, 1, '8.0'), nota(2, 2, '7.0')]);
    expect(b.get(2)).toEqual({ trimestres: [8, 7, null], media: 7.5 });
    expect(b.get(3)).toBeUndefined();
  });
});
