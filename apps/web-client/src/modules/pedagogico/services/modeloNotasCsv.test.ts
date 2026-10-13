import { describe, expect, it } from 'vitest';
import type { AlunoPedagogico, Materia, TurmaPedagogica } from '../types/pedagogico';
import { modeloNotasCsv } from './modeloNotasCsv';

const turma: TurmaPedagogica = {
  id: 1, tenant_id: '', nome: '6º A', turno_nome: 'Manhã', total_alunos: 3,
  materias: [{ materia_id: 10, professor_id: null }, { materia_id: 11, professor_id: null }],
};
const materias: Materia[] = [
  { id: 10, tenant_id: '', nome: 'Matemática' },
  { id: 11, tenant_id: '', nome: 'Língua Portuguesa' },
  { id: 12, tenant_id: '', nome: 'Inglês' },
];
const aluno = (id: number, numero: number | undefined, turmaId = 1): AlunoPedagogico =>
  ({ id, tenant_id: '', nome: `Aluno ${id}`, numero, turma_id: turmaId, turma_nome: '' }) as AlunoPedagogico;

describe('modeloNotasCsv', () => {
  it('uma linha por aluno numerado e matéria vinculada à turma, nota em branco', () => {
    const csv = modeloNotasCsv(turma, materias, [aluno(1, 2), aluno(2, 1), aluno(3, undefined), aluno(4, 1, 99)], 2);
    expect(csv.split('\r\n')).toEqual([
      'TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA',
      '6º A;1;Matemática;2;',
      '6º A;2;Matemática;2;',
      '6º A;1;Língua Portuguesa;2;',
      '6º A;2;Língua Portuguesa;2;',
      '',
    ]);
  });

  it('restringe a uma matéria e não inclui matéria fora da turma', () => {
    expect(modeloNotasCsv(turma, materias, [aluno(1, 1)], 1, 11)).toBe('TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA\r\n6º A;1;Língua Portuguesa;1;\r\n');
    expect(modeloNotasCsv(turma, materias, [aluno(1, 1)], 1, 12)).toBe('TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA\r\n');
  });
});
