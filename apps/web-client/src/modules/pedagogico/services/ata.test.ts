import { describe, expect, it } from 'vitest';
import type { MembroEquipe } from '../../escola/api';
import type { Professor } from '../types/pedagogico';
import { dataPorExtenso, equipeDaAta, introducaoAta } from './ata';

const professor = (id: number, nome: string, turmas: string[]): Professor => ({
  id, tenant_id: '', nome, email: `${id}@escola.gov.br`, especialidade: '', turno: '', turmas_atribuidas: turmas, materias: [],
});
const membro = (id: number, nome: string, cargo: MembroEquipe['cargo']): MembroEquipe => ({ id, nome, cargo, ordem: 0 });

describe('dataPorExtenso', () => {
  it('escreve dia, mês e ano por extenso', () => {
    expect(dataPorExtenso(new Date(2026, 8, 29))).toBe('Aos vinte e nove dias do mês de setembro de dois mil e vinte e seis');
    expect(dataPorExtenso(new Date(2027, 0, 1))).toBe('Ao primeiro dia do mês de janeiro de dois mil e vinte e sete');
  });
});

describe('equipeDaAta', () => {
  it('usa a equipe cadastrada e os professores vinculados à turma', () => {
    const equipe = equipeDaAta(
      [membro(1, 'Maria Diretora', 'diretor'), membro(2, 'Paulo Auxiliar', 'diretor_auxiliar'), membro(3, 'João Secretário', 'secretaria'),
        membro(4, 'Ana Pedagoga', 'pedagoga'), membro(5, 'Bia Pedagoga', 'pedagoga')],
      [professor(9, 'Carlos Professor', ['6º A']), professor(10, 'Outro', ['7º B'])],
      '6º A',
    );
    expect(equipe).toEqual({
      diretor: 'Maria Diretora', auxiliares: ['Paulo Auxiliar'], secretaria: ['João Secretário'],
      pedagogas: ['Ana Pedagoga', 'Bia Pedagoga'], docentes: ['Carlos Professor'],
    });
  });
});

describe('introducaoAta', () => {
  it('cita diretor, auxiliares e a pedagoga escolhida; omite o que não há', () => {
    const texto = introducaoAta({
      data: new Date(2026, 8, 29), escola: 'Colégio Estadual X', turma: '6º A', turno: 'Manhã', periodo: '3º Trimestre', ano: 2026,
      diretor: 'Maria Diretora', auxiliares: ['Paulo Auxiliar', 'Rita Auxiliar'], pedagoga: 'Ana Pedagoga', docentes: ['Carlos Professor'],
    });
    expect(texto.startsWith('Aos vinte e nove dias do mês de setembro de dois mil e vinte e seis, reuniram-se nas dependências do Colégio Estadual X a Direção representada por Maria Diretora e pelos diretores auxiliares Paulo Auxiliar e Rita Auxiliar, a equipe pedagógica do período da Manhã composta por Ana Pedagoga e o corpo docente da turma (Carlos Professor), para a realização do Conselho de Classe referente ao 3º Trimestre do ano letivo de 2026, do 6º A.')).toBe(true);

    const semEquipe = introducaoAta({
      data: new Date(2026, 8, 29), escola: '', turma: '6º A', periodo: '3º Trimestre', ano: 2026,
      diretor: '', auxiliares: [], pedagoga: '', docentes: [],
    });
    expect(semEquipe).toContain('reuniram-se nas dependências desta unidade escolar a Direção, a equipe pedagógica e o corpo docente desta instituição de ensino,');
  });
});
