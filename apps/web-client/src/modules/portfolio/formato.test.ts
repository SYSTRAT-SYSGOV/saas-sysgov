import { describe, expect, it } from 'vitest';
import type { AlunoPortfolio, Desempenho } from './api';
import { dadosGraficos, filtrarAlunos, formatarAvaliacao, hojeLocal, lerAvaliacao, paramsPeriodo, rotuloPeriodo } from './formato';

const aluno = (id: number, nome: string): AlunoPortfolio => ({ id, nome, numero: id, situacao: 'ativo', total_trabalhos: 0, media: null });

describe('formato do Portfólio', () => {
  it('formata e lê a avaliação com uma casa', () => {
    expect(formatarAvaliacao(8.5)).toBe('8,5');
    expect(formatarAvaliacao(9)).toBe('9,0');
    expect(formatarAvaliacao(null)).toBe('—');
    expect(lerAvaliacao('8,5')).toBe(8.5);
    expect(lerAvaliacao('10')).toBe(10);
    expect(lerAvaliacao('7,25')).toBeNull();
    expect(lerAvaliacao('10,5')).toBeNull();
    expect(lerAvaliacao('abc')).toBeNull();
    expect(lerAvaliacao('')).toBeNull();
  });

  it('descreve e serializa o período', () => {
    expect(rotuloPeriodo({ ano: 2026, trimestre: null })).toBe('Ano letivo 2026');
    expect(rotuloPeriodo({ ano: 2026, trimestre: 2 })).toBe('2º trimestre de 2026');
    expect(paramsPeriodo({ ano: 2026, trimestre: null })).toEqual({ ano: 2026 });
    expect(paramsPeriodo({ ano: 2026, trimestre: 3 })).toEqual({ ano: 2026, trimestre: 3 });
  });

  it('filtra alunos sem acento e sem caixa', () => {
    const lista = [aluno(1, 'Álvaro Lima'), aluno(2, 'Bruna Souza')];
    expect(filtrarAlunos(lista, 'alva').map((a) => a.id)).toEqual([1]);
    expect(filtrarAlunos(lista, '  ')).toHaveLength(2);
  });

  it('monta os dados dos gráficos', () => {
    const d: Desempenho = {
      total: 3, media: 7.7,
      por_materia: [{ materia_id: 1, materia: 'História', quantidade: 2, media: 8 }, { materia_id: 2, materia: 'Matemática', quantidade: 1, media: 7 }],
      por_trimestre: [{ trimestre: 1, quantidade: 2, media: 7.5 }, { trimestre: 2, quantidade: 1, media: 8 }, { trimestre: 3, quantidade: 0, media: null }],
    };
    const g = dadosGraficos(d);
    expect(g.barras).toEqual([{ materia: 'História', media: 8 }, { materia: 'Matemática', media: 7 }]);
    expect(g.rosca).toEqual([{ materia: 'História', quantidade: 2 }, { materia: 'Matemática', quantidade: 1 }]);
    expect(g.linha).toEqual([{ trimestre: '1º tri', media: 7.5 }, { trimestre: '2º tri', media: 8 }, { trimestre: '3º tri', media: null }]);
    expect(dadosGraficos({ ...d, por_trimestre: null }).linha).toEqual([]);
  });

  it('usa a data local, não a UTC (no Brasil, depois das 21h o UTC já é o dia seguinte)', () => {
    expect(hojeLocal(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(hojeLocal(new Date(2026, 0, 5, 8, 0))).toBe('2026-01-05');
  });
});
