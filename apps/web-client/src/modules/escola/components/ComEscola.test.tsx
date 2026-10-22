import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const minhasEscolas = vi.fn();
vi.mock('../api', () => ({
  escolaApi: { minhasEscolas: (...args: unknown[]) => minhasEscolas(...args) },
}));

let escolaAtiva: number | null = 1;
vi.mock('@/core/escola/escolaAtiva', () => ({
  definirEscolaAtiva: vi.fn((id: number) => {
    escolaAtiva = id;
  }),
  obterEscolaAtiva: () => escolaAtiva,
}));

import { ComEscola, SeletorEscola } from './ComEscola';

const escola = (id: number, nome: string, ativa = true) => ({ id, nome, inep: null, ativa });

const modulo = () => (
  <ComEscola modulo="formatura">
    <header>
      <h1>Título do módulo</h1>
    </header>
    <SeletorEscola />
    <main>Conteúdo</main>
  </ComEscola>
);

describe('ComEscola — seletor de escola abaixo do título do módulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    escolaAtiva = 1;
  });

  it('com várias escolas, o seletor vem depois do título do módulo e antes do conteúdo', async () => {
    minhasEscolas.mockResolvedValue([escola(1, 'Escola A'), escola(2, 'Escola B')]);
    render(modulo());

    const titulo = await screen.findByText('Título do módulo');
    const seletor = screen.getByText('Escola de trabalho');
    const conteudo = screen.getByText('Conteúdo');

    expect(titulo.compareDocumentPosition(seletor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(seletor.compareDocumentPosition(conteudo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('o aviso de escola inativa também fica abaixo do título', async () => {
    minhasEscolas.mockResolvedValue([escola(1, 'Escola A', false)]);
    render(modulo());

    const titulo = await screen.findByText('Título do módulo');
    const aviso = screen.getByText(/Esta escola está inativa/);

    expect(titulo.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('com uma escola só, não mostra o seletor', async () => {
    minhasEscolas.mockResolvedValue([escola(1, 'Escola A')]);
    render(modulo());

    expect(await screen.findByText('Título do módulo')).toBeTruthy();
    expect(screen.queryByText('Escola de trabalho')).toBeNull();
  });

  it('o ComEscola não desenha nada antes do módulo (o título é o primeiro elemento)', async () => {
    minhasEscolas.mockResolvedValue([escola(1, 'Escola A'), escola(2, 'Escola B')]);
    const { container } = render(modulo());

    await screen.findByText('Título do módulo');
    expect(container.firstElementChild?.tagName).toBe('HEADER');
  });
});
