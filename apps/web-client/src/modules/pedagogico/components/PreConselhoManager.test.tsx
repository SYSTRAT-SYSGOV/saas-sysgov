import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PreConselhoManager } from './PreConselhoManager';
import type { PreConselho, TurmaPedagogica } from '../types/pedagogico';

const turma = { id: 1, tenant_id: 't', nome: '5º A', turno_nome: 'Manhã', total_alunos: 2 } as TurmaPedagogica;
const ficha = {
  id: 10, turma_id: 1, turma_nome: '5º A', materia_id: 3, materia_nome: 'Matemática', ano_letivo: '2026', periodo: '3º Trimestre',
  data_registro: '2026-10-13', desempenho_geral: 'Bom', alunos_avaliados: [],
} as unknown as PreConselho;

function abrirFichas() {
  render(<PreConselhoManager preConselhos={[ficha]} turmas={[turma]} materias={[]} alunos={[]} onSave={vi.fn()} onToast={vi.fn()} />);
  fireEvent.click(screen.getByText('Manhã'));
  fireEvent.click(screen.getByText('5º A'));
  fireEvent.click(screen.getByText('Ficha Geral da Turma'));
}

describe('Fichas do Pré-Conselho (DataTable padrão)', () => {
  it('lista a ficha com data, matéria e desempenho, e a grade exporta', () => {
    abrirFichas();
    expect(screen.getByText('2026-10-13')).toBeInTheDocument();
    expect(screen.getByText('3º Trimestre — Matemática')).toBeInTheDocument();
    expect(screen.getByText('Bom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('não mostra mais o responsável inventado (o modelo da ficha não tem esse dado)', () => {
    abrirFichas();
    expect(screen.queryByText(/Carlos Silva/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Equipe Pedagógica/)).not.toBeInTheDocument();
  });

  it('"Editar ficha" abre o formulário da ficha', () => {
    abrirFichas();
    fireEvent.click(screen.getByRole('button', { name: 'Editar ficha' }));
    expect(screen.getByText('Editar Ficha de Pré-Conselho')).toBeInTheDocument();
  });
});
