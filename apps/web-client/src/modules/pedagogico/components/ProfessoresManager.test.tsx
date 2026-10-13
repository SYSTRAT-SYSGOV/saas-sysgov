import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfessoresManager } from './ProfessoresManager';
import type { Materia, TurmaPedagogica } from '../types/pedagogico';

const turma = (id: number, nome: string, turno_nome: TurmaPedagogica['turno_nome']): TurmaPedagogica => ({ id, tenant_id: '', nome, turno_nome, total_alunos: 0 });
const turmas = [turma(1, '6º A', 'Manhã'), turma(2, '7º B', 'Tarde'), turma(3, 'EJA 1', 'Noite')];
const materias = [{ id: 1, nome: 'Matemática' }] as unknown as Materia[];

/** O professor pode ter turmas de manhã, tarde e noite: o turno só filtra a lista e não desmarca nada. */
describe('Corpo Docente — turmas em vários turnos', () => {
  it('mantém as turmas marcadas ao trocar o turno e salva todas', () => {
    const salvar = vi.fn();
    render(<ProfessoresManager professores={[]} turmas={turmas} materias={materias} onSaveProfessor={salvar} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Professor/ }));
    fireEvent.change(screen.getByPlaceholderText('Ex: Prof. João Gabriel'), { target: { value: 'Prof. Ana' } });

    fireEvent.change(screen.getByPlaceholderText('joao@escola.gov.br'), { target: { value: 'ana@escola.gov.br' } });
    const filtro = screen.getByDisplayValue('Todos os turnos');
    fireEvent.change(filtro, { target: { value: 'Manhã' } });
    fireEvent.click(screen.getByRole('button', { name: /6º A/ }));
    fireEvent.change(filtro, { target: { value: 'Noite' } });
    fireEvent.click(screen.getByRole('button', { name: /EJA 1/ }));
    fireEvent.change(filtro, { target: { value: 'Tarde' } });
    fireEvent.click(screen.getByRole('button', { name: /7º B/ }));

    expect(screen.getByText(/3 turma\(s\) selecionada\(s\): Manhã 1 · Tarde 1 · Noite 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Salvar Professor/ }));
    expect(salvar).toHaveBeenCalledWith(expect.objectContaining({ turmas_atribuidas: ['6º A', 'EJA 1', '7º B'] }));
  });
});
