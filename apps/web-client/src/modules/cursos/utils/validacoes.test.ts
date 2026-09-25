import { describe, expect, it } from 'vitest';
import { formatarNota, formatarTamanho, descreverLiberacao } from './formatos';
import { liberacaoDe, liberacaoParaApi, paraNumero, validarAlternativas, validarLiberacao, validarNotaMinima, validarPdf } from './validacoes';

describe('validarLiberacao', () => {
  it('imediata não exige nada', () => {
    expect(validarLiberacao({ regra: 'imediata', dias: '', aulaId: '' })).toBeNull();
  });

  it('"no início da aula" exige a aula', () => {
    expect(validarLiberacao({ regra: 'inicio_aula', dias: '', aulaId: '' })).toMatch(/exige escolher a aula/);
    expect(validarLiberacao({ regra: 'inicio_aula', dias: '', aulaId: '4' })).toBeNull();
  });

  it('"dias após o início" exige um inteiro de 0 a 365', () => {
    for (const dias of ['', ' ', '-1', '366', '1,5', 'abc']) {
      expect(validarLiberacao({ regra: 'dias_apos_inicio', dias, aulaId: '' }), `dias="${dias}"`).toMatch(/0 a 365/);
    }
    for (const dias of ['0', '7', '365']) {
      expect(validarLiberacao({ regra: 'dias_apos_inicio', dias, aulaId: '' }), `dias="${dias}"`).toBeNull();
    }
  });
});

describe('liberacaoParaApi / liberacaoDe', () => {
  it('só envia os dias na regra de dias e a aula quando escolhida', () => {
    expect(liberacaoParaApi({ regra: 'imediata', dias: '9', aulaId: '' })).toEqual({ liberacao_regra: 'imediata', liberacao_dias: null, aula_id: null });
    expect(liberacaoParaApi({ regra: 'dias_apos_inicio', dias: '7', aulaId: '3' })).toEqual({ liberacao_regra: 'dias_apos_inicio', liberacao_dias: 7, aula_id: 3 });
  });

  it('carrega o estado de um item existente', () => {
    expect(liberacaoDe({ liberacao_regra: 'inicio_aula', liberacao_dias: null, aula_id: 5 })).toEqual({ regra: 'inicio_aula', dias: '', aulaId: '5' });
    expect(liberacaoDe(null)).toEqual({ regra: 'imediata', dias: '', aulaId: '' });
  });
});

describe('validarAlternativas', () => {
  const alt = (texto: string, correta = false) => ({ texto, correta });

  it('aceita de 2 a 6 alternativas com exatamente uma correta', () => {
    expect(validarAlternativas([alt('A', true), alt('B')])).toBeNull();
    expect(validarAlternativas([alt('A'), alt('B'), alt('C', true), alt('D'), alt('E'), alt('F')])).toBeNull();
  });

  it('recusa menos de 2 e mais de 6', () => {
    expect(validarAlternativas([alt('A', true)])).toMatch(/2 a 6/);
    expect(validarAlternativas(Array.from({ length: 7 }, (_, i) => alt(`Alt ${i}`, i === 0)))).toMatch(/2 a 6/);
  });

  it('recusa zero ou duas corretas', () => {
    expect(validarAlternativas([alt('A'), alt('B')])).toMatch(/exatamente uma/);
    expect(validarAlternativas([alt('A', true), alt('B', true)])).toMatch(/exatamente uma/);
  });

  it('recusa alternativa sem texto', () => {
    expect(validarAlternativas([alt('A', true), alt('   ')])).toMatch(/precisa de um texto/);
  });
});

describe('validarNotaMinima', () => {
  it('vazia é permitida e a escala é de 0 a 10', () => {
    expect(validarNotaMinima('')).toBeNull();
    for (const ok of ['0', '7', '7,5', '7.25', '10']) expect(validarNotaMinima(ok), ok).toBeNull();
    for (const ruim of ['11', '10,01', '-1', 'abc']) expect(validarNotaMinima(ruim), ruim).toMatch(/0 a 10/);
  });

  it('paraNumero aceita vírgula e ponto', () => {
    expect(paraNumero('7,5')).toBe(7.5);
    expect(paraNumero('')).toBeNull();
  });
});

describe('validarPdf', () => {
  const arquivo = (nome: string, tipo: string, tamanho = 10) => new File([new Uint8Array(tamanho)], nome, { type: tipo });

  it('aceita PDF até 20 MB e recusa o resto', () => {
    expect(validarPdf(arquivo('a.pdf', 'application/pdf'))).toBeNull();
    expect(validarPdf(arquivo('a.pdf', '', 5))).toBeNull();
    expect(validarPdf(arquivo('a.png', 'image/png'))).toMatch(/PDF/);
    expect(validarPdf(arquivo('grande.pdf', 'application/pdf', 20 * 1024 * 1024 + 1))).toMatch(/20 MB/);
  });
});

describe('formatos da Fase 2', () => {
  it('formata a nota com duas casas e vírgula', () => {
    expect(formatarNota(8.75)).toBe('8,75');
    expect(formatarNota('7.00')).toBe('7,00');
    expect(formatarNota(0)).toBe('0,00');
    expect(formatarNota(null)).toBe('—');
  });

  it('formata tamanho e descreve a liberação', () => {
    expect(formatarTamanho(512)).toBe('512 B');
    expect(formatarTamanho(2048)).toBe('2 KB');
    expect(formatarTamanho(3 * 1024 * 1024)).toBe('3 MB');
    expect(descreverLiberacao('dias_apos_inicio', 7)).toBe('7 dias após o início da turma');
    expect(descreverLiberacao('dias_apos_inicio', 0)).toBe('No dia do início da turma');
    expect(descreverLiberacao('inicio_aula', null)).toBe('No início da aula');
  });
});
