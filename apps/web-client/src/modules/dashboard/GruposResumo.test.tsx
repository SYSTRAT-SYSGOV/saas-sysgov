import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GruposResumo, GRUPOS_RECOLHIDOS_KEY } from './GruposResumo';
import type { GrupoResumo } from './tipos';

const grupos: GrupoResumo[] = [
  { key: 'educacao', label: 'Educação', cards: [
    { module: 'escola', label: 'Alunos', value: 1200, caption: 'matriculados', tone: 'amber' },
    { module: 'cursos', label: 'Cursos', value: 3, caption: 'cadastrados', tone: 'violet' },
  ] },
  { key: 'gestao', label: 'Gestão e documentos', cards: [
    { module: 'ata', label: 'Atas', value: 7, caption: 'registradas', tone: 'rose' },
  ] },
];

describe('GruposResumo', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('começa com todos os grupos abertos, com o título e a quantidade de cards', () => {
    render(<GruposResumo grupos={grupos} />);

    expect(screen.getByRole('button', { name: /Educação/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getByText('1.200')).toBeInTheDocument();
    expect(screen.getByText('Atas')).toBeInTheDocument();
  });

  it('recolhe só o grupo clicado e lembra a escolha', () => {
    const { unmount } = render(<GruposResumo grupos={grupos} />);
    fireEvent.click(screen.getByRole('button', { name: /Educação/ }));

    expect(screen.getByRole('button', { name: /Educação/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
    expect(screen.getByText('Atas')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(GRUPOS_RECOLHIDOS_KEY) ?? '[]')).toEqual(['educacao']);

    unmount();
    render(<GruposResumo grupos={grupos} />);
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Educação/ }));
    expect(screen.getByText('Alunos')).toBeInTheDocument();
  });

  it('ignora um valor inválido guardado no navegador', () => {
    localStorage.setItem(GRUPOS_RECOLHIDOS_KEY, '{quebrado');
    render(<GruposResumo grupos={grupos} />);
    expect(screen.getByText('Alunos')).toBeInTheDocument();
  });
});
