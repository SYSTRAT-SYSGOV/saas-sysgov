import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@/core/api/client';
import { PreferenciasCardsHome } from './PreferenciasCardsHome';
import type { CartaoEscolha } from './tipos';

const catalogo: CartaoEscolha[] = [
  { module: 'escola', group: 'educacao', group_label: 'Educação', label: 'Alunos', tone: 'amber', hidden: false },
  { module: 'cursos', group: 'educacao', group_label: 'Educação', label: 'Cursos', tone: 'violet', hidden: true },
  { module: 'ata', group: 'gestao', group_label: 'Gestão e documentos', label: 'Atas', tone: 'rose', hidden: false },
];

describe('PreferenciasCardsHome', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('lista só o que a API devolve, agrupado, com os ocultos desligados', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: catalogo } });
    render(<PreferenciasCardsHome />);

    expect(await screen.findByText('Educação')).toBeInTheDocument();
    expect(screen.getByText('Gestão e documentos')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Mostrar o card Alunos' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Mostrar o card Cursos' })).not.toBeChecked();
    expect(screen.queryByText('Licitações')).not.toBeInTheDocument();
  });

  it('ao desligar um card, grava a lista completa de ocultos', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: catalogo } });
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { data: [] } });
    render(<PreferenciasCardsHome />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Mostrar o card Atas' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith('/client/dashboard-preferences', { hidden: ['cursos', 'ata'] }));
    expect(screen.getByRole('switch', { name: 'Mostrar o card Atas' })).not.toBeChecked();
  });

  it('se não conseguir salvar, volta o interruptor e avisa', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: catalogo } });
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('falha'));
    render(<PreferenciasCardsHome />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Mostrar o card Alunos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    expect(screen.getByRole('switch', { name: 'Mostrar o card Alunos' })).toBeChecked();
  });

  it('sem nenhum módulo com card, explica em vez de mostrar uma lista vazia', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [] } });
    render(<PreferenciasCardsHome />);
    expect(await screen.findByText(/Nenhum módulo com card disponível/)).toBeInTheDocument();
  });
});
